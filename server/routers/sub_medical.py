from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.sub_medical_controller import SubMedicalController
from core.db import get_session
from dependencies.auth import require_role
from dependencies.feature_flags import require_medical_feature
from models.user import User, UserRole
from schemas.sub_medical import SubMedicalRevealOut, SubMedicalSelfOut, SubMedicalUpdate
from services.consent.gate import require_consent

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {
    "description": "Forbidden — caller does not have the required role or the sub is not theirs"
}
_E404 = {"description": "Not found — the medical record does not exist"}
_E409 = {"description": "Conflict — the sub has no assigned goddess"}
_E428 = {"description": "Precondition required — medical consent not yet accepted"}

sub_router = APIRouter(
    prefix="/profile",
    tags=["medical"],
    dependencies=[Depends(require_medical_feature)],
)
goddess_router = APIRouter(
    prefix="/goddess/subs",
    tags=["medical-reveal"],
    dependencies=[Depends(require_medical_feature)],
)


def _ctrl(session: AsyncSession = Depends(get_session)) -> SubMedicalController:
    return SubMedicalController(session)


@sub_router.get(
    "/medical",
    summary="Get own medical status",
    description=(
        "Returns a boolean presence flag for each encrypted medical field. "
        "No plaintext is ever returned to the sub. "
        "If no record exists yet, all flags are false. "
        "Requires the sub to have accepted the current `medical` consent version. "
        "Returns 404 when the medical module feature flag is disabled."
    ),
    response_model=SubMedicalSelfOut,
    status_code=200,
    tags=["medical"],
    responses={
        401: _E401,
        403: _E403,
        404: _E404,
        428: _E428,
    },
)
async def get_own_medical_status(
    sub: User = Depends(require_role(UserRole.sub)),
    _consent: None = Depends(require_consent("medical")),
    ctrl: SubMedicalController = Depends(_ctrl),
) -> SubMedicalSelfOut:
    """Retrieve the authenticated sub's medical field status (is-set booleans only)."""
    return await ctrl.get_self_status(sub)


@sub_router.put(
    "/medical",
    summary="Save own medical information",
    description=(
        "Creates or updates the calling sub's encrypted medical record. "
        "Each field is individually encrypted with AES-256-GCM under the goddess's DEK "
        "and bound by an AAD of `sub_medical:<sub_id>:<field_name>`. "
        "Pass `null` or an empty string for any field to clear it. "
        "Returns is-set booleans — plaintext is never echoed back. "
        "Requires the sub to have accepted the current `medical` consent version. "
        "The sub must have an assigned goddess. "
        "Returns 404 when the medical module feature flag is disabled."
    ),
    response_model=SubMedicalSelfOut,
    status_code=200,
    tags=["medical"],
    responses={
        401: _E401,
        403: _E403,
        404: _E404,
        409: _E409,
        428: _E428,
    },
)
async def upsert_own_medical(
    body: SubMedicalUpdate,
    sub: User = Depends(require_role(UserRole.sub)),
    _consent: None = Depends(require_consent("medical")),
    session: AsyncSession = Depends(get_session),
    ctrl: SubMedicalController = Depends(_ctrl),
) -> SubMedicalSelfOut:
    """Encrypt and persist the authenticated sub's medical information."""
    result = await ctrl.upsert_self(sub, body)
    await session.commit()
    return result


@goddess_router.get(
    "/{sub_id}/medical",
    summary="Reveal a sub's medical information",
    description=(
        "Decrypts and returns the full medical record for the given sub. "
        "The sub must belong to the authenticated goddess; any mismatch returns 403. "
        "Every successful reveal is logged to the audit trail as `medical_reveal`. "
        "Returns 404 if the sub has not yet saved any medical information. "
        "Returns 404 when the medical module feature flag is disabled."
    ),
    response_model=SubMedicalRevealOut,
    status_code=200,
    tags=["medical-reveal"],
    responses={
        401: _E401,
        403: _E403,
        404: _E404,
    },
)
async def reveal_sub_medical(
    sub_id: UUID,
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
    ctrl: SubMedicalController = Depends(_ctrl),
) -> SubMedicalRevealOut:
    """Decrypt and return a sub's medical record, logging the reveal event."""
    result = await ctrl.reveal_for_goddess(goddess, sub_id)
    await session.commit()
    return result
