"""Seed realistic dev data. Assumes `alembic upgrade head` has run."""

import asyncio

from seeds.bootstrap import seed_admin_and_goddess
from seeds.fake_data import seed_fake_data


async def main() -> None:
    await seed_admin_and_goddess()
    await seed_fake_data()
    print("DB initialized with realistic fake data.")


if __name__ == "__main__":
    asyncio.run(main())
