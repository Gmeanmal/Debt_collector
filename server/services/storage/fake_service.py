from pathlib import Path


class FakeStorageService:
    def __init__(self, base_dir: str = "/tmp/debt-collector-storage", public_url: str = "") -> None:
        self._base = Path(base_dir)
        self._base.mkdir(parents=True, exist_ok=True)
        self._public_url = public_url.rstrip("/") or "file://" + str(self._base)

    async def upload_pdf(self, key: str, data: bytes) -> str:
        target = self._base / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return key

    async def presign_download(self, key: str, ttl: int = 900) -> str:
        _ = ttl
        return f"{self._public_url}/{key}"
