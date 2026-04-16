from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id, resolve_goddess_user_id
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.user_dao import UserDao
from daos.wishlist_dao import WishlistDao
from models.notification import NotificationType
from models.user import User
from models.wishlist_item import (
    WishlistCreatedBy,
    WishlistItem,
    WishlistStatus,
)
from schemas.wishlist import (
    WishlistItemCreateIn,
    WishlistItemOut,
    WishlistItemProposeIn,
    WishlistItemUpdateIn,
)
from services.notifications.notify import notify


class WishlistController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = WishlistDao(session)
        self._user_dao = UserDao(session)

    async def _to_out(self, item: WishlistItem) -> WishlistItemOut:
        collected = await self._dao.compute_collected(item.id)
        return WishlistItemOut(
            id=item.id,
            goddess_id=item.goddess_id,
            sub_id=item.sub_id,
            title=item.title,
            description=item.description,
            image_url=item.image_url,
            external_url=item.external_url,
            target_amount=Decimal(str(item.target_amount)),
            collected=collected,
            status=item.status,
            created_by=item.created_by,
            approved=item.approved,
            created_at=item.created_at,
            updated_at=item.updated_at,
            fulfilled_at=item.fulfilled_at,
        )

    async def _require_sub_under_goddess(self, goddess_id: UUID, sub_id: UUID) -> None:
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise BadRequest("sub not found or not linked to this goddess")

    async def _require_owned(self, goddess_id: UUID, item_id: UUID) -> WishlistItem:
        item = await self._dao.get_by_id(item_id)
        if item is None:
            raise NotFound("wishlist item not found")
        if item.goddess_id != goddess_id:
            raise Forbidden("wishlist item does not belong to this goddess")
        return item

    async def list_for_goddess(self, goddess_user: User) -> list[WishlistItemOut]:
        """Return every wishlist item for the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        items = await self._dao.list_for_goddess(goddess_id, include_cancelled=True)
        return [await self._to_out(i) for i in items]

    async def create_as_goddess(
        self, goddess_user: User, payload: WishlistItemCreateIn
    ) -> WishlistItemOut:
        """Create a goddess-authored wishlist item (auto-approved, open)."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        if payload.sub_id is not None:
            await self._require_sub_under_goddess(goddess_id, payload.sub_id)

        item = await self._dao.create(
            goddess_id=goddess_id,
            sub_id=payload.sub_id,
            title=payload.title,
            description=payload.description,
            image_url=payload.image_url,
            external_url=payload.external_url,
            target_amount=payload.target_amount,
            created_by=WishlistCreatedBy.goddess,
            approved=True,
        )
        return await self._to_out(item)

    async def update_as_goddess(
        self,
        goddess_user: User,
        wishlist_id: UUID,
        patch: WishlistItemUpdateIn,
    ) -> WishlistItemOut:
        """Partially update a wishlist item.

        `approved=false` cannot be set here (use DELETE / reject instead);
        `status=fulfilled` is set by the payment pipeline, never manually.
        """
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned(goddess_id, wishlist_id)

        patch_dict: dict[str, Any] = patch.model_dump(exclude_unset=True)

        if "sub_id" in patch_dict and patch_dict["sub_id"] is not None:
            await self._require_sub_under_goddess(goddess_id, patch_dict["sub_id"])

        if "status" in patch_dict:
            new_status = patch_dict["status"]
            if new_status == WishlistStatus.fulfilled:
                raise BadRequest("status=fulfilled is set automatically by the payment pipeline")
            if item.status == WishlistStatus.fulfilled:
                raise Conflict("fulfilled items cannot change status")

        await self._dao.update(item, patch_dict)
        return await self._to_out(item)

    async def delete_as_goddess(self, goddess_user: User, wishlist_id: UUID) -> None:
        """Hard-delete a wishlist item; refuses if any payment allocations reference it."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned(goddess_id, wishlist_id)

        if await self._dao.count_allocations(item.id) > 0:
            raise Conflict(
                "cannot delete a wishlist item that already has payment allocations; cancel instead"
            )

        await self._dao.delete(item)

    async def approve_as_goddess(
        self, goddess_user: User, wishlist_id: UUID
    ) -> WishlistItemOut:
        """Approve a sub-proposed wishlist item."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned(goddess_id, wishlist_id)
        if item.created_by != WishlistCreatedBy.sub:
            raise BadRequest("only sub-proposed items require approval")
        if item.approved:
            return await self._to_out(item)
        updated = await self._dao.approve(item.id)
        return await self._to_out(updated)

    async def reject_as_goddess(self, goddess_user: User, wishlist_id: UUID) -> None:
        """Hard-delete a sub-proposed item that has not yet been approved."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        item = await self._require_owned(goddess_id, wishlist_id)
        if item.created_by != WishlistCreatedBy.sub:
            raise BadRequest("only sub-proposed items can be rejected")
        if item.approved:
            raise Conflict("item is already approved; delete it instead")
        await self._dao.delete(item)

    async def list_for_sub(self, sub_user: User) -> list[WishlistItemOut]:
        """Return approved, visible wishlist items for the authenticated sub."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")
        items = await self._dao.list_open_for_sub(sub_user.id)
        return [await self._to_out(i) for i in items]

    async def propose_as_sub(
        self, sub_user: User, payload: WishlistItemProposeIn
    ) -> WishlistItemOut:
        """Propose a sub-authored wishlist item pending goddess approval."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")

        item = await self._dao.create(
            goddess_id=sub_user.goddess_id,
            sub_id=sub_user.id,
            title=payload.title,
            description=payload.description,
            image_url=payload.image_url,
            external_url=payload.external_url,
            target_amount=payload.target_amount,
            created_by=WishlistCreatedBy.sub,
            approved=False,
        )
        return await self._to_out(item)

    async def maybe_fulfil(self, wishlist_id: UUID, sub_id: UUID) -> None:
        """Flip an item to `fulfilled` and notify both parties when collected >= target.

        Idempotent: a no-op if the item is already fulfilled, not found, not `open`,
        or not yet fully funded. Called from the payment validation pipeline after
        a wishlist_goal allocation is emitted.
        """
        item = await self._dao.get_by_id(wishlist_id)
        if item is None:
            return
        if item.status != WishlistStatus.open:
            return

        collected = await self._dao.compute_collected(item.id)
        target = Decimal(str(item.target_amount))
        if collected < target:
            return

        await self._dao.mark_fulfilled(item)
        await self._emit_fulfillment_notifications(item, sub_id, collected)

    async def _emit_fulfillment_notifications(
        self, item: WishlistItem, sub_id: UUID, collected: Decimal
    ) -> None:
        goddess_user_id = await resolve_goddess_user_id(self._session, item.goddess_id)
        target = Decimal(str(item.target_amount))
        body = f"'{item.title}' reached £{target} (collected £{collected})."
        payload = {"wishlist_id": str(item.id)}

        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.wishlist_fulfilled,
                title="Wishlist item fulfilled",
                body=body,
                link="/goddess/wishlist",
                payload=payload,
            )

        await notify(
            self._session,
            sub_id,
            NotificationType.wishlist_fulfilled,
            title="Wishlist item fulfilled",
            body=body,
            link="/sub/wishlist",
            payload=payload,
        )
