"""Generate an Entity-Relationship Diagram from SQLModel metadata.

Tries eralchemy2 (SVG/PNG via graphviz) first. Falls back to a Mermaid .mmd
file when the graphviz C headers are unavailable (eralchemy2 cannot build) but
the dot binary is present for future reference.

Outputs:
  Docs/erd.svg  and  Docs/erd.png   — when eralchemy2 is available
  Docs/erd.mmd                       — always (Mermaid source, renderable in
                                       GitHub, VS Code, and diagrams.html)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

# Ensure the server root is importable when the script is run directly.
_SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVER_ROOT))

from sqlmodel import SQLModel  # noqa: E402

import models  # type: ignore[import] # noqa: E402, F401 — side-effect: populates SQLModel.metadata

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = REPO_ROOT / "Docs"
DOCS_DIR.mkdir(exist_ok=True)

SVG_PATH = DOCS_DIR / "erd.svg"
PNG_PATH = DOCS_DIR / "erd.png"
MMD_PATH = DOCS_DIR / "erd.mmd"


# ---------------------------------------------------------------------------
# Mermaid generator (always runs — standalone and used as fallback)
# ---------------------------------------------------------------------------

_TYPE_MAP: dict[str, str] = {
    "UUID": "UUID",
    "VARCHAR": "string",
    "TEXT": "string",
    "BOOLEAN": "boolean",
    "INTEGER": "int",
    "BIGINT": "int",
    "NUMERIC": "decimal",
    "FLOAT": "float",
    "TIMESTAMP": "datetime",
    "DATE": "date",
    "JSON": "json",
    "JSONB": "json",
}


def _sa_type_label(col_type: object) -> str:
    name = type(col_type).__name__.upper()
    return _TYPE_MAP.get(name, name)


def build_mermaid() -> str:
    meta = SQLModel.metadata
    lines: list[str] = ["erDiagram"]

    for tname, table in sorted(meta.tables.items()):
        lines.append(f"    {tname} {{")
        pk_names = {c.name for c in table.primary_key.columns}
        fk_cols = {fk.parent.name for fk in table.foreign_keys}
        for col in table.columns:
            markers: list[str] = []
            if col.name in pk_names:
                markers.append("PK")
            if col.name in fk_cols:
                markers.append("FK")
            type_label = _sa_type_label(col.type)
            marker_str = " " + ",".join(markers) if markers else ""
            lines.append(f"        {type_label} {col.name}{marker_str}")
        lines.append("    }")

    seen_rels: set[frozenset[str]] = set()
    for tname, table in sorted(meta.tables.items()):
        for fk in table.foreign_keys:
            child = tname
            parent = fk.column.table.name
            child_col = fk.parent.name
            parent_col = fk.column.name
            rel_key: frozenset[str] = frozenset({f"{child}.{child_col}", f"{parent}.{parent_col}"})
            if rel_key in seen_rels:
                continue
            seen_rels.add(rel_key)
            lines.append(f'    {parent} ||--o{{ {child} : "{child_col}"')

    return "\n".join(lines) + "\n"


def write_mermaid() -> None:
    mmd = build_mermaid()
    MMD_PATH.write_text(mmd, encoding="utf-8")
    print(f"Wrote {MMD_PATH}")


# ---------------------------------------------------------------------------
# eralchemy2 path (SVG + PNG)
# ---------------------------------------------------------------------------


def _dot_available() -> bool:
    try:
        subprocess.run(["dot", "-V"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def try_eralchemy() -> bool:
    try:
        import eralchemy2  # type: ignore[import-untyped]
    except ImportError:
        return False

    if not _dot_available():
        print(
            "dot binary not found — skipping eralchemy2 SVG/PNG generation",
            file=sys.stderr,
        )
        return False

    try:
        eralchemy2.render_er(SQLModel.metadata, str(SVG_PATH))
        eralchemy2.render_er(SQLModel.metadata, str(PNG_PATH))
        print(f"Wrote {SVG_PATH}")
        print(f"Wrote {PNG_PATH}")
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"eralchemy2 failed ({exc}) — falling back to Mermaid only", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    write_mermaid()
    success = try_eralchemy()
    if not success:
        print("SVG/PNG not generated (eralchemy2 unavailable). Mermaid ERD written to Docs/erd.mmd")


if __name__ == "__main__":
    main()
