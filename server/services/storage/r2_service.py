from typing import Any, cast

from aiobotocore.session import get_session


class R2StorageService:
    def __init__(
        self,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket: str,
    ) -> None:
        self._endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._bucket = bucket
        self._session = get_session()

    def _client_ctx(self) -> Any:
        return self._session.create_client(
            "s3",
            endpoint_url=self._endpoint_url,
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
            region_name="auto",
        )

    async def upload_pdf(self, key: str, data: bytes) -> str:
        async with self._client_ctx() as client:
            await client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType="application/pdf",
            )
        return key

    async def presign_download(self, key: str, ttl: int = 900) -> str:
        async with self._client_ctx() as client:
            url = await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=ttl,
            )
        return cast(str, url)
