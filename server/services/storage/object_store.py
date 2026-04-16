"""Provider-neutral S3-compatible async object store.

Dev targets local MinIO (port 4015). Prod targets AWS S3, Cloudflare R2, or Backblaze B2
by changing only the S3_* env vars — no code changes required.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Protocol, runtime_checkable

from aiobotocore.session import get_session

from core.config import Settings, get_settings


@runtime_checkable
class _S3Client(Protocol):
    async def put_object(
        self,
        *,
        Bucket: str,
        Key: str,
        Body: bytes,
        ContentType: str,
    ) -> object: ...

    async def generate_presigned_url(
        self,
        operation_name: str,
        Params: dict[str, str],
        ExpiresIn: int,
    ) -> str: ...

    async def delete_object(self, *, Bucket: str, Key: str) -> object: ...

    async def __aenter__(self) -> "_S3Client": ...

    async def __aexit__(self, *args: object) -> None: ...


@asynccontextmanager
async def _client(settings: Settings) -> AsyncGenerator[_S3Client, None]:
    session = get_session()
    raw_client = session.create_client(
        "s3",
        region_name=settings.s3_region,
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
    )
    async with raw_client as client:
        yield client  # type: ignore[misc]


async def upload_object(
    bucket: str,
    key: str,
    body: bytes,
    content_type: str,
    settings: Settings | None = None,
) -> None:
    """Upload bytes to the object store under ``bucket/key``.

    ``content_type`` is stored as the ``ContentType`` header so browsers
    can serve the object directly from a presigned URL.
    """
    cfg = settings or get_settings()
    async with _client(cfg) as client:
        await client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)


async def generate_presigned_url(
    bucket: str,
    key: str,
    ttl_seconds: int = 600,
    settings: Settings | None = None,
) -> str:
    """Return a presigned GET URL valid for ``ttl_seconds`` seconds."""
    cfg = settings or get_settings()
    async with _client(cfg) as client:
        url: str = await client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=ttl_seconds,
        )
    return url


async def delete_object(
    bucket: str,
    key: str,
    settings: Settings | None = None,
) -> None:
    """Delete an object from the store. Idempotent — no error if key is absent."""
    cfg = settings or get_settings()
    async with _client(cfg) as client:
        await client.delete_object(Bucket=bucket, Key=key)
