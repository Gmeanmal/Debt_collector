from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Forbidden
from daos.throne_dao import ThroneDao
from models.throne_connection import ThroneConnection
from schemas.integrations import ThroneConnectionIn, ThroneConnectionOut
from services.crypto.envelope import encrypt_for_goddess

_THRONE_AAD_SUFFIX = b":throne:access_token"


def _throne_aad(goddess_id: UUID) -> bytes:
    """Build the field-bound AAD for a Throne token.

    Binding the AAD to the goddess id ensures a token ciphertext cannot be
    moved to another goddess's row without triggering InvalidTag on decrypt.
    """
    return goddess_id.bytes + _THRONE_AAD_SUFFIX


def _last4(token: str) -> str:
    return token[-4:] if len(token) >= 4 else token


def _not_configured() -> ThroneConnectionOut:
    return ThroneConnectionOut(
        is_configured=False,
        account_id=None,
        token_last4=None,
        created_at=None,
        updated_at=None,
    )


def _to_out(record: ThroneConnection) -> ThroneConnectionOut:
    return ThroneConnectionOut(
        is_configured=True,
        account_id=record.account_id,
        token_last4=record.access_token_last4,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


class IntegrationsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = ThroneDao(session)

    async def get_throne(self, goddess_id: UUID | None) -> ThroneConnectionOut:
        """Return the Throne connection status for the given goddess.

        Emits `is_configured=False` when no row exists. Never echoes the token.
        """
        if goddess_id is None:
            raise Forbidden("goddess profile not found for this user")
        record = await self._dao.get_by_goddess(goddess_id)
        if record is None:
            return _not_configured()
        return _to_out(record)

    async def upsert_throne(
        self,
        goddess_id: UUID | None,
        body: ThroneConnectionIn,
    ) -> ThroneConnectionOut:
        """Persist the posted Throne credentials for the calling goddess.

        Encrypts the access token with the per-goddess envelope, binding the
        ciphertext to the goddess id via AAD. Stores only the last 4 characters
        of the token plaintext for UI display.
        """
        if goddess_id is None:
            raise Forbidden("goddess profile not found for this user")
        token_bytes = body.access_token.encode("utf-8")
        ciphertext = await encrypt_for_goddess(
            self._session,
            goddess_id,
            token_bytes,
            _throne_aad(goddess_id),
        )
        record = await self._dao.upsert(
            goddess_id=goddess_id,
            account_id=body.account_id,
            access_token_enc=ciphertext,
            access_token_last4=_last4(body.access_token),
        )
        return _to_out(record)
