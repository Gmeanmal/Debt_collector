from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.exceptions import (
    AppError,
    BadRequest,
    Conflict,
    Forbidden,
    IllegalTransition,
    NotFound,
    PayloadTooLarge,
    Unauthorized,
    UnsupportedMediaType,
    Validation,
)


def register(app: FastAPI) -> None:
    @app.exception_handler(BadRequest)
    async def _handle_bad_request(_: Request, exc: BadRequest) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"error": "BadRequest", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(NotFound)
    async def _handle_not_found(_: Request, exc: NotFound) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"error": "NotFound", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(Conflict)
    async def _handle_conflict(_: Request, exc: Conflict) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"error": "Conflict", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(Unauthorized)
    async def _handle_unauthorized(_: Request, exc: Unauthorized) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(Forbidden)
    async def _handle_forbidden(_: Request, exc: Forbidden) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={"error": "Forbidden", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(PayloadTooLarge)
    async def _handle_payload_too_large(_: Request, exc: PayloadTooLarge) -> JSONResponse:
        return JSONResponse(
            status_code=413,
            content={"error": "PayloadTooLarge", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(UnsupportedMediaType)
    async def _handle_unsupported_media_type(_: Request, exc: UnsupportedMediaType) -> JSONResponse:
        return JSONResponse(
            status_code=415,
            content={
                "error": "UnsupportedMediaType",
                "message": exc.message,
                "context": exc.context,
            },
        )

    @app.exception_handler(Validation)
    async def _handle_validation(_: Request, exc: Validation) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": "Validation", "message": exc.message, "context": exc.context},
        )

    @app.exception_handler(IllegalTransition)
    async def _handle_illegal_transition(_: Request, exc: IllegalTransition) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": "illegal_transition",
                "from": exc.from_state,
                "to": exc.to_state,
                "allowed": exc.allowed,
            },
        )

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "context": exc.context,
            },
        )
