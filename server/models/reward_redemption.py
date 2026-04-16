import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey
from sqlmodel import Field, SQLModel


class RewardRedemption(SQLModel, table=True):
    __tablename__ = "reward_redemption"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    reward_id: UUID = Field(
        sa_column=Column(
            ForeignKey("reward_tier.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    cost_snapshot: int = Field(nullable=False)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
