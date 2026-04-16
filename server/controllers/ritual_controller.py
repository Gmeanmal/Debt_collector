import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Conflict, Forbidden, NotFound
from daos.ritual_dao import RitualDao
from daos.ritual_occurrence_dao import RitualOccurrenceDao
from daos.user_dao import UserDao
from models.ritual import Ritual
from models.ritual_occurrence import OccurrenceStatus, RitualOccurrence
from models.user import User, UserRole
from schemas.rituals import (
    OccurrenceCompleteIn,
    OccurrenceOut,
    OccurrenceRejectIn,
    OccurrenceSubmitIn,
    RitualCreateIn,
    RitualOut,
    RitualUpdateIn,
)

_LONDON = ZoneInfo("Europe/London")

# Allowed origin statuses for each transition.
_COMPLETE_FROM: frozenset[OccurrenceStatus] = frozenset({OccurrenceStatus.pending})
_SUBMIT_FROM: frozenset[OccurrenceStatus] = frozenset({OccurrenceStatus.pending})
_APPROVE_FROM: frozenset[OccurrenceStatus] = frozenset({OccurrenceStatus.submitted})
_REJECT_FROM: frozenset[OccurrenceStatus] = frozenset({OccurrenceStatus.submitted})


def _ritual_to_out(ritual: Ritual) -> RitualOut:
    return RitualOut.model_validate(ritual)


def _occurrence_to_out(occ: RitualOccurrence) -> OccurrenceOut:
    return OccurrenceOut.model_validate(occ)


