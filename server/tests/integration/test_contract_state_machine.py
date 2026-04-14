"""Integration smoke tests for the debt contract state machine."""

import base64

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration._helpers import contract_payload, seed_goddess, seed_sub


def _fake_sig_b64() -> str:
    """Return a minimal valid base64 PNG (1×1 transparent pixel)."""
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return base64.b64encode(png_bytes).decode()


async def _goddess_login(client: AsyncClient, suffix: str) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": f"goddess{suffix}@int.test", "password": "goddesspass123"},
    )
    assert resp.status_code == 200, resp.text
    return str(resp.json()["access_token"])


async def _sub_login(client: AsyncClient, suffix: str) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": f"sub{suffix}@int.test", "password": "subpass123"},
    )
    assert resp.status_code == 200, resp.text
    return str(resp.json()["access_token"])


@pytest.mark.asyncio
async def test_propose_counter_accept_sign_flow(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """
    Goddess proposes → sub counters → goddess accepts → sub signs.
    Verifies status transitions and that an audit row is written at each step.
    """
    goddess, _ = await seed_goddess(db_session, "_csm1")
    await seed_sub(db_session, goddess.id, "_csm1")

    g_token = await _goddess_login(client, "_csm1")
    s_token = await _sub_login(client, "_csm1")

    from sqlmodel import col, select

    from models.user import User

    result = await db_session.execute(select(User).where(col(User.email) == "sub_csm1@int.test"))
    sub = result.scalar_one()

    # Goddess proposes
    propose = await client.post(
        f"/goddess/subs/{sub.id}/debts",
        headers={"Authorization": f"Bearer {g_token}"},
        json=contract_payload(),
    )
    assert propose.status_code == 201, propose.text
    cid = propose.json()["id"]
    assert propose.json()["status"] == "pending_sub"

    # Sub counters
    counter = await client.post(
        f"/debts/{cid}/counter-propose",
        headers={"Authorization": f"Bearer {s_token}"},
        json={**contract_payload(), "principal": "450.00", "minimum_payment": "45.00"},
    )
    assert counter.status_code == 200, counter.text
    assert counter.json()["status"] == "pending_dom_counter"

    # Goddess accepts the counter
    accept = await client.post(
        f"/debts/{cid}/accept-counter",
        headers={"Authorization": f"Bearer {g_token}"},
    )
    assert accept.status_code == 200, accept.text
    assert accept.json()["status"] == "pending_sub_signature"

    # Sub signs
    sign = await client.post(
        f"/debts/{cid}/sign",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"signature_png_b64": _fake_sig_b64()},
    )
    assert sign.status_code == 200, sign.text
    assert sign.json()["status"] == "active"

    # Audit trail
    audit = await client.get(
        f"/debts/{cid}/audit",
        headers={"Authorization": f"Bearer {g_token}"},
    )
    assert audit.status_code == 200
    event_types = [row["event_type"] for row in audit.json()]
    assert "proposed" in event_types
    assert "countered" in event_types
    assert "accepted_counter" in event_types
    assert "signed" in event_types


@pytest.mark.asyncio
async def test_second_counter_rejected(client: AsyncClient, db_session: AsyncSession) -> None:
    """Sub may only counter once; a second counter from the same side returns 409."""
    goddess, _ = await seed_goddess(db_session, "_csm2")
    await seed_sub(db_session, goddess.id, "_csm2")

    g_token = await _goddess_login(client, "_csm2")
    s_token = await _sub_login(client, "_csm2")

    from sqlmodel import col, select

    from models.user import User

    result = await db_session.execute(select(User).where(col(User.email) == "sub_csm2@int.test"))
    sub = result.scalar_one()

    propose = await client.post(
        f"/goddess/subs/{sub.id}/debts",
        headers={"Authorization": f"Bearer {g_token}"},
        json=contract_payload(),
    )
    cid = propose.json()["id"]

    # First counter — ok (status → pending_dom_counter)
    first = await client.post(
        f"/debts/{cid}/counter-propose",
        headers={"Authorization": f"Bearer {s_token}"},
        json={**contract_payload(), "principal": "450.00", "minimum_payment": "45.00"},
    )
    assert first.status_code == 200, first.text

    # Sub cannot counter again while status is pending_dom_counter
    second = await client.post(
        f"/debts/{cid}/counter-propose",
        headers={"Authorization": f"Bearer {s_token}"},
        json={**contract_payload(), "principal": "400.00", "minimum_payment": "40.00"},
    )
    assert second.status_code in (
        409,
        403,
    ), f"Expected 409 or 403 for second counter but got {second.status_code}: {second.text}"


@pytest.mark.asyncio
async def test_propose_sign_direct(client: AsyncClient, db_session: AsyncSession) -> None:
    """Goddess proposes → sub signs directly (no negotiation)."""
    goddess, _ = await seed_goddess(db_session, "_csm3")
    await seed_sub(db_session, goddess.id, "_csm3")

    g_token = await _goddess_login(client, "_csm3")
    s_token = await _sub_login(client, "_csm3")

    from sqlmodel import col, select

    from models.user import User

    result = await db_session.execute(select(User).where(col(User.email) == "sub_csm3@int.test"))
    sub = result.scalar_one()

    propose = await client.post(
        f"/goddess/subs/{sub.id}/debts",
        headers={"Authorization": f"Bearer {g_token}"},
        json=contract_payload(),
    )
    assert propose.status_code == 201
    cid = propose.json()["id"]

    sign = await client.post(
        f"/debts/{cid}/sign",
        headers={"Authorization": f"Bearer {s_token}"},
        json={"signature_png_b64": _fake_sig_b64()},
    )
    assert sign.status_code == 200
    assert sign.json()["status"] == "active"
