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


class Validation(AppError):
    status_code = 422
