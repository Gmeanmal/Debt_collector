from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.toy_item import ToyCategory, ToyItem, ToyProposedBy

_MUTABLE_PATCH_FIELDS: frozenset[str] = frozenset(
    {"category", "name", "description", "photo_r2_key"}
)


class ToyItemDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, toy_id: UUID) -> ToyItem:
        """Return a toy_item row by primary key, raising NotFound if absent."""
        row = await self._session.get(ToyItem, toy_id)
        if row is None:
            raise NotFound(f"toy_item {toy_id} not found")
        return row

    async def list_by_sub(self, sub_id: UUID) -> list[ToyItem]:
        """Return all approved toy items belonging to a sub."""
        result = await self._session.execute(
            select(ToyItem)
            .where(
                col(ToyItem.sub_id) == sub_id,
                col(ToyItem.approved) == True,  # noqa: E712
            )
            .order_by(col(ToyItem.category), col(ToyItem.name))
        )
        return list(result.scalars().all())

    async def list_all_by_sub(self, sub_id: UUID) -> list[ToyItem]:
        """Return every toy item belonging to a sub (approved and pending proposals)."""
        result = await self._session.execute(
            select(ToyItem)
            .where(col(ToyItem.sub_id) == sub_id)
            .order_by(
                col(ToyItem.approved).desc(),
                col(ToyItem.category),
                col(ToyItem.name),
            )
        )
        return list(result.scalars().all())

    async def list_pending_by_goddess(self, goddess_id: UUID) -> list[ToyItem]:
        """Return all unapproved toy proposals across all subs for a goddess."""
        result = await self._session.execute(
            select(ToyItem)
            .where(
                col(ToyItem.goddess_id) == goddess_id,
                col(ToyItem.approved) == False,  # noqa: E712
            )
            .order_by(col(ToyItem.created_at).asc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        category: ToyCategory,
        name: str,
        description: str | None = None,
        photo_r2_key: str | None = None,
        proposed_by: ToyProposedBy,
        approved: bool = False,
    ) -> ToyItem:
        """Insert a new toy_item row and flush to obtain a DB-assigned id."""
        item = ToyItem(
            sub_id=sub_id,
            goddess_id=goddess_id,
            category=category,
            name=name,
            description=description,
            photo_r2_key=photo_r2_key,
            proposed_by=proposed_by,
            approved=approved,
        )
        self._session.add(item)
        await self._session.flush()
        return item

    async def update(
        self,
        toy_id: UUID,
        *,
        category: ToyCategory | None = None,
        name: str | None = None,
        description: str | None = None,
        photo_r2_key: str | None = None,
    ) -> ToyItem:
        """Update mutable fields on an existing toy_item. Raises NotFound if absent."""
        item = await self.get_by_id(toy_id)
        if category is not None:
            item.category = category
        if name is not None:
            item.name = name
        if description is not None:
            item.description = description
        if photo_r2_key is not None:
            item.photo_r2_key = photo_r2_key
        item.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(item)
        await self._session.flush()
        return item

    async def update_fields(self, item: ToyItem, patch: dict[str, Any]) -> ToyItem:
        """Apply an explicit partial patch to a toy_item (None values clear fields)."""
        for field, value in patch.items():
            if field not in _MUTABLE_PATCH_FIELDS:
                continue
            setattr(item, field, value)
        item.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(item)
        await self._session.flush()
        return item

    async def approve(self, toy_id: UUID) -> ToyItem:
        """Set approved=True on a pending proposal. Raises NotFound if absent."""
        item = await self.get_by_id(toy_id)
        item.approved = True
        item.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(item)
        await self._session.flush()
        return item

    async def reject(self, toy_id: UUID) -> None:
        """Hard-delete a toy_item row (used on rejection of a sub proposal)."""
        item = await self.get_by_id(toy_id)
        await self._session.delete(item)
        await self._session.flush()

    async def delete(self, toy_id: UUID) -> None:
        """Hard-delete a toy_item row unconditionally. Raises NotFound if absent."""
        item = await self.get_by_id(toy_id)
        await self._session.delete(item)
        await self._session.flush()
