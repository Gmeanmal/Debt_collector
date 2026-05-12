"""Cloudflare R2 service for signed contract PDFs."""

import boto3
from botocore.client import Config

from ..core.config import get_settings


class R2Service:
    def __init__(self):
        settings = get_settings()
        if not settings.R2_ENDPOINT_URL:
            self.client = None
            return

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        self.bucket = settings.R2_BUCKET_NAME

    def upload_contract(self, contract_id: int, pdf_bytes: bytes, filename: str = "signed_contract.pdf") -> str:
        if not self.client:
            raise RuntimeError("R2 not configured")
        key = f"contracts/{contract_id}/{filename}"
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=pdf_bytes,
            ContentType="application/pdf",
            Metadata={"contract_id": str(contract_id)},
        )
        return key

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        if not self.client:
            raise RuntimeError("R2 not configured")
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )


def get_r2_service():
    return R2Service()
