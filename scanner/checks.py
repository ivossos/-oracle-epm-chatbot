"""
Verificacoes (checks) de analise estatica sobre regras HFM.

Cada check recebe um ParsedFile e devolve uma lista de Finding.
Calibrado contra amostras reais do HFM 11.2 para evitar falsos
positivos (ex.: divisao ja protegida por If <> 0).
"""

from __future__ import annotations

import re

from .model import Finding, Severity
from .parser import ParsedFile

# ---------------------------------------------------------------------------
# HFM001 — Ano hardcoded ("2024", "2025", ...) em membro de dimensao.
# ---------------------------------------------------------------------------
_YEAR_RE = re.compile(r'"[^"]*\b(20[0-9]{2})\b[^"]*"')


def check_hardcoded_year(pf: ParsedFile) -> list[Finding]:
    out = []
    for ll in pf.logical_lines:
        m = _YEAR_RE.search(ll.text)
        if m:
            fix = re.sub(r"\b20[0-9]{2}\b", "@CUR", ll.raw)  # troca ano por @CUR
            out.append(
                Finding(
                    rule_id="HFM001",
                    title="Ano fixo (hardcoded) na regra",
                    severity=Severity.WARNING,
                    file=pf.file,
                    line=ll.line,
                    snippet=ll.raw,
                    detail=(
                        "Ano literal encontrado. Use @CUR/Y#Cur ou variavel de "
                        "POV para a regra sobreviver a virada de ano."
                    ),
                    fix=fix,
                )
            )
    return out


# ---------------------------------------------------------------------------
# HFM002 — Numero magico atribuido a conta via HS.Exp ("A#x = 12345").
# ---------------------------------------------------------------------------
_MAGIC_RE = re.compile(r'HS\.Exp\s+"[^"]*=\s*-?\d+(\.\d+)?\s*"', re.IGNORECASE)


def check_magic_number(pf: ParsedFile) -> list[Finding]:
    out = []
    for ll in pf.logical_lines:
        if _MAGIC_RE.search(ll.text):
            # Sugere ler o valor de uma conta driver em vez do literal.
            fix = re.sub(
                r'=\s*(-?\d+(?:\.\d+)?)\s*(")',
                r'= A#Driver\2  \' externalize \1 para conta/premissa',
                ll.raw,
            )
            out.append(
                Finding(
                    rule_id="HFM002",
                    title="Valor numerico fixo atribuido em HS.Exp",
                    severity=Severity.WARNING,
                    file=pf.file,
                    line=ll.line,
                    snippet=ll.raw,
                    detail=(
                        "Constante numerica gravada diretamente no consolidado. "
                        "Externalize para driver/premissa ou membro de dados."
                    ),
                    fix=fix,
                )
            )
    return out


# ---------------------------------------------------------------------------
# HFM003 — Divisao sem protecao contra zero.
# So dispara se NAO houver um If ...<> 0 / <>0 protegendo o bloco.
# ---------------------------------------------------------------------------
_DIV_RE = re.compile(r'HS\.Exp\s+"[^"]*/[^"]*"', re.IGNORECASE)
_GUARD_RE = re.compile(r"<>\s*0|>\s*0|=\s*0\s+Then|IsZero", re.IGNORECASE)
# Captura alvo (LHS) e denominador (1o token apos '/') para gerar a guarda.
_DIV_PARTS_RE = re.compile(
    r'HS\.Exp\s+"\s*(?P<lhs>[AEIVSYPWC][^"=]*?)\s*=\s*[^"]*?/\s*'
    r'(?P<den>(?:[AEIVSYPWC]\d?#[A-Za-z0-9_%\[\]\.]+|[A-Za-z_]\w*))',
    re.IGNORECASE,
)


def _division_fix(raw: str) -> str | None:
    """Gera bloco If <denominador> <> 0 Then ... Else HS.Clear a partir da linha."""
    m = _DIV_PARTS_RE.search(raw)
    if not m:
        return None
    lhs = m.group("lhs").strip()
    den = m.group("den").strip()
    indent = raw[: len(raw) - len(raw.lstrip())]
    expr = raw.strip()
    # Se o denominador for um membro (tem #), le via GetCell; senao usa a variavel.
    cond = f'HS.GetCell("{den}")' if "#" in den else den
    return (
        f"{indent}If {cond} <> 0 Then\n"
        f"{indent}    {expr}\n"
        f"{indent}Else\n"
        f'{indent}    HS.Clear "{lhs}"\n'
        f"{indent}End If"
    )


