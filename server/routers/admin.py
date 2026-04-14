from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from core.config import get_settings
from core.db import get_session
from core.exceptions import BadRequest, Forbidden, NotFound
from core.security import create_access_token, hash_password
from daos.admin_action_dao import AdminActionDao
from dependencies.auth import get_current_user, require_role
from models.adjustment import ContractAdjustment
from models.blacklist import BlacklistEntry
from models.debt import DebtContract
from models.debt_event import DebtEvent
from models.invitation import Invitation
from models.notification import Notification
from models.payment import PaymentDeclaration
from models.payment_method import PaymentMethod
from models.rolling import RollingTribute
from models.user import Goddess, User, UserRole
from schemas.admin import (
    AdminListOut,
    AdminRowBlacklistEntry,
    AdminRowContractAdjustment,
    AdminRowDebtContract,
    AdminRowDebtEvent,
    AdminRowGoddess,
    AdminRowInvitation,
    AdminRowNotification,
    AdminRowPaymentDeclaration,
    AdminRowPaymentMethod,
    AdminRowRollingTribute,
    AdminRowUser,
)
from schemas.auth import ImpersonationAccess

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — admin role required"}
_E404 = {"description": "Not found"}
_E400 = {"description": "Bad request — invalid field in payload"}
_E500 = {"description": "Internal server error"}

# Fields blocked for User CRUD — role changes and auth fields are not mutable here.
# Password changes are handled via the password→hash_password shim; role is hard-blocked.
_USER_FORBIDDEN: frozenset[str] = frozenset(
    {"id", "password_hash", "role", "goddess_id", "created_at"}
)
_GODDESS_FORBIDDEN: frozenset[str] = frozenset({"id", "password_hash", "created_at"})
_DEFAULT_FORBIDDEN: frozenset[str] = frozenset({"id", "created_at"})


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(UserRole.admin))],
)


@router.post(
    "/impersonate/{user_id}",
    summary="Impersonate a user as admin",
    description=(
        "Issues a short-lived access token authenticating as the target user, carrying an "
        "`imp` claim referencing the admin. No refresh token is returned — when the token "
        "expires or the caller triggers `/auth/refresh`, the original admin session resumes."
    ),
    response_model=ImpersonationAccess,
    status_code=200,
    responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
)
async def impersonate(
    user_id: UUID,
    admin: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ImpersonationAccess:
    if admin.id == user_id:
        raise BadRequest("cannot impersonate yourself")
    target = await session.get(User, user_id)
    if target is None:
        raise NotFound("user not found")
    if target.role == UserRole.admin:
        raise Forbidden("cannot impersonate another admin")
    settings = get_settings()
    minutes = settings.impersonation_ttl_minutes
    token = create_access_token(
        str(target.id),
        target.role,
        extra={"imp": str(admin.id)},
        ttl_minutes=minutes,
    )
    audit = AdminActionDao(session)
    await audit.record(
        admin_id=admin.id,
        action="impersonate",
        acting_as_user_id=target.id,
        entity="user",
        entity_id=target.id,
    )
    await session.commit()
    return ImpersonationAccess(access_token=token, expires_in=minutes * 60)


def _jsonable(row: SQLModel) -> dict[str, Any]:
    data = row.model_dump()
    out: dict[str, Any] = {}
    for k, v in data.items():
        if isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _safe_payload(body: dict[str, Any]) -> dict[str, Any]:
    """Strip sensitive fields and coerce non-JSON-safe types for audit storage."""
    redacted = {"password", "password_hash"}
    out: dict[str, Any] = {}
    for k, v in body.items():
        if k in redacted:
            continue
        if isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _coerce_value(model: type[SQLModel], key: str, value: Any) -> Any:
    field = model.model_fields.get(key)
    if field is None:
        return value
    annotation = field.annotation
    if value is None:
        return None
    if annotation is None:
        return value
    # String UUID → UUID
    if isinstance(value, str):
        try:
            if annotation is UUID or UUID.__name__ in str(annotation):
                return UUID(value)
        except (ValueError, AttributeError):
            pass
    return value


def _apply_patch(model: type[SQLModel], row: SQLModel, patch: dict[str, Any]) -> None:
    allowed = set(model.model_fields.keys())
    for key, value in patch.items():
        if key not in allowed:
            continue
        setattr(row, key, _coerce_value(model, key, value))
    if "updated_at" in allowed:
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)


