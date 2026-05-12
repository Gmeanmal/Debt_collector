"""Debt / Contract routers."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import Session, select

from ..core.config import get_settings
from ..db.session import get_db
from ..dependencies import get_current_goddess
from ..models.debt import Debt
from ..schemas.debt import DebtRead, DebtCreate
from ..services.r2_service import get_r2_service, R2Service

router = APIRouter(prefix="/debts", tags=["debts"])


@router.post("/", response_model=DebtRead)
def create_debt(
    debt_in: DebtCreate,
    db: Session = Depends(get_db),
    current_goddess = Depends(get_current_goddess)
):
    debt = Debt.model_validate(debt_in)
    debt.goddess_id = current_goddess.id
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.get("/{debt_id}", response_model=DebtRead)
def get_debt(
    debt_id: int,
    db: Session = Depends(get_db),
    current_goddess = Depends(get_current_goddess)
):
    debt = db.exec(select(Debt).where(Debt.id == debt_id)).first()
    if not debt or debt.goddess_id != current_goddess.id:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt


# ====================== R2 SIGNED CONTRACT UPLOAD ======================
@router.post("/{debt_id}/sign", response_model=DebtRead)
async def sign_contract_with_pdf(
    debt_id: int,
    pdf_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_goddess = Depends(get_current_goddess),
    r2: R2Service = Depends(get_r2_service)
):
    """Sign contract and store PDF in Cloudflare R2."""
    debt = db.exec(select(Debt).where(Debt.id == debt_id)).first()
    if not debt or debt.goddess_id != current_goddess.id:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not pdf_file.filename or not pdf_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    pdf_bytes = await pdf_file.read()

    # Upload to R2
    key = r2.upload_contract(debt.id, pdf_bytes, pdf_file.filename)

    # Update record
    debt.pdf_key = key
    debt.pdf_filename = pdf_file.filename
    debt.status = "active"
    db.add(debt)
    db.commit()
    db.refresh(debt)

    debt.pdf_url = r2.get_presigned_url(key)
    return debt


@router.get("/{debt_id}/download")
def get_contract_download_url(
    debt_id: int,
    db: Session = Depends(get_db),
    current_goddess = Depends(get_current_goddess),
    r2: R2Service = Depends(get_r2_service)
):
    """Get temporary download link for signed contract."""
    debt = db.exec(select(Debt).where(Debt.id == debt_id)).first()
    if not debt or debt.goddess_id != current_goddess.id or not debt.pdf_key:
        raise HTTPException(status_code=404, detail="Signed contract not found")

    url = r2.get_presigned_url(debt.pdf_key)
    return {"download_url": url}
