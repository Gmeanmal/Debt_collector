from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.reference_controller import ReferenceController
from core.db import get_session
from dependencies.auth import get_current_user
from models.user import User
from schemas.reference import GenderTaxonomyOut

router = APIRouter(prefix="/reference", tags=["reference"])

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E500 = {"description": "Internal server error"}


@router.get(
    "/genders",
    summary="List all gender taxonomy entries",
    description=(
        "Returns the complete ordered list of 72 gender taxonomy entries sorted by `sort_order`. "
        "Accessible to all authenticated roles (sub, goddess, admin). "
        "Use the `id` from this list to set `gender_id` on a sub profile."
    ),
    response_model=list[GenderTaxonomyOut],
    status_code=200,
    tags=["reference"],
    responses={
        401: _E401,
        500: _E500,
    },
)
async def list_genders(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(get_current_user),
) -> list[GenderTaxonomyOut]:
    """Return all gender taxonomy entries, sorted by sort_order."""
    ctrl = ReferenceController(session)
    return await ctrl.list_genders()
