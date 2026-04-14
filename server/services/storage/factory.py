from core.config import Settings, get_settings
from services.storage.base import StorageService
from services.storage.fake_service import FakeStorageService
from services.storage.r2_service import R2StorageService


def get_storage_service(settings: Settings | None = None) -> StorageService:
    s = settings or get_settings()
    if not s.r2_account_id:
        return FakeStorageService(public_url=s.r2_public_url)
    return R2StorageService(
        account_id=s.r2_account_id,
        access_key_id=s.r2_access_key_id,
        secret_access_key=s.r2_secret_access_key,
        bucket=s.r2_bucket,
    )
