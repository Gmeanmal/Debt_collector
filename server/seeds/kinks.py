"""Idempotent seed for the global kink taxonomy (categories + items).

All items are global (goddess_id=None). Re-running this seed is safe — existing
rows are updated in place via slug lookup.
"""

from __future__ import annotations

from typing import TypedDict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from daos.kink_category_dao import KinkCategoryDao
from daos.kink_item_dao import KinkItemDao

log = structlog.get_logger()


class _CategorySpec(TypedDict):
    slug: str
    label: str
    safety_flag: bool
    sort_order: int


class _ItemSpec(TypedDict):
    category: str
    slug: str
    label: str
    description: str | None
    safety_flag: bool


_CATEGORIES: list[_CategorySpec] = [
    {
        "slug": "bondage_restraints",
        "label": "Bondage & Restraints",
        "safety_flag": False,
        "sort_order": 0,
    },
    {"slug": "impact_play", "label": "Impact Play", "safety_flag": False, "sort_order": 1},
    {
        "slug": "sensory_sensation",
        "label": "Sensory & Sensation",
        "safety_flag": False,
        "sort_order": 2,
    },
    {
        "slug": "humiliation_degradation",
        "label": "Humiliation & Degradation",
        "safety_flag": False,
        "sort_order": 3,
    },
    {
        "slug": "service_worship",
        "label": "Service & Worship",
        "safety_flag": False,
        "sort_order": 4,
    },
    {"slug": "pain_endurance", "label": "Pain & Endurance", "safety_flag": True, "sort_order": 5},
    {"slug": "psychological", "label": "Psychological", "safety_flag": False, "sort_order": 6},
    {
        "slug": "roleplay_dynamics",
        "label": "Roleplay & Dynamics",
        "safety_flag": False,
        "sort_order": 7,
    },
]

