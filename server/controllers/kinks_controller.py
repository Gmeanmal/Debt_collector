import re
from collections.abc import Mapping
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Conflict, Forbidden, NotFound
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
    KinkOverviewItemOut,
    KinkOverviewOut,
    KinkProposalOut,
    KinkProposeIn,
    SubKinkRatingIn,
    SubKinkRatingOut,
)

_CONFIRMATION_RATINGS: frozenset[KinkRating] = frozenset(
    {KinkRating.loves, KinkRating.fetish_need}
)


def _needs_confirmation(safety_flag: bool, rating: KinkRating) -> bool:
    return safety_flag and rating in _CONFIRMATION_RATINGS


def _make_initial_slug(label: str) -> str:
    import random
    import string

    clean = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{clean}-{suffix}"[:64]


def _proposal_to_out(item: KinkItem, *, proposer_username: str | None) -> KinkProposalOut:
    return KinkProposalOut(
        id=item.id,
        category_id=item.category_id,
        slug=item.slug,
        label=item.label,
        description=item.description,
        safety_flag=item.safety_flag,
        approved=item.approved,
        proposed_by=item.proposed_by,
        proposer_username=proposer_username,
        created_at=item.created_at,
    )


def _assert_goddess_owns_proposal(item: KinkItem, goddess_id: UUID) -> None:
    if not item.is_custom:
        raise NotFound("kink item is not a custom proposal")
    if item.goddess_id != goddess_id:
        raise NotFound("proposal not found")


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

    async def get_matrix_for_goddess(self, goddess_user_id: UUID, sub_id: UUID) -> KinkMatrixOut:
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

    async def propose_as_sub(self, sub_user_id: UUID, body: KinkProposeIn) -> KinkProposalOut:
        """Submit a custom kink item proposal for the sub's goddess to review."""
        sub = await self._user_dao.get_by_id(sub_user_id)
        if sub is None or sub.goddess_id is None:
            raise Conflict("sub is not assigned to a goddess")
        slug = _make_initial_slug(body.label)
        item = await self._item_dao.create_proposal(
            category_id=body.category_id,
            goddess_id=sub.goddess_id,
            proposed_by=sub_user_id,
            label=body.label,
            slug=slug,
            description=body.description,
            safety_flag=body.safety_flag,
        )
        return _proposal_to_out(item, proposer_username=sub.username)

    async def list_sub_proposals(self, sub_user_id: UUID) -> list[KinkProposalOut]:
        """List all pending proposals submitted by the calling sub."""
        items = await self._item_dao.list_proposals_for_sub(sub_user_id)
        sub = await self._user_dao.get_by_id(sub_user_id)
        username = sub.username if sub is not None else None
        return [_proposal_to_out(i, proposer_username=username) for i in items]

    async def list_goddess_proposals(self, goddess_user_id: UUID) -> list[KinkProposalOut]:
        """List all pending proposals across all subs for the calling goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user_id)
        items = await self._item_dao.list_proposals_for_goddess(goddess_id)
        result: list[KinkProposalOut] = []
        for item in items:
            proposer_username: str | None = None
            if item.proposed_by is not None:
                proposer = await self._user_dao.get_by_id(item.proposed_by)
                proposer_username = proposer.username if proposer is not None else None
            result.append(_proposal_to_out(item, proposer_username=proposer_username))
        return result

    async def approve_proposal(self, goddess_user_id: UUID, item_id: UUID) -> KinkProposalOut:
        """Approve a pending kink proposal, making it visible in the goddess's catalog."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user_id)
        item = await self._item_dao.get_by_id(item_id)
        _assert_goddess_owns_proposal(item, goddess_id)
        if item.approved:
            raise Conflict("proposal is already approved")
        item = await self._item_dao.approve(item)
        proposer_username: str | None = None
        if item.proposed_by is not None:
            proposer = await self._user_dao.get_by_id(item.proposed_by)
            proposer_username = proposer.username if proposer is not None else None
        return _proposal_to_out(item, proposer_username=proposer_username)

    async def reject_proposal(self, goddess_user_id: UUID, item_id: UUID) -> None:
        """Hard-delete a pending kink proposal (ratings cascade via FK)."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user_id)
        item = await self._item_dao.get_by_id(item_id)
        _assert_goddess_owns_proposal(item, goddess_id)
        await self._item_dao.reject(item)

    async def overview_for_goddess(self, goddess_user_id: UUID) -> KinkOverviewOut:
        """Aggregate per-item rating counts across all subs for the calling goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user_id)
        all_items = await self._item_dao.list_for_goddess(goddess_id)
        categories = await self._category_dao.list_all()
        category_by_id = {c.id: c for c in categories}
        rating_rows = await self._rating_dao.count_ratings_per_item_for_goddess(goddess_id)
        total_subs = await self._rating_dao.count_subs_for_goddess(goddess_id)

        all_ratings = list(KinkRating)
        counts_by_item: dict[UUID, dict[str, int]] = {}
        for item in all_items:
            counts_by_item[item.id] = {r.value: 0 for r in all_ratings}
        for item_id, rating, count in rating_rows:
            if item_id in counts_by_item:
                counts_by_item[item_id][rating.value] = count
        for _item_id, rating_counts in counts_by_item.items():
            explicit_total = sum(v for k, v in rating_counts.items() if k != KinkRating.not_set)
            rating_counts[KinkRating.not_set] = max(0, total_subs - explicit_total)

        overview_items = [
            self._build_overview_item(item, category_by_id, counts_by_item[item.id])
            for item in all_items
        ]
        return KinkOverviewOut(total_subs=total_subs, items=overview_items)

    def _build_overview_item(
        self,
        item: KinkItem,
        category_by_id: Mapping[UUID, KinkCategory],
        counts: dict[str, int],
    ) -> KinkOverviewItemOut:
        cat = category_by_id.get(item.category_id)
        cat_label = cat.label if cat is not None else ""
        cat_order = cat.sort_order if cat is not None else 0
        return KinkOverviewItemOut(
            item_id=item.id,
            slug=item.slug,
            label=item.label,
            category_label=cat_label,
            category_sort_order=cat_order,
            safety_flag=item.safety_flag,
            counts=counts,
        )
