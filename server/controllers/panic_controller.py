from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Unauthorized
from core.security import verify_password
from daos.user_dao import UserDao
from models.notification import NotificationType
from models.user import User
from schemas.panic import PanicOut
from services.notifications.notify import notify
from services.panic.orchestrator import (
    cancel_pending_tasks_for_sub,
    get_goddess_user_id_for_sub,
    pause_all_rituals_for_sub,
    soft_release,
)


class PanicController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._user_dao = UserDao(session)

    async def trigger(self, sub: User, confirm_password: str) -> PanicOut:
        """Execute the emergency-stop protocol for the calling sub.

        Steps performed atomically (caller must commit):
        1. Re-authenticate the sub via confirm_password.
        2. Pause all non-paused rituals.
        3. Cancel open + submitted tasks.
        4. Soft-release ownership status (no-op if already released).
        5. Notify the goddess with high priority.
        """
        if not verify_password(confirm_password, sub.password_hash):
            raise Unauthorized("re_auth_failed")

        paused_count = await pause_all_rituals_for_sub(self._session, sub.id)
        cancelled_count = await cancel_pending_tasks_for_sub(self._session, sub.id)

        goddess_id: UUID | None = None
        released = False

        if sub.goddess_id is not None:
            goddess_id = sub.goddess_id
            released = await soft_release(self._session, sub.id, goddess_id)

            goddess_user_id = await get_goddess_user_id_for_sub(self._session, sub.id)
            if goddess_user_id is not None:
                ts = datetime.now(UTC).replace(tzinfo=None)
                await notify(
                    self._session,
                    goddess_user_id,
                    NotificationType.sub_panic,
                    title="Panic triggered",
                    body=(
                        f"Sub {sub.username} triggered emergency stop at "
                        f"{ts.isoformat()}. "
                        "Rituals paused, tasks cancelled, ownership released."
                    ),
                    payload={"priority": "high", "sub_id": str(sub.id)},
                )
        else:
            # Sub has no goddess assigned yet; still pause rituals.
            released = False

        return PanicOut(
            paused_rituals=paused_count,
            released=released,
            ts=datetime.now(UTC).replace(tzinfo=None),
            cancelled_tasks=cancelled_count,
        )
