from fastapi import APIRouter

router = APIRouter(tags=["infra"])


@router.get(
    "/health",
    summary="Health check",
    description=(
        'Returns `{"status": "ok"}` when the server process is running. '
        "Does not verify database connectivity — use this as a liveness probe only."
    ),
    response_model=dict[str, str],
    status_code=200,
    responses={
        200: {
            "description": "Server is alive",
            "content": {"application/json": {"example": {"status": "ok"}}},
        },
    },
)
async def health() -> dict[str, str]:
    return {"status": "ok"}
