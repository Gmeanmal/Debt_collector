"""Debt and Contract models."""

from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class DebtBase(SQLModel):
    title: str = Field(max_length=200)
    amount_gbp: float
    start_date: date
    end_date: Optional[date] = None
    terms: str
    ceremony_mode_enabled: bool = False


class Debt(DebtBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    goddess_id: int = Field(foreign_key="goddess.id")
    sub_id: int = Field(foreign_key="sub.id")

    status: str = Field(default="draft")  # draft, pending_signature, active, completed, breached, terminated

    # R2 PDF Storage for signed contracts
    pdf_key: Optional[str] = Field(default=None, nullable=True)
    pdf_filename: Optional[str] = Field(default=None, nullable=True)

    goddess = Relationship(back_populates="debts")
    sub = Relationship(back_populates="debts")
    signatures = Relationship(back_populates="debt")
    payments = Relationship(back_populates="debt")


class DebtCreate(DebtBase):
    pass


class DebtRead(DebtBase):
    id: int
    status: str
    created_at: datetime
    pdf_key: Optional[str] = None
    pdf_filename: Optional[str] = None
    pdf_url: Optional[str] = None  # populated by service


class DebtUpdate(SQLModel):
    title: Optional[str] = None
    amount_gbp: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    terms: Optional[str] = None
    ceremony_mode_enabled: Optional[bool] = None
    status: Optional[str] = None
