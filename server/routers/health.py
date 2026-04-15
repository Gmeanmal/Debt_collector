from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel


class HealthzResponse(BaseModel):
    status: Literal["ok"]


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


@router.get(
    "/healthz",
    summary="Liveness probe",
    description=(
        'Returns `{"status": "ok"}` when the server process is running. '
        "Does not verify database connectivity. Use as a Kubernetes/Docker liveness probe."
    ),
    response_model=HealthzResponse,
    status_code=200,
    tags=["system"],
    responses={},
)
async def healthz() -> HealthzResponse:
    return HealthzResponse(status="ok")
