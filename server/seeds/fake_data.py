"""Realistic fake data seed. Populated incrementally as models land in each phase.

Current coverage: (none — wait for Phase 2 onwards)
"""
from __future__ import annotations


async def seed_fake_data() -> None:
    """Populate the DB with realistic dev data.

    Each phase adds its own section to this function as it ships new models.
    Phase 1: stub only.
    """
    # TODO(phase-2): add users, goddess link, admin seed extras
    # TODO(phase-3): add invitations + entry tributes
    # TODO(phase-4): add payment methods + declarations
    # TODO(phase-5): add rollings (active, paused, late)
    # TODO(phase-6): add debt contracts in every state
    # TODO(phase-7): add a signed contract with PDF URL
    # TODO(phase-8): add debt events + blacklist entries
    # TODO(phase-9): add notifications (read + unread)
    print("seed_fake_data: stub (phase 1) — models not yet available")
