from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt import DebtContract, DebtContractAudit, DebtContractStatus, DebtContractVersion


class DebtContractDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, contract: DebtContract) -> DebtContract:
        """Persist a new contract row and return it with a database-assigned id."""
        self._session.add(contract)
        await self._session.flush()
        return contract

    async def get_by_id(self, contract_id: UUID) -> DebtContract | None:
        """Return the contract with the given id, or None."""
        result = await self._session.execute(
            select(DebtContract).where(col(DebtContract.id) == contract_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> DebtContract | None:
        """Return the contract with the given slug, or None."""
        result = await self._session.execute(
            select(DebtContract).where(col(DebtContract.slug) == slug)
        )
        return result.scalar_one_or_none()

    async def list_for_sub(self, sub_id: UUID) -> list[DebtContract]:
        """Return all contracts for a sub, newest first."""
        result = await self._session.execute(
            select(DebtContract)
            .where(col(DebtContract.sub_id) == sub_id)
            .order_by(col(DebtContract.created_at).desc())
        )
        return list(result.scalars().all())

    async def list_for_goddess(self, goddess_id: UUID) -> list[DebtContract]:
        """Return all contracts owned by a goddess, newest first."""
        result = await self._session.execute(
            select(DebtContract)
            .where(col(DebtContract.goddess_id) == goddess_id)
            .order_by(col(DebtContract.created_at).desc())
        )
        return list(result.scalars().all())

    async def list_active_for_sub(self, sub_id: UUID) -> list[DebtContract]:
        """Return all active contracts for a sub, newest first."""
        result = await self._session.execute(
            select(DebtContract)
            .where(
                col(DebtContract.sub_id) == sub_id,
                col(DebtContract.status) == DebtContractStatus.active,
            )
            .order_by(col(DebtContract.created_at).desc())
        )
        return list(result.scalars().all())

    async def save(self, contract: DebtContract) -> DebtContract:
        """Flush mutations to an existing contract row and return it."""
        self._session.add(contract)
        await self._session.flush()
        return contract

    async def count_by_status(self, goddess_id: UUID, status: DebtContractStatus) -> int:
        """Return the number of contracts for this goddess with the given status."""
        result = await self._session.execute(
            select(func.count())
            .select_from(DebtContract)
            .where(
                col(DebtContract.goddess_id) == goddess_id,
                col(DebtContract.status) == status,
            )
        )
        return int(result.scalar_one() or 0)

    async def list_active_for_goddess(self, goddess_id: UUID) -> list[DebtContract]:
        """Return all active contracts for this goddess."""
        result = await self._session.execute(
            select(DebtContract).where(
                col(DebtContract.goddess_id) == goddess_id,
                col(DebtContract.status) == DebtContractStatus.active,
            )
        )
        return list(result.scalars().all())


class DebtContractVersionDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, version: DebtContractVersion) -> DebtContractVersion:
        """Persist a new version row and return it."""
        self._session.add(version)
        await self._session.flush()
        return version

    async def get_by_id(self, version_id: UUID) -> DebtContractVersion | None:
        """Return the version with the given id, or None."""
        result = await self._session.execute(
            select(DebtContractVersion).where(col(DebtContractVersion.id) == version_id)
        )
        return result.scalar_one_or_none()

    async def list_for_contract(self, contract_id: UUID) -> list[DebtContractVersion]:
        """Return all versions for a contract ordered by round_no ascending."""
        result = await self._session.execute(
            select(DebtContractVersion)
            .where(col(DebtContractVersion.contract_id) == contract_id)
            .order_by(col(DebtContractVersion.round_no).asc())
        )
        return list(result.scalars().all())


class DebtContractAuditDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def append(self, audit: DebtContractAudit) -> None:
        """Persist a new audit row."""
        self._session.add(audit)
        await self._session.flush()

    async def list_for_contract(self, contract_id: UUID) -> list[DebtContractAudit]:
        """Return all audit rows for a contract ordered by created_at ascending."""
        result = await self._session.execute(
            select(DebtContractAudit)
            .where(col(DebtContractAudit.contract_id) == contract_id)
            .order_by(col(DebtContractAudit.created_at).asc())
        )
        return list(result.scalars().all())
