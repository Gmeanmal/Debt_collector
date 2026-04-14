from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.admin_action import AdminAction


class AdminActionDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def record(
        self,
        admin_id: UUID,
        action: str,
        *,
        acting_as_user_id: UUID | None = None,
        entity: str | None = None,
        entity_id: UUID | None = None,
        payload: dict[str, Any] | None = None,
    ) -> AdminAction:
        row = AdminAction(
            admin_id=admin_id,
            acting_as_user_id=acting_as_user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            payload_json=payload,
        )
        self._session.add(row)
        await self._session.flush()
        return row
