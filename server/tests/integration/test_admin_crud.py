"""Integration smoke tests for admin generic CRUD on User entity."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration._helpers import seed_admin, seed_goddess, seed_sub


async def _admin_token(client: AsyncClient, db_session: AsyncSession, suffix: str) -> str:
    await seed_admin(db_session, suffix)

    resp = await client.post(
        "/auth/login",
        json={"email": f"admin{suffix}@int.test", "password": "adminpass123"},
    )
    assert resp.status_code == 200, resp.text
    return str(resp.json()["access_token"])


@pytest.mark.asyncio
async def test_admin_patch_user_forbidden_field_rejected(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """PATCH /admin/users/{id} with role= returns 400."""
    token = await _admin_token(client, db_session, "_crud1")
    goddess, _ = await seed_goddess(db_session, "_crud1")
    sub = await seed_sub(db_session, goddess.id, "_crud1")

    resp = await client.patch(
        f"/admin/users/{sub.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "goddess"},
    )
    assert resp.status_code == 400
    body = resp.json()
    # The app returns {error, message, context}; message carries the human text.
    assert "role" in body.get("message", body.get("detail", ""))


@pytest.mark.asyncio
async def test_admin_patch_user_allowed_field_succeeds(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """PATCH /admin/users/{id} with first_name= updates the row."""
    token = await _admin_token(client, db_session, "_crud2")
    goddess, _ = await seed_goddess(db_session, "_crud2")
    sub = await seed_sub(db_session, goddess.id, "_crud2")

    resp = await client.patch(
        f"/admin/users/{sub.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"first_name": "UpdatedName"},
    )
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "UpdatedName"


@pytest.mark.asyncio
async def test_admin_patch_writes_audit_row(client: AsyncClient, db_session: AsyncSession) -> None:
    """After a successful PATCH, an admin_action audit row must exist."""
    from sqlmodel import col, select

    from models.admin_action import AdminAction

    token = await _admin_token(client, db_session, "_crud3")
    goddess, _ = await seed_goddess(db_session, "_crud3")
    sub = await seed_sub(db_session, goddess.id, "_crud3")

    resp = await client.patch(
        f"/admin/users/{sub.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"first_name": "Audited"},
    )
    assert resp.status_code == 200

    # expire_all is synchronous; re-execute to pick up rows committed by the app.
    db_session.expire_all()
    result = await db_session.execute(select(AdminAction).where(col(AdminAction.entity) == "users"))
    rows = result.scalars().all()
    assert len(rows) >= 1
    assert any(r.action == "admin_update" for r in rows)


@pytest.mark.asyncio
async def test_non_admin_cannot_reach_admin_endpoint(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """A goddess token must receive 403 from /admin/users."""
    await seed_goddess(db_session, "_crud4")

    login = await client.post(
        "/auth/login",
        json={"email": "goddess_crud4@int.test", "password": "goddesspass123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    resp = await client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
