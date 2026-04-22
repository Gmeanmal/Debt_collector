"""Orphan payment-proof cleanup.

A payment declaration uploads its proof to the object store *before* the
``payment_declaration`` row is inserted. If the DB write fails (or a future
rollback undoes it), the MinIO / S3 object is orphaned: no row references it,
but it still sits in the bucket.

The janitor compares every key under the ``payment-proofs`` bucket against
``payment_declaration.proof_key`` values and deletes orphans older than the
configured grace window (default 24 h, so a freshly-uploaded object that is
still mid-transaction is never touched).

Runs in dry-run mode too — the admin cron page exposes a preview.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from daos.payment_dao import PaymentDeclarationDao
from services.storage import object_store

log = structlog.get_logger()


@dataclass(frozen=True)
class JanitorSummary:
    scanned: int
    referenced: int
    orphan_candidates: int
    within_grace: int
    deleted: int
    dry_run: bool
    batch_capped: bool


async def run_proof_janitor(
    session: AsyncSession,
    *,
    dry_run: bool = False,
    now: dt.datetime | None = None,
    settings: Settings | None = None,
) -> JanitorSummary:
    """Scan the payment-proofs bucket and delete orphans past the grace window."""
    cfg = settings or get_settings()
    current = now or dt.datetime.now(dt.UTC).replace(tzinfo=None)
    cutoff = current - dt.timedelta(hours=cfg.proof_janitor_grace_hours)
    cap = cfg.proof_janitor_batch_cap

    referenced = await PaymentDeclarationDao(session).all_proof_keys()

    scanned = 0
    orphan_candidates = 0
    within_grace = 0
    deleted = 0
    batch_capped = False
    to_delete: list[str] = []

    async for key, last_modified in object_store.list_objects(
        cfg.s3_bucket_payment_proofs, settings=cfg
    ):
        scanned += 1
        if key in referenced:
            continue
        orphan_candidates += 1
        if last_modified > cutoff:
            within_grace += 1
            continue
        to_delete.append(key)
        if len(to_delete) >= cap:
            batch_capped = True
            break

    if not dry_run:
        for key in to_delete:
            await object_store.delete_object(
                cfg.s3_bucket_payment_proofs, key, settings=cfg
            )
            deleted += 1

    log.info(
        "proof_janitor_done",
        scanned=scanned,
        referenced=len(referenced),
        orphan_candidates=orphan_candidates,
        within_grace=within_grace,
        deleted=deleted,
        dry_run=dry_run,
        batch_capped=batch_capped,
    )

    return JanitorSummary(
        scanned=scanned,
        referenced=len(referenced),
        orphan_candidates=orphan_candidates,
        within_grace=within_grace,
        deleted=deleted if not dry_run else len(to_delete),
        dry_run=dry_run,
        batch_capped=batch_capped,
    )
