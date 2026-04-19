"""Integration smoke tests for breach cascade: contracts breached + tokens revoked."""

import base64

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt import DebtContract, DebtContractStatus
from models.user import RefreshToken, User, UserStatus
from tests.integration._helpers import contract_payload, seed_goddess, seed_sub


def _fake_sig_b64() -> str:
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return f"data:image/png;base64,{base64.b64encode(png_bytes).decode()}"


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return str(resp.json()["access_token"])


async def _propose_and_sign(
    client: AsyncClient,
    sub_id: str,
    g_token: str,
    s_token: str,
) -> str:
    propose = await client.post(
        f"/goddess/subs/{sub_id}/debts",
        headers={"Authorization": f"Bearer {g_token}"},
        json=contract_payload(),
    )
    assert propose.status_code == 201, propose.text
    cid = propose.json()["id"]

    sign = await client.post(
        f"/debts/{cid}/sign",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"signature_b64": _fake_sig_b64()},
    )
    assert sign.status_code == 200, sign.text
    return str(cid)


@pytest.mark.asyncio
async def test_breach_cascades_contracts_and_blacklists(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """
    2 active contracts on a sub → breach → both contracts BREACHED,
    sub status BLACKLISTED, refresh tokens revoked.
    """
    goddess, _ = await seed_goddess(db_session, "_bl1")
    sub = await seed_sub(db_session, goddess.id, "_bl1")
    # Save scalar values before any expiry
    sub_id = sub.id

    g_token = await _login(client, "goddess_bl1@int.test", "goddesspass123")
    s_token = await _login(client, "sub_bl1@int.test", "subpass123")

    await _propose_and_sign(client, str(sub_id), g_token, s_token)
    await _propose_and_sign(client, str(sub_id), g_token, s_token)

    # Breach
    breach_resp = await client.post(
        f"/goddess/subs/{sub_id}/breach",
        headers={"Authorization": f"Bearer {g_token}"},
        json={"reason": "test breach"},
    )
    assert breach_resp.status_code == 201, breach_resp.text

    # Expire cached state so we see the rows committed by the app.
    db_session.expire_all()
    result = await db_session.execute(
        select(DebtContract).where(col(DebtContract.sub_id) == sub_id)
    )
    contracts = list(result.scalars().all())
    active_contracts = [c for c in contracts if c.status == DebtContractStatus.active]
    breached_contracts = [c for c in contracts if c.status == DebtContractStatus.breached]
    assert len(active_contracts) == 0, "No contracts should remain active after breach"
    assert len(breached_contracts) == 2, "Both contracts should be BREACHED"

    # Sub status must be blacklisted
    sub_row = await db_session.get(User, sub_id)
    assert sub_row is not None
    assert sub_row.status == UserStatus.blacklisted

    # All refresh tokens for the sub must be revoked
    rt_result = await db_session.execute(
        select(RefreshToken).where(
            col(RefreshToken.user_id) == sub_id,
            col(RefreshToken.revoked_at).is_(None),
        )
    )
    active_tokens = list(rt_result.scalars().all())
    assert len(active_tokens) == 0, "All refresh tokens must be revoked after breach"


@pytest.mark.asyncio
async def test_already_blacklisted_sub_raises_conflict(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Breaching an already-blacklisted sub returns 409."""
    goddess, _ = await seed_goddess(db_session, "_bl2")
    sub = await seed_sub(db_session, goddess.id, "_bl2")

    g_token = await _login(client, "goddess_bl2@int.test", "goddesspass123")
    s_token = await _login(client, "sub_bl2@int.test", "subpass123")
    await _propose_and_sign(client, str(sub.id), g_token, s_token)

    # First breach
    first = await client.post(
        f"/goddess/subs/{sub.id}/breach",
        headers={"Authorization": f"Bearer {g_token}"},
        json={"reason": "first breach"},
    )
    assert first.status_code == 201

    # Second breach — conflict
    second = await client.post(
        f"/goddess/subs/{sub.id}/breach",
        headers={"Authorization": f"Bearer {g_token}"},
        json={"reason": "second breach"},
    )
    assert second.status_code == 409
