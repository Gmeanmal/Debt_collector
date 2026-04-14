import pytest

pytestmark = pytest.mark.skip(
    reason="needs postgres — deferred to later session (aiosqlite incompatible with "
    "use_alter self-FK + pg enum types)"
)


def test_placeholder() -> None:  # pragma: no cover
    pass
