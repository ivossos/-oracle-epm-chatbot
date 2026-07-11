"""
Parser leve para arquivos de regras HFM (.rle/.vbs) em VBScript.

Nao e um interpretador: extrai a estrutura suficiente para a analise
estatica — blocos Sub/Function, linhas logicas (com continuacao `_`
resolvida) e referencias a membros (A#, E#, I#, V#, C1#..C4# etc.).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# Dimensoes HFM: Scenario, Year, Period, View, Entity, Value, Account,
# ICP, Custom1-4. Prefixo de membro no formato <DIM>#<Membro>.
MEMBER_RE = re.compile(r"\b([SYPWEVAI]|C[1-4])#([A-Za-z0-9_%\[\]\. ]+)")

_SUB_START_RE = re.compile(r"^\s*(Sub|Function)\s+([A-Za-z_]\w*)", re.IGNORECASE)
_SUB_END_RE = re.compile(r"^\s*End\s+(Sub|Function)\b", re.IGNORECASE)


@dataclass
class LogicalLine:
    """Uma linha logica (continuacoes `_` ja unidas)."""

    text: str           # codigo sem comentario, continuacoes unidas
    raw: str            # primeira linha fisica, como no arquivo
    line: int           # numero da primeira linha fisica (1-indexed)
    sub: str | None     # Sub/Function que a contem, se houver


@dataclass
class ParsedFile:
    file: str
    physical_lines: list[str] = field(default_factory=list)
    logical_lines: list[LogicalLine] = field(default_factory=list)
    subs: list[str] = field(default_factory=list)

    @property
    def line_count(self) -> int:
        return len(self.physical_lines)


def _strip_comment(line: str) -> str:
    """Remove comentario VBScript (`'`) fora de string entre aspas."""
    out = []
    in_str = False
    for ch in line:
        if ch == '"':
            in_str = not in_str
        if ch == "'" and not in_str:
            break
        out.append(ch)
    return "".join(out)


def parse_text(text: str, filename: str = "<memoria>") -> ParsedFile:
    physical = text.splitlines()
    pf = ParsedFile(file=filename, physical_lines=physical)

    current_sub: str | None = None
    i = 0
    n = len(physical)
    while i < n:
        raw = physical[i]
        start_line = i + 1

        # Detecta abertura/fechamento de bloco na linha fisica crua.
        m = _SUB_START_RE.match(raw)
        if m:
            name = m.group(2)
            current_sub = name
            if name not in pf.subs:
                pf.subs.append(name)

        # Junta continuacoes de linha (`_` ao final, apos strip de comentario).
        code = _strip_comment(raw)
        joined = code.rstrip()
        while joined.endswith("_"):
            joined = joined[:-1].rstrip()
            i += 1
            if i >= n:
                break
            nxt = _strip_comment(physical[i])
            joined += " " + nxt.strip()

        pf.logical_lines.append(
            LogicalLine(
                text=joined.strip(),
                raw=raw.strip(),
                line=start_line,
                sub=current_sub,
            )
        )

        if _SUB_END_RE.match(raw):
            current_sub = None

        i += 1

    return pf


def parse_file(path: str) -> ParsedFile:
    # .rle costuma ser ASCII; toleramos BOM/UTF-16 exportados pelo HFM.
    with open(path, "rb") as fh:
        blob = fh.read()
    for enc in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            text = blob.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:  # pragma: no cover - fallback final
        text = blob.decode("utf-8", errors="replace")

    import os

    return parse_text(text, os.path.basename(path))


def members_in(text: str) -> list[tuple[str, str]]:
    """Retorna [(dim, membro)] referenciados no texto."""
    return [(m.group(1), m.group(2).strip()) for m in MEMBER_RE.finditer(text)]
