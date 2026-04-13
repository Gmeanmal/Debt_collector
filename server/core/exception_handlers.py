from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.exceptions import DomainError


def register(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "context": exc.context,
            },
        )
