from models.sub_profile import OwnershipStatus

# Derived from specs.md §16.3:
#   free -> owned -> in_training -> collared  (sequential progression)
#   owned | in_training | collared -> blackmailed  (requires §22 consent)
#   any -> released  (terminal unless goddess reactivates)
# Self-transitions are forbidden. `released -> free` is the single reactivation
# path, resolving the spec's ambiguous "unless goddess reactivates" clause by
# forcing the sub to restart from `free` after a release.
ALLOWED_TRANSITIONS: dict[OwnershipStatus, set[OwnershipStatus]] = {
    OwnershipStatus.free: {OwnershipStatus.owned, OwnershipStatus.released},
    OwnershipStatus.owned: {
        OwnershipStatus.in_training,
        OwnershipStatus.blackmailed,
        OwnershipStatus.released,
    },
    OwnershipStatus.in_training: {
        OwnershipStatus.collared,
        OwnershipStatus.blackmailed,
        OwnershipStatus.released,
    },
    OwnershipStatus.collared: {
        OwnershipStatus.blackmailed,
        OwnershipStatus.released,
    },
    OwnershipStatus.blackmailed: {OwnershipStatus.released},
    OwnershipStatus.released: {OwnershipStatus.free},
}


def can_transition(from_status: OwnershipStatus, to_status: OwnershipStatus) -> bool:
    """Return True when the ownership status transition is permitted by §16.3."""
    if from_status == to_status:
        return False
    return to_status in ALLOWED_TRANSITIONS.get(from_status, set())
