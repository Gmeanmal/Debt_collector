class DomainError(Exception):
    """Base domain exception."""

    status_code = 400

    def __init__(self, message: str, **context):
        super().__init__(message)
        self.message = message
        self.context = context


class NotFound(DomainError):
    status_code = 404


class Unauthorized(DomainError):
    status_code = 401


class Forbidden(DomainError):
    status_code = 403


class Conflict(DomainError):
    status_code = 409


class ValidationError(DomainError):
    status_code = 422
