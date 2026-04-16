from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Forbidden, NotFound
from daos.kink_category_dao import KinkCategoryDao
from daos.kink_item_dao import KinkItemDao
from daos.sub_kink_rating_dao import SubKinkRatingDao
from daos.user_dao import UserDao
from models.kink_category import KinkCategory
from models.kink_item import KinkItem
from models.sub_kink_rating import KinkRating, SubKinkRating
from models.user import UserRole
from schemas.kinks import (
    KinkCategoryOut,
    KinkItemOut,
    KinkMatrixOut,
    SubKinkRatingIn,
    SubKinkRatingOut,
)

_CONFIRMATION_RATINGS: frozenset[KinkRating] = frozenset(
    {KinkRating.curious, KinkRating.loves, KinkRating.fetish_need}
)


def _needs_confirmation(safety_flag: bool, rating: KinkRating) -> bool:
    return safety_flag and rating in _CONFIRMATION_RATINGS


class KinksController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._category_dao = KinkCategoryDao(session)
        self._item_dao = KinkItemDao(session)
        self._rating_dao = SubKinkRatingDao(session)
        self._user_dao = UserDao(session)

    async def get_matrix_for_self(self, sub_user_id: UUID) -> KinkMatrixOut:
        """Return the kink matrix scoped to the calling sub's goddess."""
        goddess_id = await self._resolve_sub_goddess_id(sub_user_id)
        return await self._build_matrix(sub_id=sub_user_id, goddess_id=goddess_id)

    async def upsert_self_rating(
        self, sub_user_id: UUID, item_id: UUID, body: SubKinkRatingIn
    ) -> SubKinkRatingOut:
        """Upsert the calling sub's rating for a single kink item."""
        goddess_id = await self._resolve_sub_goddess_id(sub_user_id)
        item = await self._item_dao.get_by_id(item_id)
        self._assert_item_in_goddess_scope(item, goddess_id)
        record = await self._rating_dao.upsert(
            sub_id=sub_user_id,
            goddess_id=goddess_id,
            item_id=item_id,
            rating=body.rating,
            note=body.note,
        )
        return self._rating_to_out(record, item)

    async def get_matrix_for_goddess(
        self, goddess_user_id: UUID, sub_id: UUID
    ) -> KinkMatrixOut:
        """Return the kink matrix for one of the calling goddess's subs (read-only)."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user_id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        return await self._build_matrix(sub_id=sub_id, goddess_id=goddess_id)

    async def _resolve_sub_goddess_id(self, sub_user_id: UUID) -> UUID:
        sub = await self._user_dao.get_by_id(sub_user_id)
        if sub is None or sub.goddess_id is None:
            raise Forbidden("sub is not assigned to a goddess")
        return sub.goddess_id

    def _assert_item_in_goddess_scope(self, item: KinkItem, goddess_id: UUID) -> None:
        if not item.approved:
            raise NotFound("kink item not available")
        if item.goddess_id is not None and item.goddess_id != goddess_id:
            raise Forbidden("kink item is not available in this goddess's catalog")

    async def _build_matrix(self, *, sub_id: UUID, goddess_id: UUID) -> KinkMatrixOut:
        categories = await self._category_dao.list_all()
        items = await self._item_dao.list_for_goddess(goddess_id)
        ratings = await self._rating_dao.get_matrix(sub_id)
        rating_by_item: dict[UUID, SubKinkRating] = {r.item_id: r for r in ratings}
        items_by_category: dict[UUID, list[KinkItem]] = {}
        for item in items:
            items_by_category.setdefault(item.category_id, []).append(item)
        return KinkMatrixOut(
            categories=[
                self._category_to_out(cat, items_by_category.get(cat.id, []), rating_by_item)
                for cat in categories
            ]
        )

    def _category_to_out(
        self,
        category: KinkCategory,
        items: list[KinkItem],
        rating_by_item: dict[UUID, SubKinkRating],
    ) -> KinkCategoryOut:
        return KinkCategoryOut(
            id=category.id,
            slug=category.slug,
            label=category.label,
            safety_flag=category.safety_flag,
            sort_order=category.sort_order,
            items=[self._item_to_out(item, rating_by_item.get(item.id)) for item in items],
        )

    def _item_to_out(self, item: KinkItem, rating: SubKinkRating | None) -> KinkItemOut:
        current_rating = rating.rating if rating is not None else KinkRating.not_set
        return KinkItemOut(
            id=item.id,
            slug=item.slug,
            label=item.label,
            description=item.description,
            safety_flag=item.safety_flag,
            is_custom=item.is_custom,
            rating=current_rating,
            note=rating.note if rating is not None else None,
            needs_confirmation=_needs_confirmation(item.safety_flag, current_rating),
        )

    def _rating_to_out(self, record: SubKinkRating, item: KinkItem) -> SubKinkRatingOut:
        return SubKinkRatingOut(
            item_id=record.item_id,
            rating=record.rating,
            note=record.note,
            needs_confirmation=_needs_confirmation(item.safety_flag, record.rating),
            updated_at=record.updated_at,
        )
