from zoneinfo import ZoneInfo

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from controllers.cron_controller import CronController
from core.db import SessionMaker

log = structlog.get_logger()
LONDON = ZoneInfo("Europe/London")


async def _run_once() -> None:
    async with SessionMaker() as session:
        ctrl = CronController(session)
        await ctrl.run_daily()
        await session.commit()


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=LONDON)
    scheduler.add_job(
        _run_once,
        CronTrigger(hour=8, minute=0),
        id="daily_08_uk",
        replace_existing=True,
    )
    scheduler.start()
    log.info("scheduler_started", time="08:00 Europe/London")
    return scheduler
