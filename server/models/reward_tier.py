import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class RewardTier(SQLModel, table=True):
    __tablename__ = "reward_tier"
    __table_args__ = (CheckConstraint("cost > 0", name="ck_reward_tier_cost_positive"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    name: str = Field(sa_column=Column(Text, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    cost: int = Field(nullable=False)
    active: bool = Field(default=True, nullable=False)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
