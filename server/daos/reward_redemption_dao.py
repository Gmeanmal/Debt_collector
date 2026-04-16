from sqlalchemy.ext.asyncio import AsyncSession

from models.reward_redemption import RewardRedemption


class RewardRedemptionDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, redemption: RewardRedemption) -> RewardRedemption:
        """Persist a new redemption row and return it with its database-assigned id."""
        self._session.add(redemption)
        await self._session.flush()
        return redemption
