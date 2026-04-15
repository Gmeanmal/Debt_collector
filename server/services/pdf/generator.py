import hashlib
from datetime import UTC, date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader

from models.debt import DebtContract, PaymentFrequency
from models.user import Goddess, User
from services.pdf.templates_dir import TEMPLATES_DIR
from utils.finance import period_rate, simulate

_WeasyHTML: type | None
try:
    from weasyprint import HTML as _WeasyPrintHTML  # type: ignore[import-untyped]

    _WeasyHTML = _WeasyPrintHTML
except ImportError:  # pragma: no cover
    _WeasyHTML = None

LONDON = ZoneInfo("Europe/London")
_TWO_DP = Decimal("0.01")

_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)


def _fmt_money(value: Decimal | str | None) -> str:
    """Format a monetary value as £X,XXX.XX."""
    if value is None:
        return "£0.00"
    d = Decimal(str(value)).quantize(_TWO_DP, rounding=ROUND_HALF_UP)
    sign = "-" if d < 0 else ""
    abs_d = abs(d)
    integer_part, frac_part = f"{abs_d:.2f}".split(".")
    grouped = f"{int(integer_part):,}"
    return f"{sign}£{grouped}.{frac_part}"


def _fmt_dt(dt: datetime | None, fmt: str = "%d %b %Y %H:%M") -> str:
    """Convert a naive-UTC datetime to a London-time formatted string."""
    if dt is None:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(LONDON).strftime(fmt)


def _fmt_date(d: date, fmt: str = "%d %b %Y") -> str:
    return d.strftime(fmt)


def _period_due_date(start: date, period_index: int, freq: PaymentFrequency) -> date:
    """Return the due date for period_index (1-based) from a contract start date."""
    if freq == PaymentFrequency.weekly:
        return start + timedelta(weeks=period_index)
    if freq == PaymentFrequency.biweekly:
        return start + timedelta(weeks=period_index * 2)
    # monthly — advance by period_index months
    month = start.month + period_index
    year = start.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    day = min(start.day, _days_in_month(year, month))
    return date(year, month, day)


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day


def _build_schedule_rows(
    contract: DebtContract,
    signed_at: datetime | None,
) -> list[dict[str, str]]:
    """Build one row per repayment period with due date, amount due, interest, running balance."""
    sim = simulate(contract)
    r = period_rate(contract)

    if signed_at is not None:
        if signed_at.tzinfo is None:
            signed_at = signed_at.replace(tzinfo=UTC)
        start_date = signed_at.astimezone(LONDON).date()
    else:
        start_date = datetime.now(LONDON).date()

    rows: list[dict[str, str]] = []
    for entry in sim:
        idx: int = entry["period"]
        balance_before = Decimal(entry["balance_before_payment"])
        payment = Decimal(entry["payment"])
        balance_end = Decimal(entry["balance_end"])

        # Interest = balance_before - (previous balance)
        # derive previous balance: balance_before = prev * (1 + r), so prev = balance_before / (1+r)
        prev_balance = (balance_before / (Decimal("1") + r)).quantize(
            _TWO_DP, rounding=ROUND_HALF_UP
        )
        interest = (balance_before - prev_balance).quantize(_TWO_DP, rounding=ROUND_HALF_UP)

        due = _period_due_date(start_date, idx, contract.payment_frequency)
        rows.append(
            {
                "period": str(idx),
                "due_date": _fmt_date(due),
                "amount_due": _fmt_money(payment),
                "interest": _fmt_money(interest),
                "running_balance": _fmt_money(balance_end),
            }
        )
    return rows


def _short_id(contract: DebtContract) -> str:
    return str(contract.id).upper()[:8]


def _build_context(
    contract: DebtContract,
    goddess: Goddess,
    sub_user: User,
    signature_b64: str | None,
    goddess_signature_b64: str | None,
    signed_at: datetime | None,
    draft: bool,
) -> dict[str, object]:
    rate_pct = (contract.interest_rate * Decimal("100")).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    sub_first = (sub_user.first_name or "").strip()
    sub_last = (sub_user.last_name or "").strip()
    sub_full_name = f"{sub_first} {sub_last}".strip() or sub_user.username

    penalty_pct = (contract.late_penalty_percent * Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    return {
        "contract": contract,
        "contract_short_id": _short_id(contract),
        "goddess_display_name": goddess.display_name,
        "goddess_username": None,
        "goddess_email": goddess.email,
        "sub_display_name": sub_user.username,
        "sub_username": sub_user.username,
        "sub_first_name": sub_user.first_name or "",
        "sub_last_name": sub_user.last_name or "",
        "sub_full_name": sub_full_name,
        "sub_id_prefix": str(sub_user.id).upper()[:8],
        "principal_fmt": _fmt_money(contract.principal),
        "minimum_payment_fmt": _fmt_money(contract.minimum_payment),
        "exit_amount_fmt": _fmt_money(contract.exit_amount),
        "interest_rate_pct": str(rate_pct),
        "penalty_pct": str(penalty_pct),
        "frequency_label": contract.payment_frequency.value,
        "interest_period_label": contract.interest_period.value,
        "duration_periods": contract.duration_periods,
        "late_penalty_severity": contract.late_penalty_severity.value,
        "created_at_fmt": _fmt_dt(contract.created_at),
        "signed_at_fmt": _fmt_dt(signed_at) if signed_at is not None else None,
        "generated_at_fmt": _fmt_dt(datetime.now(UTC)),
        "schedule_rows": _build_schedule_rows(contract, signed_at),
        "signature_b64": signature_b64,
        "goddess_signature_b64": goddess_signature_b64,
        "draft": draft,
    }


def generate(
    contract: DebtContract,
    goddess: Goddess,
    sub_user: User,
    signature_b64: str | None = None,
    signed_at: datetime | None = None,
    goddess_signature_b64: str | None = None,
    draft: bool = False,
) -> tuple[bytes, str]:
    """Render the contract HTML template and produce a PDF + SHA-256 digest.

    Args:
        contract: The DebtContract row.
        goddess: The Goddess profile (for display_name and email).
        sub_user: The sub's User row (for name, username, id).
        signature_b64: Base64-encoded PNG of the sub's signature, or None for draft.
        signed_at: UTC datetime when the sub signed, or None.
        goddess_signature_b64: Base64-encoded PNG of the goddess signature, or None.
        draft: When True, a DRAFT watermark overlay is rendered.

    Returns:
        (pdf_bytes, sha256_hex)
    """
    ctx = _build_context(
        contract=contract,
        goddess=goddess,
        sub_user=sub_user,
        signature_b64=signature_b64,
        goddess_signature_b64=goddess_signature_b64,
        signed_at=signed_at,
        draft=draft,
    )
    tmpl = _env.get_template("contract.html")
    html = tmpl.render(**ctx)
    if _WeasyHTML is None:  # pragma: no cover
        raise RuntimeError("weasyprint is not installed")
    pdf_bytes: bytes = _WeasyHTML(string=html, base_url=TEMPLATES_DIR).write_pdf()
    sha = hashlib.sha256(pdf_bytes).hexdigest()
    return pdf_bytes, sha


# Legacy alias kept for any callers that import generate_contract_pdf by name.
generate_contract_pdf = generate
