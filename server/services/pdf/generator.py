import hashlib

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML  # type: ignore[import-untyped]

from models.debt import DebtContract
from services.pdf.templates_dir import TEMPLATES_DIR

_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)


def generate(
    contract: DebtContract,
    goddess_name: str,
    sub_full_name: str,
    signature_png_b64: str,
    signed_at_iso: str,
) -> tuple[bytes, str]:
    tmpl = _env.get_template("contract.html")
    html = tmpl.render(
        contract=contract,
        goddess_name=goddess_name,
        sub_full_name=sub_full_name,
        signature_b64=signature_png_b64,
        signed_at=signed_at_iso,
    )
    pdf_bytes: bytes = HTML(string=html, base_url=TEMPLATES_DIR).write_pdf()
    sha = hashlib.sha256(pdf_bytes).hexdigest()
    return pdf_bytes, sha
