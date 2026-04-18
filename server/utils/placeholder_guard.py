from core.exceptions import Validation

_PLACEHOLDER_SENTINELS: frozenset[str] = frozenset(
    {
        "jane doe",
        "john doe",
        "+44 7700 900000",
        "+447700900000",
        "test",
        "placeholder",
    }
)


def reject_if_placeholder(value: str | None, field: str) -> None:
    """Raise Validation if *value* matches a known placeholder sentinel.

    Comparison is case-insensitive and strips surrounding whitespace.
    Values that are None or empty are passed through — use Pydantic
    `min_length` for the empty-string guard on required fields.
    """
    if value is None:
        return
    normalised = value.strip().lower()
    if not normalised:
        return
    if normalised in _PLACEHOLDER_SENTINELS:
        raise Validation(
            "This value looks like a placeholder, please enter a real one.",
            field=field,
        )
