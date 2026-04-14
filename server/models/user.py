from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class UserRole(StrEnum):
    admin = "admin"
    goddess = "goddess"
    sub = "sub"


class UserStatus(StrEnum):
    pending_entry_tribute = "pending_entry_tribute"
    active = "active"
    blacklisted = "blacklisted"
    deleted = "deleted"


class Goddess(SQLModel, table=True):
    __tablename__ = "goddess"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    display_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None), nullable=False
    )


class User(SQLModel, table=True):
    __tablename__ = "user"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID | None = Field(default=None, foreign_key="goddess.id", index=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(index=True)
    status: UserStatus = Field(default=UserStatus.active, index=True)
    first_name: str | None = None
    last_name: str | None = None
    twitter_handle: str | None = None
    source_note: str | None = None
    avatar_url: str | None = None
    bio: str | None = Field(default=None, sa_column_kwargs={"nullable": True})
    theme_preference: str = Field(default="system")
    last_login_at: datetime | None = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None), nullable=False
    )


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_token"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime
    revoked_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))


class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_token"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime
    used_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