def _handle_user_password(patch: dict[str, Any]) -> dict[str, Any]:
    copy = dict(patch)
    raw = copy.pop("password", None)
    if isinstance(raw, str) and raw:
        copy["password_hash"] = hash_password(raw)
    return copy


def _check_forbidden(body: dict[str, Any], forbidden: frozenset[str]) -> None:
    for field in forbidden:
        if field in body:
            raise BadRequest(f"field '{field}' is not admin-mutable")


def _register_crud(
    model: type[SQLModel],
    entity_name: str,
    searchable_fields: list[str],
    row_schema: type[BaseModel],
    forbidden_fields: frozenset[str] = _DEFAULT_FORBIDDEN,
) -> None:
    list_path = f"/{entity_name}"
    item_path = f"/{entity_name}/{{item_id}}"
    list_schema = AdminListOut[row_schema]  # type: ignore[valid-type]

    @router.get(
        list_path,
        summary=f"List {entity_name} rows",
        description=(
            f"Admin generic listing for `{entity_name}`. Supports free-text search across "
            f"{searchable_fields} and pagination."
        ),
        response_model=list_schema,
        status_code=200,
        name=f"{entity_name}_list",
        responses={401: _E401, 403: _E403, 500: _E500},
    )
    async def list_items(
        q: str | None = Query(default=None, description="Case-insensitive substring filter"),
        page: int = Query(default=1, ge=1, description="1-based page number"),
        page_size: int = Query(default=50, ge=1, le=200, description="Rows per page (max 200)"),
        session: AsyncSession = Depends(get_session),
    ) -> AdminListOut[BaseModel]:
        stmt = select(model)
        count_stmt = select(func.count()).select_from(model)
        if q and searchable_fields:
            like = f"%{q}%"
            clauses = [
                getattr(model, field_name).ilike(like)
                for field_name in searchable_fields
                if hasattr(model, field_name)
            ]
            if clauses:
                where = or_(*clauses)
                stmt = stmt.where(where)
                count_stmt = count_stmt.where(where)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await session.execute(stmt)
        rows = list(result.scalars().all())
        total_result = await session.execute(count_stmt)
        total = int(total_result.scalar_one())
        return AdminListOut(
            items=[row_schema.model_validate(_jsonable(r)) for r in rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    @router.get(
        item_path,
        summary=f"Get a {entity_name} row by id",
        description=f"Admin generic fetch for a single `{entity_name}` row.",
        response_model=row_schema,
        status_code=200,
        name=f"{entity_name}_get",
        responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
    )
    async def get_item(
        item_id: UUID,
        session: AsyncSession = Depends(get_session),
    ) -> BaseModel:
        row = await session.get(model, item_id)
        if row is None:
            raise NotFound(f"{entity_name} not found")
        return row_schema.model_validate(_jsonable(row))

    @router.patch(
        item_path,
        summary=f"Update a {entity_name} row",
        description=(
            f"Admin generic partial update for `{entity_name}`. "
            "Unknown keys are ignored. `updated_at` is set when the field exists. "
            "Certain immutable fields (e.g. `id`, `created_at`) are rejected with 400."
        ),
        response_model=row_schema,
        status_code=200,
        name=f"{entity_name}_update",
        responses={401: _E401, 403: _E403, 404: _E404, 400: _E400, 500: _E500},
    )
    async def update_item(
        item_id: UUID,
        patch: dict[str, Any] = Body(...),
        admin: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
    ) -> BaseModel:
        _check_forbidden(patch, forbidden_fields)
        row = await session.get(model, item_id)
        if row is None:
            raise NotFound(f"{entity_name} not found")
        effective = _handle_user_password(patch) if model is User else patch
        _apply_patch(model, row, effective)
        session.add(row)
        audit = AdminActionDao(session)
        await audit.record(
            admin_id=admin.id,
            action="admin_update",
            entity=entity_name,
            entity_id=item_id,
            payload=_safe_payload(patch),
        )
        await session.commit()
        await session.refresh(row)
        return row_schema.model_validate(_jsonable(row))

    @router.post(
        list_path,
        summary=f"Create a {entity_name} row",
        description=(
            f"Admin generic create for `{entity_name}`. Pydantic validates required fields. "
            "Certain immutable fields (e.g. `id`, `created_at`) are rejected with 400."
        ),
        response_model=row_schema,
        status_code=201,
        name=f"{entity_name}_create",
        responses={401: _E401, 403: _E403, 400: _E400, 500: _E500},
    )
    async def create_item(
        body: dict[str, Any] = Body(...),
        admin: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
    ) -> BaseModel:
        _check_forbidden(body, forbidden_fields)
        effective = _handle_user_password(body) if model is User else body
        known = {k: v for k, v in effective.items() if k in model.model_fields}
        try:
            row = model(**known)
        except Exception as exc:
            raise BadRequest(f"Invalid payload for {entity_name}: {exc}") from exc
        session.add(row)
        await session.flush()
        # row.id is a UUID on all registered models — getattr is the only way to access it
        # through the SQLModel base type without pyright complaining.
        row_id: UUID | None = getattr(row, "id", None)
        audit = AdminActionDao(session)
        await audit.record(
            admin_id=admin.id,
            action="admin_create",
            entity=entity_name,
            entity_id=row_id,
            payload=_safe_payload(body),
        )
        await session.commit()
        await session.refresh(row)
        return row_schema.model_validate(_jsonable(row))

    @router.delete(
        item_path,
        summary=f"Delete a {entity_name} row",
        description=f"Admin generic hard-delete for `{entity_name}`.",
        status_code=204,
        name=f"{entity_name}_delete",
        responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
    )
    async def delete_item(
        item_id: UUID,
        admin: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
    ) -> Response:
        row = await session.get(model, item_id)
        if row is None:
            raise NotFound(f"{entity_name} not found")
        audit = AdminActionDao(session)
        await audit.record(
            admin_id=admin.id,
            action="admin_delete",
            entity=entity_name,
            entity_id=item_id,
        )
        await session.delete(row)
        await session.commit()
        return Response(status_code=204)


_register_crud(
    User, "users", ["username", "email", "first_name", "last_name"], AdminRowUser, _USER_FORBIDDEN
)
_register_crud(Goddess, "goddesses", ["display_name", "email"], AdminRowGoddess, _GODDESS_FORBIDDEN)
_register_crud(Invitation, "invitations", ["token", "note"], AdminRowInvitation)
_register_crud(
    PaymentMethod, "payment_methods", ["name", "handle_or_link", "note"], AdminRowPaymentMethod
)
_register_crud(
    PaymentDeclaration,
    "payment_declarations",
    ["note", "rejection_reason"],
    AdminRowPaymentDeclaration,
)
_register_crud(RollingTribute, "rolling_tributes", ["notes"], AdminRowRollingTribute)
_register_crud(DebtContract, "debt_contracts", [], AdminRowDebtContract)
_register_crud(BlacklistEntry, "blacklist_entries", ["reason"], AdminRowBlacklistEntry)
_register_crud(Notification, "notifications", ["title", "body"], AdminRowNotification)
_register_crud(DebtEvent, "debt_events", ["note"], AdminRowDebtEvent)
_register_crud(ContractAdjustment, "contract_adjustments", ["reason"], AdminRowContractAdjustment)
