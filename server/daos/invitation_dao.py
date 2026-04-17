from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.invitation import Invitation
from models.user import Goddess


class InvitationDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        goddess_id: UUID,
        amount: Decimal,
        note: str | None,
        expires_at: datetime,
        token: str,
    ) -> Invitation:
        invitation = Invitation(
            token=token,
            goddess_id=goddess_id,
            entry_tribute_amount=amount,
            note=note,
            expires_at=expires_at,
        )
        self._session.add(invitation)
        await self._session.flush()
        return invitation

    async def get_by_token(self, token: str) -> tuple[Invitation, Goddess] | None:
        result = await self._session.execute(
            select(Invitation, Goddess)
            .join(Goddess, col(Invitation.goddess_id) == col(Goddess.id))
            .where(col(Invitation.token) == token)
        )
        row = result.first()
        if row is None:
            return None
        return row[0], row[1]

    async def consume(self, invitation: Invitation, user_id: UUID, now: datetime) -> None:
        invitation.used_at = now
        invitation.used_by_user_id = user_id
        self._session.add(invitation)

    async def get_by_used_by_user_id(self, user_id: UUID) -> Invitation | None:
        """Return the invitation that was consumed by this user, or None."""
        result = await self._session.execute(
            select(Invitation).where(col(Invitation.used_by_user_id) == user_id)
        )
        return result.scalar_one_or_none()

    async def list_by_goddess(self, goddess_id: UUID) -> list[Invitation]:
        result = await self._session.execute(
            select(Invitation)
            .where(col(Invitation.goddess_id) == goddess_id)
            .order_by(col(Invitation.created_at).desc())
        )
        return list(result.scalars().all())

    async def count_active(self, goddess_id: UUID, now: datetime) -> int:
        """Return invitations that are unused and not yet expired."""
        result = await self._session.execute(
            select(func.count())
            .select_from(Invitation)
            .where(
                col(Invitation.goddess_id) == goddess_id,
                col(Invitation.used_at).is_(None),
                col(Invitation.expires_at) > now,
            )
        )
        return int(result.scalar_one() or 0)

    async def get_by_id_for_goddess(
        self, invitation_id: UUID, goddess_id: UUID
    ) -> Invitation | None:
        """Return the invitation if it belongs to this goddess, else None."""
        result = await self._session.execute(
            select(Invitation).where(
                col(Invitation.id) == invitation_id,
                col(Invitation.goddess_id) == goddess_id,
            )
        )
        return result.scalar_one_or_none()

    async def count_consumed(self, goddess_id: UUID) -> int:
        """Return invitations that were consumed by a sub."""
        result = await self._session.execute(
            select(func.count())
            .select_from(Invitation)
            .where(
                col(Invitation.goddess_id) == goddess_id,
                col(Invitation.used_by_user_id).isnot(None),
            )
        )
        return int(result.scalar_one() or 0)
