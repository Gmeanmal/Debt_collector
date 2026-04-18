import secrets as _secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.config import get_settings
from core.exceptions import Conflict, Forbidden, NotFound
from core.security import create_access_token, create_refresh_token, hash_password
from daos.invitation_dao import InvitationDao
from daos.sub_profile_dao import SubProfileDao
from daos.token_dao import TokenDao
from daos.user_dao import UserDao
from models.invitation import Invitation
from models.user import Goddess, User, UserRole, UserStatus
from schemas.auth import TokenPair
from schemas.invitation import (
    InvitationCreate,
    InvitationOut,
    InvitationPreviewOut,
    InvitationStatus,
    PublicInvitationOut,
    SignupRequest,
)
from services.email.base import EmailService
from services.email.render import render_template

_settings = get_settings()


_INVITE_EMAIL_SUBJECT = "You have been invited"


def _build_url(token: str) -> str:
    return f"{_settings.public_base_url}/invite/{token}"


def _derive_status(
    invitation: Invitation, linked_user_status: UserStatus | None
) -> InvitationStatus:
    now = datetime.now(UTC).replace(tzinfo=None)
    if invitation.used_at is None:
        return InvitationStatus.active if invitation.expires_at > now else InvitationStatus.expired
    if linked_user_status == UserStatus.pending_entry_tribute:
        return InvitationStatus.pending_entry_tribute_paid
    return InvitationStatus.consumed


def _invitation_out(invitation: Invitation, linked_user_status: UserStatus | None) -> InvitationOut:
    return InvitationOut(
        id=invitation.id,
        token=invitation.token,
        url=_build_url(invitation.token),
        entry_tribute_amount=invitation.entry_tribute_amount,
        note=invitation.note,
        expires_at=invitation.expires_at,
        used_at=invitation.used_at,
        created_at=invitation.created_at,
        status=_derive_status(invitation, linked_user_status),
    )


