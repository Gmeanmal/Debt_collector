from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.payment import AllocationTargetType, PaymentAllocation
from models.user import User
from models.wishlist_item import WishlistCreatedBy, WishlistItem, WishlistStatus


class WishlistDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        goddess_id: UUID,
        sub_id: UUID | None = None,
        title: str,
        description: str | None = None,
        image_url: str | None = None,
        external_url: str | None = None,
        target_amount: Decimal,
        created_by: WishlistCreatedBy,
        approved: bool = False,
    ) -> WishlistItem:
        """Insert a new wishlist_item row and flush to obtain a DB-assigned id."""
        item = WishlistItem(
            goddess_id=goddess_id,
            sub_id=sub_id,
            title=title,
            description=description,
            image_url=image_url,
            external_url=external_url,
            target_amount=target_amount,
            created_by=created_by,
            approved=approved,
        )
        self._session.add(item)
        await self._session.flush()
        return item

    async def get_by_id(self, wishlist_id: UUID) -> WishlistItem | None:
        """Return a wishlist_item row by primary key, or None if absent."""
        return await self._session.get(WishlistItem, wishlist_id)

    async def list_for_goddess(
        self, goddess_id: UUID, *, include_cancelled: bool = False
    ) -> list[WishlistItem]:
        """Return all wishlist items for a goddess, optionally excluding cancelled ones."""
        stmt = select(WishlistItem).where(col(WishlistItem.goddess_id) == goddess_id)
        if not include_cancelled:
            stmt = stmt.where(col(WishlistItem.status) != WishlistStatus.cancelled)
        stmt = stmt.order_by(col(WishlistItem.created_at).asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_open_for_sub(self, sub_id: UUID) -> list[WishlistItem]:
        """Return open, approved wishlist items visible to a sub (global + sub-specific).

        Scoped to the sub's own goddess. Includes items with sub_id=None (any-sub)
        and items explicitly assigned to this sub.
        """
        goddess_id_subq = select(User.goddess_id).where(col(User.id) == sub_id).scalar_subquery()
        result = await self._session.execute(
            select(WishlistItem)
            .where(
                col(WishlistItem.goddess_id) == goddess_id_subq,
                col(WishlistItem.status) == WishlistStatus.open,
                col(WishlistItem.approved) == True,  # noqa: E712
                (col(WishlistItem.sub_id).is_(None)) | (col(WishlistItem.sub_id) == sub_id),
            )
            .order_by(col(WishlistItem.created_at).asc())
        )
        return list(result.scalars().all())

    async def set_status(self, wishlist_id: UUID, status: WishlistStatus) -> WishlistItem:
        """Update the status of a wishlist item, setting fulfilled_at when fulfilled."""
        item = await self._session.get(WishlistItem, wishlist_id)
        if item is None:
            raise NotFound(f"wishlist_item {wishlist_id} not found")
        now = datetime.now(UTC).replace(tzinfo=None)
        item.status = status
        if status == WishlistStatus.fulfilled:
            item.fulfilled_at = now
        item.updated_at = now
        self._session.add(item)
        await self._session.flush()
        return item

    async def approve(self, wishlist_id: UUID) -> WishlistItem:
        """Set approved=True on a wishlist item. Raises NotFound if absent."""
        item = await self._session.get(WishlistItem, wishlist_id)
        if item is None:
            raise NotFound(f"wishlist_item {wishlist_id} not found")
        item.approved = True
        item.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(item)
        await self._session.flush()
        return item

    async def compute_collected(self, wishlist_id: UUID) -> Decimal:
        """Return the sum of validated allocations targeting this wishlist item."""
        result = await self._session.execute(
            select(func.coalesce(func.sum(col(PaymentAllocation.amount)), 0)).where(
                col(PaymentAllocation.target_type) == AllocationTargetType.wishlist_goal,
                col(PaymentAllocation.target_id) == wishlist_id,
            )
        )
        return Decimal(str(result.scalar_one()))

    async def count_allocations(self, wishlist_id: UUID) -> int:
        """Return the number of allocation rows targeting this wishlist item."""
        result = await self._session.execute(
            select(func.count(col(PaymentAllocation.id))).where(
                col(PaymentAllocation.target_type) == AllocationTargetType.wishlist_goal,
                col(PaymentAllocation.target_id) == wishlist_id,
            )
        )
        return int(result.scalar_one())

    async def update(self, item: WishlistItem, patch: dict[str, Any]) -> WishlistItem:
        """Apply partial updates to a wishlist item and stamp updated_at."""
        for field, value in patch.items():
            setattr(item, field, value)
        item.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(item)
        await self._session.flush()
        return item

    async def delete(self, item: WishlistItem) -> None:
        """Hard-delete a wishlist item row."""
        await self._session.delete(item)
        await self._session.flush()

    async def mark_fulfilled(self, item: WishlistItem) -> WishlistItem:
        """Flip status to fulfilled and stamp fulfilled_at; idempotent on already-fulfilled rows."""
        if item.status == WishlistStatus.fulfilled:
            return item
        now = datetime.now(UTC).replace(tzinfo=None)
        item.status = WishlistStatus.fulfilled
        item.fulfilled_at = now
        item.updated_at = now
        self._session.add(item)
        await self._session.flush()
        return item
