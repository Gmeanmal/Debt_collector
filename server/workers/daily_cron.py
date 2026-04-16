from zoneinfo import ZoneInfo

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from controllers.cron_controller import CronController
from core.db import SessionMaker
from services.cron.rituals import (
    london_today,
    mark_missed_for_today,
    seed_occurrences_for_today,
)

log = structlog.get_logger()
LONDON = ZoneInfo("Europe/London")


async def _run_once() -> None:
    async with SessionMaker() as session:
        ctrl = CronController(session)
        await ctrl.run_daily()
        await session.commit()


async def _seed_ritual_occurrences_job() -> None:
    async with SessionMaker() as session:
        await seed_occurrences_for_today(session, london_today())
        await session.commit()


async def _mark_missed_ritual_occurrences_job() -> None:
    async with SessionMaker() as session:
        await mark_missed_for_today(session, london_today())
        await session.commit()


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=LONDON)
    scheduler.add_job(
        _run_once,
        CronTrigger(hour=8, minute=0),
        id="daily_08_uk",
        replace_existing=True,
    )
    scheduler.add_job(
        _seed_ritual_occurrences_job,
        CronTrigger(hour=0, minute=0),
        id="seed_ritual_occurrences_job",
        replace_existing=True,
    )
    scheduler.add_job(
        _mark_missed_ritual_occurrences_job,
        CronTrigger(hour=23, minute=59),
        id="mark_missed_ritual_occurrences_job",
        replace_existing=True,
    )
    scheduler.start()
    log.info(
        "scheduler_started",
        jobs={
            "daily_08_uk": "08:00 Europe/London",
            "seed_ritual_occurrences_job": "00:00 Europe/London",
            "mark_missed_ritual_occurrences_job": "23:59 Europe/London",
        },
    )
    return scheduler
