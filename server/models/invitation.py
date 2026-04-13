from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Column, Numeric, Text
from sqlmodel import Field, SQLModel


class Invitation(SQLModel, table=True):
    __tablename__ = "invitation"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    token: str = Field(unique=True, index=True)
    goddess_id: UUID = Field(foreign_key="goddess.id", index=True)
    entry_tribute_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    expires_at: datetime
    used_at: datetime | None = None
    used_by_user_id: UUID | None = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
