---
name: backend-layer-architecture
description: Use when writing, reviewing, or refactoring backend code. Enforces the routers→controllers→daos→models layer discipline and the rules around who can raise what exceptions and who can touch SQL.
---

# Backend Layer Architecture

Malverse Games enforces a strict four-layer backend architecture. Every line of backend code lives in exactly one layer. Violations are critical review findings.

## The layers

```
routers/ → controllers/ → daos/ → models/
```

### models/

- SQLModel table model + every Pydantic schema for the entity co-located in one file
- One file per entity: `models/user.py`, `models/tribute_entry.py`, etc.
- File contains: `<Entity>Base`, `<Entity>Create`, `<Entity>Read`, `<Entity>Update`, `<Entity>AdminView`, `<Entity>(table=True)`
- No imports from other layers. Models know nothing about controllers or routers.

### daos/

- One file per entity: `daos/user_dao.py`, `daos/tribute_entry_dao.py`
- Async methods, each method does exactly one SQL operation (or a tightly-coupled group like read-after-write)
- **No branches on business state.** A DAO may have `if row is None: raise NotFoundError` — that is the only allowed branch.
- **No cross-DAO calls.** If you need data from two entities, the controller calls two DAOs and stitches.
- Typed return values — the caller knows exactly what shape comes back.

Example:
```python
class UserDAO:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User:
        result = await self._session.exec(select(User).where(User.id == user_id))
        user = result.first()
        if user is None:
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def get_by_normalized_email(self, normalized: str) -> User | None:
        result = await self._session.exec(
            select(User).where(User.normalized_email == normalized)
        )
        return result.first()
```

### controllers/

- All business logic lives here
- Receives typed arguments, returns typed values
- Calls one or many DAOs
- Raises **domain exceptions**, never `HTTPException`:
  - `NotFoundError`
  - `PermissionDeniedError`
  - `ConflictError`
  - `ValidationError` (business-level, distinct from Pydantic)
  - `RateLimitedError`
- A FastAPI exception handler in `core/exceptions.py` maps each domain exception to the correct HTTP status
- Controllers call other controllers sparingly — prefer flat composition at the router level

Example:
```python
class ClaimController:
    def __init__(self, claim_dao: ClaimDAO, user_dao: UserDAO) -> None:
        self._claims = claim_dao
        self._users = user_dao

    async def send_claim(self, goddess_id: UUID, sub_id: UUID) -> ClaimRequest:
        goddess = await self._users.get_by_id(goddess_id)
        if goddess.role != Role.GODDESS:
            raise PermissionDeniedError("Only Goddesses can send claims")

        sub = await self._users.get_by_id(sub_id)
        if sub.role != Role.PENDING:
            raise ConflictError(f"Sub {sub_id} is not in the pending pool")

        pending_count = await self._claims.count_pending_by_goddess(goddess_id)
        if pending_count >= 3:
            raise ConflictError("Goddess already has 3 pending claims")

        return await self._claims.create(goddess_id=goddess_id, sub_id=sub_id)
```

### routers/

- HTTP interface only
- FastAPI `APIRouter` with path operations
- Pydantic validation on inputs, response model on outputs
- `Depends()` for auth (`get_current_user`, `require_role`) and DB session
- **Zero business logic.** No `if` beyond input unpacking. If you are tempted to write an `if`, move it to the controller.
- Never calls a DAO directly

Example:
```python
router = APIRouter(prefix="/goddess/claims", tags=["goddess"])

@router.post("", response_model=ClaimRead, status_code=201)
async def send_claim(
    body: ClaimCreate,
    current: User = Depends(require_role(Role.GODDESS)),
    controller: ClaimController = Depends(get_claim_controller),
) -> ClaimRequest:
    return await controller.send_claim(
        goddess_id=current.id,
        sub_id=body.sub_id,
    )
```

## The hard rules

1. **Routers never import DAOs.** If you see `from daos.user_dao import UserDAO` in a router, that is a critical violation.
2. **Controllers never construct `HTTPException`.** Raise a domain exception.
3. **DAOs never call other DAOs.** That's the controller's job.
4. **Models never import from routers/controllers/daos.**
5. **Cross-entity joins are fine in DAOs.** Cross-entity **rules** go in controllers.

## Common smells

- An `if` in a router → move to controller
- A controller method that returns a dict/JSONable-but-not-a-model → return a Pydantic model
- A DAO method that takes a "filter_type" string argument → split into separate methods
- A try/except in a DAO that returns `None` → raise `NotFoundError` instead
- A controller that constructs SQL `select()` calls → move to a DAO method

## Reviewing your own code

Before you finish, ask:

- If I delete the router, does my business logic still make sense? (It should — because the router has none.)
- If I replace PostgreSQL with an in-memory store, does only the DAO layer change? (It should.)
- Can I test the controller without spinning up FastAPI? (Yes — controllers take dependencies via constructor, not via `Depends`.)