def check_unguarded_division(pf: ParsedFile) -> list[Finding]:
    out = []
    lines = pf.logical_lines
    for idx, ll in enumerate(lines):
        if not _DIV_RE.search(ll.text):
            continue
        # Procura guarda nas 3 linhas logicas anteriores do mesmo Sub.
        guarded = False
        for prev in range(max(0, idx - 3), idx):
            if lines[prev].sub == ll.sub and _GUARD_RE.search(lines[prev].text):
                guarded = True
                break
        if not guarded:
            out.append(
                Finding(
                    rule_id="HFM003",
                    title="Divisao sem protecao contra divisao por zero",
                    severity=Severity.CRITICAL,
                    file=pf.file,
                    line=ll.line,
                    snippet=ll.raw,
                    detail=(
                        "Divisao sem checagem previa de denominador <> 0. "
                        "Pode gerar erro/#IND no consolidado. Proteja com "
                        "If <denominador> <> 0 Then ... Else HS.Clear."
                    ),
                    fix=_division_fix(ll.raw),
                )
            )
    return out


# ---------------------------------------------------------------------------
# HFM004 — Logica circular direta (A#x = A#x + ...).
# ---------------------------------------------------------------------------
_ASSIGN_RE = re.compile(r'HS\.Exp\s+"([AEIVSYPW]|C[1-4])#([^"=]+?)\s*=\s*(.+?)"',
                        re.IGNORECASE)


def check_circular(pf: ParsedFile) -> list[Finding]:
    out = []
    for ll in pf.logical_lines:
        m = _ASSIGN_RE.search(ll.text)
        if not m:
            continue
        dim, target, rhs = m.group(1), m.group(2).strip(), m.group(3)
        token = f"{dim}#{target}"
        if re.search(re.escape(token) + r"\b", rhs):
            # Sugere separar o acumulo num membro/variavel auxiliar.
            fix = (
                f'{ll.raw.rstrip()}\n'
                f"' Evite '{token}' nos dois lados: acumule num membro auxiliar,\n"
                f"' ex.: HS.Exp \"{token} = A#_Base + {rhs.replace(token, 'A#_Delta').strip()}\""
            )
            out.append(
                Finding(
                    rule_id="HFM004",
                    title="Possivel logica circular (alvo referenciado na origem)",
                    severity=Severity.CRITICAL,
                    file=pf.file,
                    line=ll.line,
                    snippet=ll.raw,
                    detail=(
                        f"O membro '{token}' aparece nos dois lados da atribuicao. "
                        "Revise para evitar acumulo/recalculo circular."
                    ),
                    fix=fix,
                )
            )
    return out


# ---------------------------------------------------------------------------
# HFM005 — Inconsistencia de caixa no prefixo HS (HS. vs Hs. vs hs.).
# ---------------------------------------------------------------------------
_HS_RE = re.compile(r"\b(HS|Hs|hs|hS)\.")


def check_hs_case(pf: ParsedFile) -> list[Finding]:
    variants: dict[str, int] = {}
    first_line: dict[str, int] = {}
    for ll in pf.logical_lines:
        for m in _HS_RE.finditer(ll.text):
            v = m.group(1)
            variants[v] = variants.get(v, 0) + 1
            first_line.setdefault(v, ll.line)
    if len(variants) <= 1:
        return []
    # Reporta uma vez por arquivo, na primeira ocorrencia da variante minoritaria.
    dominant = max(variants, key=lambda k: variants[k])
    minor = [v for v in variants if v != dominant]
    line = min(first_line[v] for v in minor)
    fix = (
        f"' Padronize todas as chamadas para '{dominant}.' "
        f"(localize e substitua: {', '.join(v + '.' for v in minor)} -> {dominant}.)"
    )
    return [
        Finding(
            rule_id="HFM005",
            title="Inconsistencia de caixa no prefixo HS.",
            severity=Severity.INFO,
            file=pf.file,
            line=line,
            snippet=f"variantes: {', '.join(sorted(variants))}",
            detail=(
                "Mistura de 'HS.'/'Hs.' no mesmo arquivo. Padronize (o guia "
                "Oracle usa 'HS.') para legibilidade e busca."
            ),
            fix=fix,
        )
    ]


ALL_CHECKS = [
    check_hardcoded_year,
    check_magic_number,
    check_unguarded_division,
    check_circular,
    check_hs_case,
]


def run_all(pf: ParsedFile) -> list[Finding]:
    findings: list[Finding] = []
    for chk in ALL_CHECKS:
        findings.extend(chk(pf))
    findings.sort(key=lambda f: (f.line, f.severity.rank))
    return findings
