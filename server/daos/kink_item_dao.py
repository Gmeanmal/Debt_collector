from datetime import UTC, datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import Conflict, NotFound
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

    async def create_proposal(
        self,
        *,
        category_id: UUID,
        goddess_id: UUID,
        proposed_by: UUID,
        label: str,
        slug: str,
        description: str | None,
        safety_flag: bool,
    ) -> KinkItem:
        """Insert a new unapproved custom kink item. Retries up to 5 times on slug collision."""
        import random
        import re
        import string

        def _make_slug(base: str, suffix: str) -> str:
            clean = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
            return f"{clean}-{suffix}"[:64]

        candidates = [slug] + [
            _make_slug(label, "".join(random.choices(string.ascii_lowercase + string.digits, k=4)))
            for _ in range(4)
        ]
        for candidate in candidates:
            row = KinkItem(
                category_id=category_id,
                goddess_id=goddess_id,
                slug=candidate,
                label=label,
                description=description,
                safety_flag=safety_flag,
                is_custom=True,
                proposed_by=proposed_by,
                approved=False,
            )
            self._session.add(row)
            try:
                await self._session.flush()
                return row
            except IntegrityError:
                await self._session.rollback()

        raise Conflict("slug collision: could not generate a unique slug after 5 attempts")

    async def list_proposals_for_sub(self, sub_id: UUID) -> list[KinkItem]:
        """Return all pending proposals submitted by a specific sub."""
        result = await self._session.execute(
            select(KinkItem)
            .where(
                col(KinkItem.proposed_by) == sub_id,
                col(KinkItem.approved) == False,  # noqa: E712
                col(KinkItem.is_custom) == True,  # noqa: E712
            )
            .order_by(col(KinkItem.created_at).asc())
        )
        return list(result.scalars().all())

    async def list_proposals_for_goddess(self, goddess_id: UUID) -> list[KinkItem]:
        """Return all pending custom proposals visible to the given goddess."""
        result = await self._session.execute(
            select(KinkItem)
            .where(
                col(KinkItem.goddess_id) == goddess_id,
                col(KinkItem.is_custom) == True,  # noqa: E712
                col(KinkItem.approved) == False,  # noqa: E712
            )
            .order_by(col(KinkItem.created_at).asc())
        )
        return list(result.scalars().all())

    async def approve(self, item: KinkItem) -> KinkItem:
        """Flip approved=True on the given kink item."""
        item.approved = True
        item.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(item)
        await self._session.flush()
        return item

    async def reject(self, item: KinkItem) -> None:
        """Hard-delete the given kink item (ratings cascade via FK)."""
        await self._session.delete(item)
        await self._session.flush()
