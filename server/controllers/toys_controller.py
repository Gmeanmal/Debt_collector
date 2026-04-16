from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.toy_item_dao import ToyItemDao
from daos.user_dao import UserDao
from models.toy_item import ToyItem, ToyProposedBy
from models.user import User, UserRole
from schemas.toys import (
    ToyItemCreateIn,
    ToyItemOut,
    ToyItemProposeIn,
    ToyItemUpdateIn,
)


class ToysController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = ToyItemDao(session)
        self._user_dao = UserDao(session)

    def _to_out(self, item: ToyItem) -> ToyItemOut:
        return ToyItemOut.model_validate(item)

    async def _require_sub_under_goddess(self, goddess_id: UUID, sub_id: UUID) -> User:
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        return sub

    async def _require_owned_by_goddess(self, goddess_id: UUID, toy_id: UUID) -> ToyItem:
        try:
            item = await self._dao.get_by_id(toy_id)
        except NotFound as exc:
            raise NotFound("toy item not found") from exc
        if item.goddess_id != goddess_id:
            raise Forbidden("toy item does not belong to this goddess")
        return item

    async def list_for_goddess(self, goddess_user: User, sub_id: UUID) -> list[ToyItemOut]:
        """Return every toy item (approved + pending proposals) for one of the caller's subs."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_sub_under_goddess(goddess_id, sub_id)
        items = await self._dao.list_all_by_sub(sub_id)
        return [self._to_out(i) for i in items]

    async def create_as_goddess(
        self, goddess_user: User, sub_id: UUID, payload: ToyItemCreateIn
    ) -> ToyItemOut:
        """Create a goddess-authored toy item (auto-approved) for a specific sub."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_sub_under_goddess(goddess_id, sub_id)
        item = await self._dao.create(
            sub_id=sub_id,
            goddess_id=goddess_id,
            category=payload.category,
            name=payload.name,
            description=payload.description,
            photo_r2_key=payload.photo_r2_key,
            proposed_by=ToyProposedBy.goddess,
            approved=True,
        )
        return self._to_out(item)

    async def update_as_goddess(
        self,
        goddess_user: User,
        toy_id: UUID,
        patch: ToyItemUpdateIn,
    ) -> ToyItemOut:
        """Partially update a toy item owned by the caller. Cannot toggle `approved` here."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned_by_goddess(goddess_id, toy_id)
        patch_dict: dict[str, Any] = patch.model_dump(exclude_unset=True)
        if not patch_dict:
            return self._to_out(item)
        updated = await self._dao.update_fields(item, patch_dict)
        return self._to_out(updated)

    async def delete_as_goddess(self, goddess_user: User, toy_id: UUID) -> None:
        """Hard-delete a toy item owned by the caller."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned_by_goddess(goddess_id, toy_id)
        await self._dao.delete(item.id)

    async def approve_as_goddess(self, goddess_user: User, toy_id: UUID) -> ToyItemOut:
        """Approve a sub-proposed toy item so it becomes visible on the sub's inventory."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned_by_goddess(goddess_id, toy_id)
        if item.proposed_by != ToyProposedBy.sub:
            raise BadRequest("only sub-proposed items require approval")
        if item.approved:
            return self._to_out(item)
        updated = await self._dao.approve(item.id)
        return self._to_out(updated)

    async def reject_as_goddess(self, goddess_user: User, toy_id: UUID) -> None:
        """Hard-delete a sub-proposed item that has not yet been approved."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned_by_goddess(goddess_id, toy_id)
        if item.proposed_by != ToyProposedBy.sub:
            raise BadRequest("only sub-proposed items can be rejected")
        if item.approved:
            raise Conflict("item is already approved; delete it instead")
        await self._dao.reject(item.id)

    async def list_for_sub(self, sub_user: User) -> list[ToyItemOut]:
        """Return approved toy items for the authenticated sub."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")
        items = await self._dao.list_by_sub(sub_user.id)
        return [self._to_out(i) for i in items]

    async def propose_as_sub(self, sub_user: User, payload: ToyItemProposeIn) -> ToyItemOut:
        """Propose a sub-authored toy item pending goddess approval."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")
        item = await self._dao.create(
            sub_id=sub_user.id,
            goddess_id=sub_user.goddess_id,
            category=payload.category,
            name=payload.name,
            description=payload.description,
            photo_r2_key=payload.photo_r2_key,
            proposed_by=ToyProposedBy.sub,
            approved=False,
        )
        return self._to_out(item)
