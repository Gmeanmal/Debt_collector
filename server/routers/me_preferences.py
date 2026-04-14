from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from daos.user_dao import UserDao
from dependencies.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/me", tags=["me"])

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


def _coerce_theme(value: str) -> ThemePreference:
    if value in ("system", "dark", "light"):
        return value  # type: ignore[return-value]
    return "system"
