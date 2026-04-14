"""Integration smoke tests for admin impersonation."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration._helpers import seed_admin, seed_goddess, seed_sub


@pytest.mark.asyncio
async def test_impersonate_sub_returns_sub_identity(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Admin impersonates a sub — /auth/me returns sub email with impersonator set."""
    await seed_admin(db_session, "_imp1")
    goddess, _ = await seed_goddess(db_session, "_imp1")
    sub = await seed_sub(db_session, goddess.id, "_imp1")

    login = await client.post(
        "/auth/login",
        json={"email": "admin_imp1@int.test", "password": "adminpass123"},
    )
    assert login.status_code == 200, login.text
    admin_token = login.json()["access_token"]

    imp_resp = await client.post(
        f"/admin/impersonate/{sub.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert imp_resp.status_code == 200, imp_resp.text
    imp_token = imp_resp.json()["access_token"]

    me_resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {imp_token}"})
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["email"] == "sub_imp1@int.test"
    assert me["impersonator_id"] is not None


@pytest.mark.asyncio
async def test_cannot_impersonate_admin(client: AsyncClient, db_session: AsyncSession) -> None:
    """Admin cannot impersonate another admin — expects 403."""
    await seed_admin(db_session, "_imp2a")
    admin2 = await seed_admin(db_session, "_imp2b")

    login = await client.post(
        "/auth/login",
        json={"email": "admin_imp2a@int.test", "password": "adminpass123"},
    )
    assert login.status_code == 200, login.text
    admin_token = login.json()["access_token"]

    resp = await client.post(
        f"/admin/impersonate/{admin2.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_impersonate(client: AsyncClient, db_session: AsyncSession) -> None:
    """A goddess cannot call the impersonate endpoint — expects 403."""
    goddess, _ = await seed_goddess(db_session, "_imp3")
    sub = await seed_sub(db_session, goddess.id, "_imp3")

    login = await client.post(
        "/auth/login",
        json={"email": "goddess_imp3@int.test", "password": "goddesspass123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    resp = await client.post(
        f"/admin/impersonate/{sub.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
