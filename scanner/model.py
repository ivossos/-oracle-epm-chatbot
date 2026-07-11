"""Modelo de dados dos achados (findings) da analise estatica HFM."""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    """Severidade de um achado, do mais critico ao informativo."""

    CRITICAL = "critical"  # risco de resultado incorreto no consolidado
    WARNING = "warning"    # ma pratica / risco de manutencao
    INFO = "info"          # observacao / higiene de codigo

    @property
    def rank(self) -> int:
        return {"critical": 0, "warning": 1, "info": 2}[self.value]


@dataclass
class Finding:
    """Um achado individual em um arquivo de regras."""

    rule_id: str          # ex.: "HFM001"
    title: str            # titulo curto e legivel
    severity: Severity
    file: str             # nome do arquivo
    line: int             # linha 1-indexed
    snippet: str          # trecho da linha
    detail: str           # explicacao + recomendacao

    def to_dict(self) -> dict[str, Any]:
        d = dataclasses.asdict(self)
        d["severity"] = self.severity.value
        return d


@dataclass
class FileReport:
    """Resultado da analise de um unico arquivo."""

    file: str
    subs: list[str] = field(default_factory=list)   # nomes de Sub/Function
    line_count: int = 0
    findings: list[Finding] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "file": self.file,
            "subs": self.subs,
            "line_count": self.line_count,
            "findings": [f.to_dict() for f in self.findings],
            "counts": self.counts(),
        }

    def counts(self) -> dict[str, int]:
        out = {s.value: 0 for s in Severity}
        for f in self.findings:
            out[f.severity.value] += 1
        return out


@dataclass
class ScanResult:
    """Resultado agregado de uma varredura (varios arquivos)."""

    generated_at: str
    tool_version: str
    reports: list[FileReport] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "generated_at": self.generated_at,
            "tool_version": self.tool_version,
            "summary": self.summary(),
            "reports": [r.to_dict() for r in self.reports],
        }

    def summary(self) -> dict[str, Any]:
        totals = {s.value: 0 for s in Severity}
        for r in self.reports:
            for k, v in r.counts().items():
                totals[k] += v
        return {
            "files": len(self.reports),
            "subs": sum(len(r.subs) for r in self.reports),
            "findings": sum(len(r.findings) for r in self.reports),
            "by_severity": totals,
        }
