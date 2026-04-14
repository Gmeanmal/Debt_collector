import pytest

pytestmark = pytest.mark.skip(
    reason="needs postgres — deferred to later session (controller pulls auth/user/email "
    "dependencies; needs full app fixture)"
)


def test_placeholder() -> None:  # pragma: no cover
    pass
