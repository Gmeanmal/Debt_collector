from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from daos.user_dao import UserDao
from dependencies.auth import get_current_user
from models.user import User
from schemas.auth import ProfileUpdate, UserOut

router = APIRouter(prefix="/me", tags=["me"])

_E400 = {"description": "Bad request — validation failed (e.g. bio too long, invalid avatar key)"}


def _display_name(user: User) -> str:
    parts = [p for p in [user.first_name, user.last_name] if p]
    return " ".join(parts) if parts else user.username


def _build_user_out(user: User) -> UserOut:
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
        created_at=user.created_at,
        impersonator_id=None,
        impersonator_display_name=None,
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
        "Updates first_name, last_name, bio, and avatar_key for the authenticated user. "
        "All fields are optional. "
        "bio is capped at 500 characters; avatar_key must be one of the defined enum values."
    ),
    response_model=UserOut,
    status_code=200,
    tags=["me"],
    responses={400: _E400, 401: _E401, 422: _E422, 500: _E500},
)
async def update_profile(
    body: ProfileUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> UserOut:
    dao = UserDao(session)
    updated = await dao.update_profile(
        user,
        first_name=body.first_name,
        last_name=body.last_name,
        bio=body.bio,
        avatar_key=body.avatar_key,
    )
    await session.commit()
    return _build_user_out(updated)


def _coerce_theme(value: str) -> ThemePreference:
    if value in ("system", "dark", "light"):
        return value  # type: ignore[return-value]
    return "system"
