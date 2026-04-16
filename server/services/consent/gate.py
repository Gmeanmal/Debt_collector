from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.consent_controller import ConsentController
from core.db import get_session
from dependencies.auth import AuthContext, get_auth_context


def require_consent(slug: str) -> Callable[[AuthContext, AsyncSession], Awaitable[None]]:
    """Return a FastAPI dependency that enforces the current version of a consent slug.

    If the authenticated user has not accepted the latest version of `slug`, the dependency
    raises `HTTPException(status_code=428)` with a body containing the slug, current version,
    markdown body, and the `consent_text_id` the client must echo back on `/consent/{slug}/accept`.
    """

    async def guard(
        ctx: AuthContext = Depends(get_auth_context),
        session: AsyncSession = Depends(get_session),
    ) -> None:
        controller = ConsentController(session)
        current = await controller.get_current_raw(slug)
        if current is None:
            raise HTTPException(
                status_code=428,
                detail={
                    "error": "consent_required",
                    "slug": slug,
                    "version": None,
                    "body_md": None,
                    "consent_text_id": None,
                    "message": f"consent slug '{slug}' has no published text",
                },
            )
        accepted = await controller.has_accepted(ctx.user.id, slug)
        if accepted:
            return
        raise HTTPException(
            status_code=428,
            detail={
                "error": "consent_required",
                "slug": slug,
                "version": current.version,
                "body_md": current.body_md,
                "consent_text_id": str(current.id),
            },
        )

    return guard
