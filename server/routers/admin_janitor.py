"""Admin-triggered maintenance janitors.

Companion to the daily scheduled jobs in `workers/daily_cron.py`. Exposes the
proof-orphan cleanup behind a dry-run / apply pair so an admin can preview
deletions before committing them.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from daos.admin_action_dao import AdminActionDao
from dependencies.auth import require_role
from models.user import User, UserRole
from services.cron.proof_janitor import JanitorSummary, run_proof_janitor

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — admin role required"}

router = APIRouter(tags=["admin-janitor"])


class ProofJanitorIn(BaseModel):
    dry_run: bool = Field(
        default=True,
        description="When true, scan-only — no S3 deletes, no DB writes.",
        examples=[True],
    )


class ProofJanitorOut(BaseModel):
    scanned: int = Field(..., description="Total keys seen in the bucket", examples=[142])
    referenced: int = Field(
        ...,
        description="Number of distinct keys currently referenced by a payment_declaration row",
        examples=[137],
    )
    orphan_candidates: int = Field(
        ...,
        description="Keys not referenced by any declaration",
        examples=[5],
    )
    within_grace: int = Field(
        ...,
        description="Orphans newer than proof_janitor_grace_hours — left alone",
        examples=[2],
    )
    deleted: int = Field(
        ...,
        description=(
            "For real runs: keys actually deleted. For dry-runs: how many WOULD be deleted."
        ),
        examples=[3],
    )
    dry_run: bool = Field(..., description="Echoes the input flag")
    batch_capped: bool = Field(
        ...,
        description="True if the run hit proof_janitor_batch_cap and stopped before finishing",
        examples=[False],
    )


def _to_out(summary: JanitorSummary) -> ProofJanitorOut:
    return ProofJanitorOut(
        scanned=summary.scanned,
        referenced=summary.referenced,
        orphan_candidates=summary.orphan_candidates,
        within_grace=summary.within_grace,
        deleted=summary.deleted,
        dry_run=summary.dry_run,
        batch_capped=summary.batch_capped,
    )


@router.post(
    "/admin/janitor/proofs",
    summary="Scan the payment-proofs bucket for orphans (preview or apply)",
    description=(
        "Lists every object in the `payment-proofs` S3 bucket and compares against "
        "`payment_declaration.proof_key`. Objects not referenced by any declaration and "
        "older than the configured grace window are orphan candidates.\n\n"
        "- `dry_run=true` (default): scan only, no deletes. The `deleted` counter reports "
        "how many keys would be removed.\n"
        "- `dry_run=false`: deletes orphans outside the grace window, capped at "
        "`proof_janitor_batch_cap` per invocation.\n\n"
        "A matching `admin_action` row is written for the audit trail. Admin only."
    ),
    response_model=ProofJanitorOut,
    status_code=200,
    tags=["admin-janitor"],
    responses={401: _E401, 403: _E403},
)
async def run_proofs_janitor(
    body: ProofJanitorIn,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_role(UserRole.admin)),
) -> ProofJanitorOut:
    summary = await run_proof_janitor(session, dry_run=body.dry_run)
    kind = "proof_janitor_dry_run" if body.dry_run else "proof_janitor_apply"
    await AdminActionDao(session).record(
        admin_id=admin.id,
        action=kind,
        entity="bucket",
        entity_id=None,
        payload={
            "scanned": summary.scanned,
            "orphan_candidates": summary.orphan_candidates,
            "within_grace": summary.within_grace,
            "deleted": summary.deleted,
            "batch_capped": summary.batch_capped,
        },
    )
    await session.commit()
    return _to_out(summary)
