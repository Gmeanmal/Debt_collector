from datetime import UTC, datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.kink_item import KinkItem


class KinkItemDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_category(self, category_id: UUID) -> list[KinkItem]:
        """Return approved global items + approved goddess-owned items for a category."""
        result = await self._session.execute(
            select(KinkItem)
            .where(
                col(KinkItem.category_id) == category_id,
                col(KinkItem.approved) == True,  # noqa: E712
            )
            .order_by(col(KinkItem.slug).asc())
        )
        return list(result.scalars().all())

    async def list_for_goddess(self, goddess_id: UUID) -> list[KinkItem]:
        """Return all approved items visible to a goddess (global + her custom items)."""
        result = await self._session.execute(
            select(KinkItem)
            .where(
                col(KinkItem.approved) == True,  # noqa: E712
                sa.or_(
                    col(KinkItem.goddess_id).is_(None),
                    col(KinkItem.goddess_id) == goddess_id,
                ),
            )
            .order_by(col(KinkItem.category_id).asc(), col(KinkItem.slug).asc())
        )
        return list(result.scalars().all())

    async def upsert_by_slug(
        self,
        *,
        slug: str,
        goddess_id: UUID | None = None,
        category_id: UUID,
        label: str,
        description: str | None = None,
        safety_flag: bool = False,
        is_custom: bool = False,
        proposed_by: UUID | None = None,
        approved: bool = True,
    ) -> KinkItem:
        """Insert or update an item identified by (slug, goddess_id). Used by the seed."""
        stmt = select(KinkItem).where(col(KinkItem.slug) == slug)
        if goddess_id is None:
            stmt = stmt.where(col(KinkItem.goddess_id).is_(None))
        else:
            stmt = stmt.where(col(KinkItem.goddess_id) == goddess_id)

        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        now = datetime.now(UTC).replace(tzinfo=None)

        if row is None:
            row = KinkItem(
                category_id=category_id,
                goddess_id=goddess_id,
                slug=slug,
                label=label,
                description=description,
                safety_flag=safety_flag,
                is_custom=is_custom,
                proposed_by=proposed_by,
                approved=approved,
            )
            self._session.add(row)
        else:
            row.category_id = category_id
            row.label = label
            row.description = description
            row.safety_flag = safety_flag
            row.is_custom = is_custom
            row.approved = approved
            row.updated_at = now
            self._session.add(row)

        await self._session.flush()
        return row

    async def get_by_id(self, item_id: UUID) -> KinkItem:
        """Return a kink_item by primary key, raising NotFound if absent."""
        row = await self._session.get(KinkItem, item_id)
        if row is None:
            raise NotFound(f"kink_item {item_id} not found")
        return row
