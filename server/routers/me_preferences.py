from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.profile_controller import ProfileController
from core.db import get_session
from daos.gender_taxonomy_dao import GenderTaxonomyDao
from daos.sub_profile_dao import SubProfileDao
from daos.user_dao import UserDao
from dependencies.auth import get_current_user
from models.user import User, UserRole
from schemas.auth import ProfileUpdate, UserOut
from schemas.reference import GenderTaxonomyOut

router = APIRouter(prefix="/me", tags=["me"])

_E400 = {"description": "Bad request — validation failed (e.g. bio too long, invalid avatar key)"}


def _display_name(user: User) -> str:
    parts = [p for p in [user.first_name, user.last_name] if p]
    return " ".join(parts) if parts else user.username


def _build_user_out(user: User, gender_taxonomy: GenderTaxonomyOut | None = None) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        display_name=_display_name(user),
        first_name=user.first_name,
        last_name=user.last_name,
        bio=user.bio,
        avatar_key=user.avatar_key,
        payment_handle=user.payment_handle,
        theme_preference=user.theme_preference,
        gender=user.gender,
        pronouns=user.pronouns,
        location=user.location,
        timezone=user.timezone,
        date_of_birth=user.date_of_birth,
        real_name=user.real_name,
        created_at=user.created_at,
        impersonator_id=None,
        impersonator_display_name=None,
        entry_tribute_amount=None,
        gender_taxonomy=gender_taxonomy,
    )


_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}
_E500 = {"description": "Internal server error"}


ThemePreference = Literal["system", "dark", "light"]


class UpdatePreferencesIn(BaseModel):
    theme_preference: ThemePreference = Field(
        ...,
        description="UI theme preference: 'system' follows OS, 'dark' / 'light' force mode.",
        examples=["system"],
    )


class PreferencesOut(BaseModel):
    theme_preference: ThemePreference = Field(
        ...,
        description="Persisted UI theme preference for the authenticated user.",
        examples=["dark"],
    )


@router.patch(
    "/preferences",
    summary="Update the authenticated user's UI preferences",
    description=(
        "Persists the user's UI theme preference. Accepts 'system', 'dark', or 'light'. "
        "Returns the stored value so the client can reconcile state."
    ),
    response_model=PreferencesOut,
    status_code=200,
    responses={401: _E401, 422: _E422, 500: _E500},
)
async def update_preferences(
    body: UpdatePreferencesIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> PreferencesOut:
    dao = UserDao(session)
    updated = await dao.update_theme_preference(user, body.theme_preference)
    await session.commit()
    return PreferencesOut(theme_preference=_coerce_theme(updated.theme_preference))


@router.patch(
    "/profile",
    summary="Update the authenticated user's profile",
    description=(
        "Updates identity and profile fields for the authenticated user. "
        "All fields are optional. "
        "bio is capped at 500 characters; avatar_key must be one of the defined enum values. "
        "gender, pronouns, location, timezone, date_of_birth are written directly. "
        "real_name: written directly if currently null. If already set and the new value differs, "
        "a ProfileChangeRequest is created and the response is 202 with the change_request_id. "
        "Otherwise returns 200 with the updated UserOut."
    ),
    response_model=UserOut,
    status_code=200,
    tags=["me"],
    responses={
        200: {"description": "Profile updated successfully"},
        202: {"description": "real_name change routed through ProfileChangeRequest"},
        400: _E400,
        401: _E401,
        422: _E422,
        500: _E500,
    },
)
async def update_profile(
    body: ProfileUpdate,
    response: Response,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> UserOut | dict[str, UUID]:
    ctrl = ProfileController(session)
    updated, change_req = await ctrl.update_identity(user, body)
    await session.commit()
    if change_req is not None:
        response.status_code = 202
        return {"change_request_id": change_req.id}
    gender_taxonomy = await _resolve_gender_taxonomy(updated, session)
    return _build_user_out(updated, gender_taxonomy)


async def _resolve_gender_taxonomy(user: User, session: AsyncSession) -> GenderTaxonomyOut | None:
    if user.role != UserRole.sub:
        return None
    profile_dao = SubProfileDao(session)
    gender_dao = GenderTaxonomyDao(session)
    profile = await profile_dao.get_by_user_id(user.id)
    if profile.gender_id is None:
        return None
    entry = await gender_dao.get_by_id(profile.gender_id)
    return GenderTaxonomyOut.model_validate(entry)


def _coerce_theme(value: str) -> ThemePreference:
    if value in ("system", "dark", "light"):
        return value  # type: ignore[return-value]
    return "system"
