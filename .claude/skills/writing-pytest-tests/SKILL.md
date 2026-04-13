---
name: writing-pytest-tests
description: Use when writing backend pytest tests. Enforces the real-database rule, polyfactory usage, per-rule-branch coverage, and naming conventions.
---

# Writing Pytest Tests

## Stack

- `pytest` + `pytest-asyncio` (`asyncio_mode = "auto"` in `pyproject.toml`)
- `pytest-cov` for coverage
- `httpx.AsyncClient` for router integration tests
- `polyfactory` for entity factories

## Folder layout

```
backend/tests/
├── unit/
│   ├── daos/
│   │   └── test_user_dao.py
│   ├── controllers/
│   │   └── test_claim_controller.py
│   └── services/
│       └── test_notification_service.py
├── integration/
│   └── test_goddess_routes.py
├── factories/
│   └── user_factory.py
└── conftest.py
```

## The real-database rule

**Never mock the database.** Use a real ephemeral PostgreSQL.

`conftest.py` provides:

```python
@pytest.fixture(scope="session")
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    url = os.environ["TEST_DATABASE_URL"]  # points at a test DB
    engine = create_async_engine(url, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def session(engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
        await session.rollback()
```

Every test starts from a clean slate — changes roll back.

## Factories (polyfactory)

```python
from polyfactory.factories.pydantic_factory import ModelFactory
from models.user import UserCreate

class UserCreateFactory(ModelFactory[UserCreate]):
    __model__ = UserCreate

    @classmethod
    def role(cls) -> Role:
        return Role.SUB
```

Never hand-construct entities in test bodies. If you need a variant, make a new factory or use `factory.build(role=Role.GODDESS)`.

## DAO tests

Thin. Insert via factory + raw session, read via the DAO method, assert.

```python
async def test_get_by_id_returns_user(session: AsyncSession) -> None:
    user = User(**UserCreateFactory.build().model_dump(), password_hash="x")
    session.add(user)
    await session.commit()

    dao = UserDAO(session)
    found = await dao.get_by_id(user.id)

    assert found.id == user.id

async def test_get_by_id_raises_when_missing(session: AsyncSession) -> None:
    dao = UserDAO(session)
    with pytest.raises(NotFoundError):
        await dao.get_by_id(uuid4())
```

## Controller tests

Cover every rule branch. One test per branch.

```python
async def test_send_claim_creates_claim_when_goddess_under_cap(session: AsyncSession) -> None:
    goddess = await insert_user(session, role=Role.GODDESS)
    sub = await insert_user(session, role=Role.PENDING)
    controller = ClaimController(ClaimDAO(session), UserDAO(session))

    claim = await controller.send_claim(goddess.id, sub.id)

    assert claim.status == ClaimStatus.PENDING
    assert claim.goddess_id == goddess.id

async def test_send_claim_raises_when_goddess_already_has_three_pending(
    session: AsyncSession,
) -> None:
    goddess = await insert_user(session, role=Role.GODDESS)
    for _ in range(3):
        sub = await insert_user(session, role=Role.PENDING)
        await insert_claim(session, goddess.id, sub.id, ClaimStatus.PENDING)
    sub4 = await insert_user(session, role=Role.PENDING)
    controller = ClaimController(ClaimDAO(session), UserDAO(session))

    with pytest.raises(ConflictError, match="3 pending claims"):
        await controller.send_claim(goddess.id, sub4.id)
```

## Router integration tests

```python
async def test_post_claims_returns_201(async_client: AsyncClient, goddess_token: str) -> None:
    sub = await insert_user_via_api(async_client, role=Role.PENDING)

    response = await async_client.post(
        "/goddess/claims",
        json={"sub_id": str(sub.id)},
        headers={"Authorization": f"Bearer {goddess_token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["sub_id"] == str(sub.id)
```

## Naming

- File: `test_<subject>.py`
- Function: `test_<method>_<condition>_<expected>`
- Long names are good. Names are documentation.

## Coverage floor

- Controllers + DAOs: **85%**
- Routers: **70%** (happy path in integration, branches in controller tests)

## What never to do

- Never mock the database
- Never share state across tests via module-level variables
- Never use `@pytest.mark.skip` without linking a decisions.md entry or an open issue
- Never write a test that always passes
- Never assert on implementation details (e.g. "this method was called twice") — assert on observable state
- Never catch-and-swallow exceptions in tests
