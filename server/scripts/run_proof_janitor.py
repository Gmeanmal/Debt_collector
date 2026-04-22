"""Run the payment-proof janitor from the CLI — dry-run by default.

Usage:
    uv run python -m scripts.run_proof_janitor            # dry-run
    uv run python -m scripts.run_proof_janitor --apply    # real delete

Same code path as the nightly scheduled job and the `/admin/janitor/proofs`
endpoint, so the numbers it reports are authoritative.
"""

from __future__ import annotations

import argparse
import asyncio

from core.db import SessionMaker
from services.cron.proof_janitor import run_proof_janitor


async def main(*, dry_run: bool) -> None:
    async with SessionMaker() as session:
        summary = await run_proof_janitor(session, dry_run=dry_run)
    mode = "DRY-RUN" if summary.dry_run else "APPLY"
    print(f"[{mode}] scanned={summary.scanned}")
    print(f"[{mode}] referenced={summary.referenced}")
    print(f"[{mode}] orphan_candidates={summary.orphan_candidates}")
    print(f"[{mode}] within_grace={summary.within_grace}")
    label = "would_delete" if summary.dry_run else "deleted"
    print(f"[{mode}] {label}={summary.deleted}")
    if summary.batch_capped:
        print(f"[{mode}] batch_capped — rerun to continue")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete orphans. Default is dry-run.",
    )
    args = parser.parse_args()
    asyncio.run(main(dry_run=not args.apply))
