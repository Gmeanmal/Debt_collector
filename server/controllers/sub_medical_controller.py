from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Conflict, Forbidden, NotFound
from daos.admin_action_dao import AdminActionDao
from daos.sub_medical_dao import SubMedicalDao
from models.sub_medical import SubMedical
from models.user import User
from schemas.sub_medical import SubMedicalRevealOut, SubMedicalSelfOut, SubMedicalUpdate
from services.crypto.envelope import decrypt_for_goddess, encrypt_for_goddess

_FIELDS = ("blood_type", "allergies", "medications", "emergency_contact", "medical_notes")


def _aad(sub_id: UUID, field: str) -> bytes:
    return f"sub_medical:{sub_id}:{field}".encode()


def _to_self_out(row: SubMedical) -> SubMedicalSelfOut:
    return SubMedicalSelfOut(
        blood_type_is_set=row.blood_type_enc is not None,
        allergies_is_set=row.allergies_enc is not None,
        medications_is_set=row.medications_enc is not None,
        emergency_contact_is_set=row.emergency_contact_enc is not None,
        medical_notes_is_set=row.medical_notes_enc is not None,
        updated_at=row.updated_at,
    )


class SubMedicalController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = SubMedicalDao(session)

    async def get_self_status(self, sub: User) -> SubMedicalSelfOut:
        """Return is-set booleans for each encrypted field, without decrypting anything."""
        row = await self._dao.get(sub.id)
        if row is None:
            return SubMedicalSelfOut(
                blood_type_is_set=False,
                allergies_is_set=False,
                medications_is_set=False,
                emergency_contact_is_set=False,
                medical_notes_is_set=False,
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            )
        return _to_self_out(row)

    async def upsert_self(self, sub: User, body: SubMedicalUpdate) -> SubMedicalSelfOut:
        """Encrypt and persist each provided field; clear fields set to null or empty string."""
        if sub.goddess_id is None:
            raise Conflict("sub has no goddess")

        encrypted: dict[str, bytes | None] = {}
        raw_fields = {
            "blood_type": body.blood_type,
            "allergies": body.allergies,
            "medications": body.medications,
            "emergency_contact": body.emergency_contact,
            "medical_notes": body.medical_notes,
        }

        for field, value in raw_fields.items():
            col = f"{field}_enc"
            if value:
                encrypted[col] = await encrypt_for_goddess(
                    self._session,
                    sub.goddess_id,
                    value.encode(),
                    _aad(sub.id, field),
                )
            else:
                encrypted[col] = None

        row = await self._dao.upsert(sub.id, sub.goddess_id, encrypted)
        return _to_self_out(row)

    async def reveal_for_goddess(self, goddess: User, sub_id: UUID) -> SubMedicalRevealOut:
        """Decrypt and return the sub's full medical record, logging the access event."""
        row = await self._dao.get(sub_id)
        if row is None:
            raise NotFound("medical record not found")

        if row.goddess_id != goddess.id:
            raise Forbidden("sub does not belong to this goddess")

        async def _decrypt(enc: bytes | None, field: str) -> str | None:
            if enc is None:
                return None
            plaintext = await decrypt_for_goddess(
                self._session,
                goddess.id,
                enc,
                _aad(sub_id, field),
            )
            return plaintext.decode()

        blood_type = await _decrypt(row.blood_type_enc, "blood_type")
        allergies = await _decrypt(row.allergies_enc, "allergies")
        medications = await _decrypt(row.medications_enc, "medications")
        emergency_contact = await _decrypt(row.emergency_contact_enc, "emergency_contact")
        medical_notes = await _decrypt(row.medical_notes_enc, "medical_notes")

        await AdminActionDao(self._session).record(
            admin_id=goddess.id,
            action="medical_reveal",
            entity="sub_medical",
            entity_id=sub_id,
            payload={"sub_id": str(sub_id)},
        )

        return SubMedicalRevealOut(
            sub_id=sub_id,
            blood_type=blood_type,
            allergies=allergies,
            medications=medications,
            emergency_contact=emergency_contact,
            medical_notes=medical_notes,
            updated_at=row.updated_at,
        )
