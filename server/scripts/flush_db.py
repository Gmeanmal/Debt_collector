"""Drop every table in the public schema. Used by `make flush-dbs`."""

import asyncio

from sqlalchemy import text

from core.db import engine


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
    print("public schema dropped and re-created.")


if __name__ == "__main__":
    asyncio.run(main())
