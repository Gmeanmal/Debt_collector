from typing import Any


class AppError(Exception):
    """Base application exception."""

    status_code = 500

    def __init__(self, message: str, **context: Any):
        super().__init__(message)
        self.message = message
        self.context = context


class NotFound(AppError):
    status_code = 404


class Unauthorized(AppError):
    status_code = 401


class Forbidden(AppError):
    status_code = 403


class Conflict(AppError):
    status_code = 409


class BadRequest(AppError):
    status_code = 400


class PayloadTooLarge(AppError):
    status_code = 413


class UnsupportedMediaType(AppError):
    status_code = 415


class Validation(AppError):
    status_code = 422


class IllegalTransition(AppError):
    """422 raised when a domain state machine rejects a transition."""

    status_code = 422

    def __init__(
        self,
        *,
        from_state: str,
        to_state: str,
        allowed: list[str],
    ) -> None:
        super().__init__(
            f"illegal transition from {from_state} to {to_state}",
            **{"from": from_state, "to": to_state, "allowed": allowed},
        )
        self.from_state = from_state
        self.to_state = to_state
        self.allowed = allowed
