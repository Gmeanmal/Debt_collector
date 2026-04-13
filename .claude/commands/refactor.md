---
description: Refactor, migrate, or restructure an existing part of the codebase
---

Refactor scope: $ARGUMENTS

## Phase 1 — Assessment (DO NOT change anything)

1. Read and map everything affected by this refactor
2. Report:
   - Current state and what's wrong with it
   - All files, components, modules, or patterns involved
   - Dependencies and ripple effects (what else relies on this)
   - Risk areas where the refactor could break things

Ask me questions if the scope or target state is unclear.

## Phase 2 — Strategy

Propose how to execute the refactor:

- Ordered steps, each producing a working state (no broken intermediate)
- What changes in each step
- What to verify after each step

Wait for my validation.

## Phase 3 — Pilot

Apply the refactor on ONE small, representative scope only. Pick the area that best shows the before/after and exposes potential side effects.

1. Apply the changes on that scope
2. Run all quality checks (lint, type-check, tests)
3. Report what changed, what it looks like now, and what broke (if anything)

This is for me to review and test manually. Wait for my feedback.

## Phase 4 — Rollout

Once I validate the pilot, apply the same pattern to the remaining scope.
For each step:

1. Apply the changes
2. Run all quality checks
3. Verify nothing is broken
4. Report what was done
5. Wait for my go before next step

If the refactor reveals deeper issues worth addressing, flag them but don't fix them unless I say so.
