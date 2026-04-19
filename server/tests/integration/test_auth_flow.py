"""Integration smoke tests for the auth flow."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration._helpers import seed_goddess


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_goddess(db_session, "_auth1")

    resp = await client.post(
        "/auth/login",
        json={"email": "goddess_auth1@int.test", "password": "goddesspass123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_goddess(db_session, "_auth2")

    resp = await client.post(
        "/auth/login",
        json={"email": "goddess_auth2@int.test", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_goddess(db_session, "_auth3")

    login = await client.post(
        "/auth/login",
        json={"email": "goddess_auth3@int.test", "password": "goddesspass123"},
    )
    token = login.json()["access_token"]

    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "goddess_auth3@int.test"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient) -> None:
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_cookie(client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_goddess(db_session, "_auth4")

    login = await client.post(
        "/auth/login",
        json={"email": "goddess_auth4@int.test", "password": "goddesspass123"},
    )
    assert login.status_code == 200
    cookie = login.cookies.get("debt_refresh")
    assert cookie is not None

    resp = await client.post("/auth/refresh", json={"refresh_token": ""})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_goddess(db_session, "_auth5")

    await client.post(
        "/auth/login",
        json={"email": "goddess_auth5@int.test", "password": "goddesspass123"},
    )

    resp = await client.post("/auth/logout", json={"refresh_token": ""})
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_password_reset_request_always_202(client: AsyncClient) -> None:
    """Endpoint returns 202 even for unknown emails to prevent enumeration."""
    resp = await client.post(
        "/auth/password-reset/request",
        json={"email": "nobody@nowhere.test"},
    )
    assert resp.status_code == 202


@pytest.mark.asyncio
async def test_password_reset_confirm_invalid_token(client: AsyncClient) -> None:
    resp = await client.post(
        "/auth/password-reset/confirm",
        json={"token": "bogus-token-xyz", "new_password": "newpassword99"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_signup_via_invitation(client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_goddess(db_session, "_auth6")

    login = await client.post(
        "/auth/login",
        json={"email": "goddess_auth6@int.test", "password": "goddesspass123"},
    )
    token = login.json()["access_token"]

    invite_resp = await client.post(
        "/goddess/invitations/",
        headers={"Authorization": f"Bearer {token}"},
        json={"entry_tribute_amount": "50.00"},
    )
    assert invite_resp.status_code == 201
    invite_token = invite_resp.json()["token"]

    signup_resp = await client.post(
        f"/invite/{invite_token}/signup",
        json={
            "email": "newsub_auth6@int.test",
            "password": "subpass123",
            "username": "newsub_auth6",
            "timezone": "Europe/London",
            "date_of_birth": "1990-01-15",
        },
    )
    assert signup_resp.status_code == 201
    data = signup_resp.json()
    assert "access_token" in data