_ITEMS: list[_ItemSpec] = [
    # bondage_restraints
    {
        "category": "bondage_restraints",
        "slug": "rope",
        "label": "Rope Bondage",
        "description": "Shibari / western rope ties",
        "safety_flag": False,
    },
    {
        "category": "bondage_restraints",
        "slug": "cuffs",
        "label": "Cuffs",
        "description": "Wrist or ankle cuffs",
        "safety_flag": False,
    },
    {
        "category": "bondage_restraints",
        "slug": "mummification",
        "label": "Mummification",
        "description": "Full-body wrap restraint",
        "safety_flag": False,
    },
    {
        "category": "bondage_restraints",
        "slug": "suspension",
        "label": "Suspension",
        "description": "Partial or full suspension bondage",
        "safety_flag": False,
    },
    {
        "category": "bondage_restraints",
        "slug": "hogtie",
        "label": "Hogtie",
        "description": "Wrists and ankles bound behind the back",
        "safety_flag": False,
    },
    # impact_play
    {
        "category": "impact_play",
        "slug": "spanking",
        "label": "Spanking",
        "description": None,
        "safety_flag": False,
    },
    {
        "category": "impact_play",
        "slug": "caning",
        "label": "Caning",
        "description": "Cane strikes",
        "safety_flag": False,
    },
    {
        "category": "impact_play",
        "slug": "flogging",
        "label": "Flogging",
        "description": "Flogger — suede, leather, or rubber",
        "safety_flag": False,
    },
    {
        "category": "impact_play",
        "slug": "whipping",
        "label": "Whipping",
        "description": "Single-tail or signal whip",
        "safety_flag": False,
    },
    {
        "category": "impact_play",
        "slug": "paddle",
        "label": "Paddling",
        "description": "Wooden or leather paddle strikes",
        "safety_flag": False,
    },
    {
        "category": "impact_play",
        "slug": "belt",
        "label": "Belt",
        "description": "Belt or strap strokes",
        "safety_flag": False,
    },
    # sensory_sensation
    {
        "category": "sensory_sensation",
        "slug": "wax",
        "label": "Wax Play",
        "description": "Dripping hot wax on skin",
        "safety_flag": False,
    },
    {
        "category": "sensory_sensation",
        "slug": "ice",
        "label": "Ice Play",
        "description": "Ice cube temperature contrast",
        "safety_flag": False,
    },
    {
        "category": "sensory_sensation",
        "slug": "electro",
        "label": "Electrostimulation",
        "description": "TENS units or violet wands",
        "safety_flag": False,
    },
    {
        "category": "sensory_sensation",
        "slug": "blindfolds",
        "label": "Blindfolds",
        "description": "Sensory deprivation via blindfold",
        "safety_flag": False,
    },
    {
        "category": "sensory_sensation",
        "slug": "gags",
        "label": "Gags",
        "description": "Ball gag, bit gag, or tape",
        "safety_flag": False,
    },
    {
        "category": "sensory_sensation",
        "slug": "temperature",
        "label": "Temperature Play",
        "description": "General hot/cold sensation play",
        "safety_flag": False,
    },
    # humiliation_degradation
    {
        "category": "humiliation_degradation",
        "slug": "verbal",
        "label": "Verbal Humiliation",
        "description": "Name-calling, verbal degradation",
        "safety_flag": False,
    },
    {
        "category": "humiliation_degradation",
        "slug": "public",
        "label": "Public Humiliation",
        "description": "Degradation in witnessed settings",
        "safety_flag": False,
    },
    {
        "category": "humiliation_degradation",
        "slug": "forced_feminization",
        "label": "Forced Feminisation",
        "description": "Feminine attire on command",
        "safety_flag": False,
    },
    {
        "category": "humiliation_degradation",
        "slug": "exposure",
        "label": "Exposure Play",
        "description": "Nudity under instruction",
        "safety_flag": False,
    },
    {
        "category": "humiliation_degradation",
        "slug": "inspection",
        "label": "Inspection",
        "description": "Body inspection and critique",
        "safety_flag": False,
    },
    # service_worship
    {
        "category": "service_worship",
        "slug": "foot",
        "label": "Foot Worship",
        "description": "Kissing, licking, massaging feet",
        "safety_flag": False,
    },
    {
        "category": "service_worship",
        "slug": "body",
        "label": "Body Worship",
        "description": "Worship of body parts as directed",
        "safety_flag": False,
    },
    {
        "category": "service_worship",
        "slug": "domestic",
        "label": "Domestic Service",
        "description": "Cleaning, cooking, errands as tribute",
        "safety_flag": False,
    },
    {
        "category": "service_worship",
        "slug": "financial",
        "label": "Financial Service",
        "description": "Tributes, gifts, financial control",
        "safety_flag": False,
    },
    {
        "category": "service_worship",
        "slug": "objectification",
        "label": "Objectification",
        "description": "Used as furniture or an object",
        "safety_flag": False,
    },
    # pain_endurance — all items are safety_flag=True (category is also flagged)
    {
        "category": "pain_endurance",
        "slug": "nipple_torture",
        "label": "Nipple Torture",
        "description": "Clamps, twisting, pinching",
        "safety_flag": True,
    },
    {
        "category": "pain_endurance",
        "slug": "cbt",
        "label": "CBT",
        "description": "Cock-and-ball torture",
        "safety_flag": True,
    },
    {
        "category": "pain_endurance",
        "slug": "breath_play",
        "label": "Breath Play",
        "description": "Controlled breathing restriction",
        "safety_flag": True,
    },
    {
        "category": "pain_endurance",
        "slug": "needle_play",
        "label": "Needle Play",
        "description": "Sterile needles for piercing sensation",
        "safety_flag": True,
    },
    {
        "category": "pain_endurance",
        "slug": "fire_play",
        "label": "Fire Play",
        "description": "Controlled flame; safety training required",
        "safety_flag": True,
    },
    # psychological
    {
        "category": "psychological",
        "slug": "mindfuck",
        "label": "Mindfuck",
        "description": "Psychological games and misdirection",
        "safety_flag": False,
    },
    {
        "category": "psychological",
        "slug": "fear",
        "label": "Fear Play",
        "description": "Controlled fear-invoking scenarios",
        "safety_flag": False,
    },
    {
        "category": "psychological",
        "slug": "blackmail_fantasy",
        "label": "Blackmail Fantasy",
        "description": "Consensual mock-blackmail roleplay",
        "safety_flag": False,
    },
    {
        "category": "psychological",
        "slug": "denial",
        "label": "Orgasm Denial",
        "description": "Chastity and orgasm control",
        "safety_flag": False,
    },
    {
        "category": "psychological",
        "slug": "gaslighting_play",
        "label": "Gaslighting Play",
        "description": "Reality questioning as a scene element",
        "safety_flag": False,
    },
    {
        "category": "psychological",
        "slug": "brainwashing",
        "label": "Conditioning",
        "description": "Repetitive commands to shape behaviour",
        "safety_flag": False,
    },
    # roleplay_dynamics
    {
        "category": "roleplay_dynamics",
        "slug": "pet",
        "label": "Pet Play",
        "description": "Kitten, puppy, pony persona scenes",
        "safety_flag": False,
    },
    {
        "category": "roleplay_dynamics",
        "slug": "slave",
        "label": "Total Power Exchange",
        "description": "M/s dynamic, scene or 24/7",
        "safety_flag": False,
    },
    {
        "category": "roleplay_dynamics",
        "slug": "sissy",
        "label": "Sissy Training",
        "description": "Feminisation within D/s dynamic",
        "safety_flag": False,
    },
    {
        "category": "roleplay_dynamics",
        "slug": "cuck",
        "label": "Cuckolding",
        "description": "Humiliation via real or fantasy scenario",
        "safety_flag": False,
    },
    {
        "category": "roleplay_dynamics",
        "slug": "object",
        "label": "Object Play",
        "description": "Human furniture, footrest, ashtray",
        "safety_flag": False,
    },
    {
        "category": "roleplay_dynamics",
        "slug": "daddy_mommy",
        "label": "Daddy/Mommy Dom",
        "description": "Caregiver / little dynamic",
        "safety_flag": False,
    },
]


async def seed_kinks(session: AsyncSession) -> None:
    """Seed the global kink taxonomy. Idempotent — safe to call on every `make init-dbs`."""
    category_dao = KinkCategoryDao(session)
    item_dao = KinkItemDao(session)

    category_map: dict[str, object] = {}
    for spec in _CATEGORIES:
        cat = await category_dao.upsert_by_slug(
            slug=spec["slug"],
            label=spec["label"],
            safety_flag=spec["safety_flag"],
            sort_order=spec["sort_order"],
        )
        category_map[spec["slug"]] = cat
        log.debug("seeded kink_category", slug=spec["slug"])

    await session.flush()

    for spec in _ITEMS:
        cat = category_map[spec["category"]]
        await item_dao.upsert_by_slug(
            slug=spec["slug"],
            goddess_id=None,
            category_id=cat.id,  # type: ignore[union-attr]
            label=spec["label"],
            description=spec["description"],
            safety_flag=spec["safety_flag"],
        )

    await session.flush()
    log.info("kink taxonomy seeded", categories=len(_CATEGORIES), items=len(_ITEMS))
