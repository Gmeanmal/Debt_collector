from pathlib import Path

_PLACEHOLDER_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
    b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 68>>stream\n"
    b"BT /F1 18 Tf 72 720 Td (Dev placeholder signed contract PDF) Tj ET\n"
    b"endstream endobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"xref\n0 6\n"
    b"0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000052 00000 n \n"
    b"0000000099 00000 n \n"
    b"0000000184 00000 n \n"
    b"0000000300 00000 n \n"
    b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n360\n%%EOF\n"
)


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

    async def fetch_bytes(self, key: str) -> bytes:
        target = self._base / key
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(_PLACEHOLDER_PDF)
        return target.read_bytes()

    def supports_direct_fetch(self) -> bool:
        return True