class InvitationController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = InvitationDao(session)
        self._users = UserDao(session)
        self._sub_profiles = SubProfileDao(session)

    async def _get_goddess_profile(self, user_id: UUID) -> Goddess:
        result = await self._session.execute(
            select(Goddess)
            .join(User, col(User.goddess_id) == col(Goddess.id))
            .where(col(User.id) == user_id)
        )
        goddess = result.scalar_one_or_none()
        if goddess is None:
            raise Forbidden("goddess profile not found for this user")
        return goddess

    async def create(self, goddess_user_id: UUID, payload: InvitationCreate) -> InvitationOut:
        goddess = await self._get_goddess_profile(goddess_user_id)
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(
            days=payload.expires_in_days
        )
        token = _secrets.token_urlsafe(32)
        invitation = await self._dao.create(
            goddess_id=goddess.id,
            amount=payload.entry_tribute_amount,
            note=payload.note,
            expires_at=expires_at,
            token=token,
        )
        return _invitation_out(invitation, None)

    async def get_public(self, token: str) -> PublicInvitationOut:
        row = await self._dao.get_by_token(token)
        if row is None:
            raise NotFound("invitation not found")
        invitation, goddess = row
        now = datetime.now(UTC).replace(tzinfo=None)
        if invitation.expires_at < now:
            raise Conflict("invitation has expired")
        if invitation.used_at is not None:
            raise Conflict("invitation has already been used")
        return PublicInvitationOut(
            token=invitation.token,
            goddess_display_name=goddess.display_name,
            note=invitation.note,
            entry_tribute_amount=invitation.entry_tribute_amount,
            expires_at=invitation.expires_at,
        )

    async def consume(self, token: str, signup: SignupRequest) -> TokenPair:
        row = await self._dao.get_by_token(token)
        if row is None:
            raise NotFound("invitation not found")
        invitation, goddess = row

        now = datetime.now(UTC).replace(tzinfo=None)
        if invitation.expires_at < now:
            raise Conflict("invitation has expired")
        if invitation.used_at is not None:
            raise Conflict("invitation has already been used")

        existing_email = await self._users.get_by_email(signup.email)
        if existing_email is not None:
            raise Conflict("email already registered")

        existing_username = await self._users.get_by_username(signup.username)
        if existing_username is not None:
            raise Conflict("username already taken")

        user = User(
            goddess_id=goddess.id,
            username=signup.username,
            email=signup.email,
            password_hash=hash_password(signup.password),
            role=UserRole.sub,
            status=UserStatus.pending_entry_tribute,
            first_name=signup.first_name,
            last_name=signup.last_name,
            gender=signup.gender,
            pronouns=signup.pronouns,
            location=signup.location,
            timezone=signup.timezone,
            date_of_birth=signup.date_of_birth,
            real_name=signup.real_name,
        )
        self._session.add(user)
        await self._session.flush()

        profile = await self._sub_profiles.create_default_row(user.id)
        if signup.gender_id is not None:
            profile.gender_id = signup.gender_id

        await self._dao.consume(invitation, user.id, now)

        token_dao = TokenDao(
            self._session,
            refresh_ttl_days=_settings.jwt_refresh_ttl_days,
            reset_ttl_minutes=_settings.password_reset_ttl_minutes,
        )
        raw_refresh, _ = create_refresh_token()
        await token_dao.create_refresh_token(user.id, raw_refresh, None, None)

        access = create_access_token(str(user.id), user.role)
        return TokenPair(
            access_token=access,
            refresh_token=raw_refresh,
            expires_in=_settings.jwt_access_ttl_minutes * 60,
        )

    async def list_for_goddess(self, goddess_user_id: UUID) -> list[InvitationOut]:
        goddess = await self._get_goddess_profile(goddess_user_id)
        invitations = await self._dao.list_by_goddess(goddess.id)

        used_by_ids = [
            inv.used_by_user_id for inv in invitations if inv.used_by_user_id is not None
        ]
        users_by_id = await self._users.get_many_by_ids(used_by_ids)

        def _linked_status(inv: Invitation) -> UserStatus | None:
            uid = inv.used_by_user_id
            if uid is None:
                return None
            linked = users_by_id.get(uid)
            return linked.status if linked is not None else None

        return [_invitation_out(inv, _linked_status(inv)) for inv in invitations]

    async def resend(
        self,
        goddess_user_id: UUID,
        invitation_id: UUID,
        recipient_email: str,
        email_service: EmailService,
    ) -> None:
        """Resend the invitation email to the given address.

        Raises NotFound if the invitation does not belong to the calling goddess.
        Raises Conflict if the invitation is not in active status.
        """
        goddess = await self._get_goddess_profile(goddess_user_id)
        invitation = await self._dao.get_by_id_for_goddess(invitation_id, goddess.id)
        if invitation is None:
            raise NotFound("invitation not found")

        status = _derive_status(invitation, None)
        if status != InvitationStatus.active:
            raise Conflict(f"invitation is not active (current status: {status.value})")

        html = render_template(
            "invite.html",
            goddess_name=goddess.display_name,
            invite_url=_build_url(invitation.token),
        )
        await email_service.send(
            to=recipient_email,
            subject=_INVITE_EMAIL_SUBJECT,
            html=html,
        )

    async def preview(self, goddess_user_id: UUID, invitation_id: UUID) -> InvitationPreviewOut:
        """Return the rendered HTML of the invitation email without sending it.

        Raises NotFound if the invitation does not belong to the calling goddess.
        """
        goddess = await self._get_goddess_profile(goddess_user_id)
        invitation = await self._dao.get_by_id_for_goddess(invitation_id, goddess.id)
        if invitation is None:
            raise NotFound("invitation not found")

        html = render_template(
            "invite.html",
            goddess_name=goddess.display_name,
            invite_url=_build_url(invitation.token),
        )
        return InvitationPreviewOut(subject=_INVITE_EMAIL_SUBJECT, html=html)
