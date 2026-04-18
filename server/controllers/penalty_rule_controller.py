from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import BadRequest, Forbidden, Validation
from daos.penalty_rule_dao import PenaltyRuleDao
from daos.user_dao import UserDao
from models.penalty_rule import PenaltyRule
from models.user import User
from schemas.penalty_rule import PenaltyRuleIn, PenaltyRuleOut, PenaltyRuleUpdate


def _to_out(rule: PenaltyRule) -> PenaltyRuleOut:
    return PenaltyRuleOut.model_validate(rule)


def _validate_fee_percent(value: Decimal | None) -> None:
    if value is not None and not (Decimal("0") <= value <= Decimal("100")):
        raise Validation("fee_percent must be between 0 and 100")


class PenaltyRuleController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = PenaltyRuleDao(session)
        self._user_dao = UserDao(session)

    async def list_for_goddess(self, goddess_user: User) -> list[PenaltyRuleOut]:
        """Return every penalty rule owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        rules = await self._dao.list_for_goddess(goddess_id)
        return [_to_out(r) for r in rules]

    async def create(self, goddess_user: User, payload: PenaltyRuleIn) -> PenaltyRuleOut:
        """Create a penalty rule owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        if payload.sub_id is not None:
            await self._require_sub_under_goddess(goddess_id, payload.sub_id)
        _validate_fee_percent(payload.fee_percent)

        rule = await self._dao.create(
            goddess_id=goddess_id,
            sub_id=payload.sub_id,
            trigger=payload.trigger,
            action=payload.action,
            points_delta=payload.points_delta,
            fee_amount=payload.fee_amount,
            name=payload.name,
            fee_percent=payload.fee_percent,
            min_days_late=payload.min_days_late,
            cooldown_hours=payload.cooldown_hours,
            active=payload.active,
        )
        return _to_out(rule)

    async def update(
        self, goddess_user: User, rule_id: UUID, patch: PenaltyRuleUpdate
    ) -> PenaltyRuleOut:
        """Partially update a penalty rule owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        rule = await self._require_owned(goddess_id, rule_id)

        patch_dict: dict[str, Any] = patch.model_dump(exclude_unset=True)

        if "sub_id" in patch_dict and patch_dict["sub_id"] is not None:
            await self._require_sub_under_goddess(goddess_id, patch_dict["sub_id"])
        if "fee_percent" in patch_dict:
            _validate_fee_percent(patch_dict["fee_percent"])

        if not patch_dict:
            return _to_out(rule)

        updated = await self._dao.update(rule, patch_dict)
        return _to_out(updated)

    async def delete(self, goddess_user: User, rule_id: UUID) -> None:
        """Hard-delete a penalty rule owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        rule = await self._require_owned(goddess_id, rule_id)
        await self._dao.delete(rule)

    async def _require_owned(self, goddess_id: UUID, rule_id: UUID) -> PenaltyRule:
        rule = await self._dao.get(rule_id)
        if rule.goddess_id != goddess_id:
            raise Forbidden("penalty rule does not belong to this goddess")
        return rule

    async def _require_sub_under_goddess(self, goddess_id: UUID, sub_id: UUID) -> None:
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise BadRequest("sub not found or not linked to this goddess")