class RitualController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._ritual_dao = RitualDao(session)
        self._occurrence_dao = RitualOccurrenceDao(session)
        self._user_dao = UserDao(session)

    # ------------------------------------------------------------------
    # Goddess — ritual CRUD
    # ------------------------------------------------------------------

    async def create_ritual(
        self, goddess_user: User, sub_id: UUID, payload: RitualCreateIn
    ) -> RitualOut:
        """Create a new ritual for the given sub on behalf of the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_sub_under_goddess(goddess_id, sub_id)
        ritual = Ritual(
            sub_id=sub_id,
            goddess_id=goddess_id,
            title=payload.title,
            description=payload.description,
            frequency=payload.frequency,
            custom_days_bitmask=payload.custom_days_bitmask,
            deadline_time=payload.deadline_time,
            points_on_complete=payload.points_on_complete,
            points_on_miss=payload.points_on_miss,
            paused=payload.paused,
        )
        created = await self._ritual_dao.create(ritual)
        return _ritual_to_out(created)

    async def list_rituals_for_sub(self, goddess_user: User, sub_id: UUID) -> list[RitualOut]:
        """Return all rituals (including paused) for one of the caller's subs."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_sub_under_goddess(goddess_id, sub_id)
        rituals = await self._ritual_dao.list_by_sub(sub_id)
        return [_ritual_to_out(r) for r in rituals]

    async def update_ritual(
        self, goddess_user: User, ritual_id: UUID, patch: RitualUpdateIn
    ) -> RitualOut:
        """Partially update a ritual owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        ritual = await self._require_owned_ritual(goddess_id, ritual_id)
        fields = patch.model_dump(exclude_unset=True)
        if not fields:
            return _ritual_to_out(ritual)
        updated = await self._ritual_dao.update(ritual, **fields)
        return _ritual_to_out(updated)

    async def delete_ritual(self, goddess_user: User, ritual_id: UUID) -> None:
        """Hard-delete a ritual and cascade-delete its occurrences."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_owned_ritual(goddess_id, ritual_id)
        await self._ritual_dao.delete(ritual_id)

    # ------------------------------------------------------------------
    # Goddess — occurrence review
    # ------------------------------------------------------------------

    async def approve_occurrence(self, goddess_user: User, occurrence_id: UUID) -> OccurrenceOut:
        """Approve a submitted occurrence, transitioning it to completed."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        occ = await self._require_owned_occurrence(goddess_id, occurrence_id)
        if occ.status not in _APPROVE_FROM:
            raise Conflict(
                f"cannot approve occurrence in status '{occ.status}'; "
                f"must be one of: {[s.value for s in _APPROVE_FROM]}"
            )
        updated = await self._occurrence_dao.mark_reviewed(
            occurrence_id,
            status=OccurrenceStatus.completed,
            reviewer_id=goddess_user.id,
        )
        return _occurrence_to_out(updated)

    async def reject_occurrence(
        self, goddess_user: User, occurrence_id: UUID, body: OccurrenceRejectIn
    ) -> OccurrenceOut:
        """Reject a submitted occurrence."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        occ = await self._require_owned_occurrence(goddess_id, occurrence_id)
        if occ.status not in _REJECT_FROM:
            raise Conflict(
                f"cannot reject occurrence in status '{occ.status}'; "
                f"must be one of: {[s.value for s in _REJECT_FROM]}"
            )
        updated = await self._occurrence_dao.mark_reviewed(
            occurrence_id,
            status=OccurrenceStatus.rejected,
            reviewer_id=goddess_user.id,
        )
        return _occurrence_to_out(updated)

    # ------------------------------------------------------------------
    # Sub — own rituals
    # ------------------------------------------------------------------

    async def list_own_rituals(self, sub_user: User) -> list[RitualOut]:
        """Return non-paused rituals for the authenticated sub."""
        rituals = await self._ritual_dao.list_by_sub(sub_user.id)
        return [_ritual_to_out(r) for r in rituals if not r.paused]

    async def list_today_occurrences(self, sub_user: User) -> list[OccurrenceOut]:
        """Return today's ritual occurrences for the authenticated sub (Europe/London date)."""
        today = datetime.datetime.now(_LONDON).date()
        occurrences = await self._occurrence_dao.list_today_for_sub(sub_user.id, today)
        return [_occurrence_to_out(o) for o in occurrences]

    async def complete_occurrence(
        self, sub_user: User, occurrence_id: UUID, body: OccurrenceCompleteIn
    ) -> OccurrenceOut:
        """Transition a pending occurrence to completed (sub self-completes)."""
        occ = await self._require_owned_occurrence_for_sub(sub_user.id, occurrence_id)
        if occ.status not in _COMPLETE_FROM:
            raise Conflict(
                f"cannot complete occurrence in status '{occ.status}'; "
                f"must be one of: {[s.value for s in _COMPLETE_FROM]}"
            )
        completed_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        updated = await self._occurrence_dao.mark_completed(
            occurrence_id,
            completed_at=completed_at,
            note=body.note,
            evidence_r2_key=body.evidence_r2_key,
        )
        return _occurrence_to_out(updated)

    async def submit_occurrence(
        self, sub_user: User, occurrence_id: UUID, body: OccurrenceSubmitIn
    ) -> OccurrenceOut:
        """Transition a pending occurrence to submitted (awaiting goddess review)."""
        occ = await self._require_owned_occurrence_for_sub(sub_user.id, occurrence_id)
        if occ.status not in _SUBMIT_FROM:
            raise Conflict(
                f"cannot submit occurrence in status '{occ.status}'; "
                f"must be one of: {[s.value for s in _SUBMIT_FROM]}"
            )
        updated = await self._occurrence_dao.mark_submitted(
            occurrence_id,
            note=body.note,
            evidence_r2_key=body.evidence_r2_key,
        )
        return _occurrence_to_out(updated)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _require_sub_under_goddess(self, goddess_id: UUID, sub_id: UUID) -> User:
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        return sub

    async def _require_owned_ritual(self, goddess_id: UUID, ritual_id: UUID) -> Ritual:
        ritual = await self._ritual_dao.get_by_id(ritual_id)
        if ritual.goddess_id != goddess_id:
            raise Forbidden("ritual does not belong to this goddess")
        return ritual

    async def _require_owned_occurrence(
        self, goddess_id: UUID, occurrence_id: UUID
    ) -> RitualOccurrence:
        occ = await self._occurrence_dao.get_by_id(occurrence_id)
        if occ.goddess_id != goddess_id:
            raise Forbidden("occurrence does not belong to this goddess")
        return occ

    async def _require_owned_occurrence_for_sub(
        self, sub_id: UUID, occurrence_id: UUID
    ) -> RitualOccurrence:
        occ = await self._occurrence_dao.get_by_id(occurrence_id)
        if occ.sub_id != sub_id:
            raise Forbidden("occurrence does not belong to this sub")
        return occ
