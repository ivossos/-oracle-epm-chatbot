"""
CLI do HFM Rules Scanner.

Uso:
    python3 -m scanner.cli <arquivo-ou-pasta> [...] [--json OUT.json] [--html OUT.html]

Sem conexao ao HFM: apenas le arquivos .rle/.vbs exportados.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import glob
import json
import os
import sys

from . import __version__
from .checks import run_all
from .model import FileReport, ScanResult
from .parser import parse_file


def _collect(paths: list[str]) -> list[str]:
    files: list[str] = []
    for p in paths:
        if os.path.isdir(p):
            for ext in ("*.rle", "*.vbs"):
                files.extend(glob.glob(os.path.join(p, "**", ext), recursive=True))
        else:
            files.append(p)
    return sorted(set(files))


def scan(paths: list[str]) -> ScanResult:
    result = ScanResult(
        generated_at=_dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        tool_version=__version__,
    )
    for path in _collect(paths):
        pf = parse_file(path)
        rep = FileReport(file=pf.file, subs=pf.subs, line_count=pf.line_count)
        rep.findings = run_all(pf)
        result.reports.append(rep)
    return result


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="hfm-scanner", description=__doc__)
    ap.add_argument("paths", nargs="+", help="arquivos .rle/.vbs ou pastas")
    ap.add_argument("--json", dest="json_out", help="grava achados em JSON")
    ap.add_argument("--html", dest="html_out", help="grava relatorio HTML branded")
    args = ap.parse_args(argv)

    result = scan(args.paths)
    if not result.reports:
        print("Nenhum arquivo .rle/.vbs encontrado.", file=sys.stderr)
        return 2

    s = result.summary()
    print(f"HFM Rules Scanner v{__version__}")
    print(f"  arquivos: {s['files']}  |  Sub/Function: {s['subs']}  |  "
          f"achados: {s['findings']}")
    bysev = s["by_severity"]
    print(f"  criticos: {bysev['critical']}  atencao: {bysev['warning']}  "
          f"info: {bysev['info']}")
    for rep in result.reports:
        for f in rep.findings:
            print(f"  [{f.severity.value:>8}] {rep.file}:{f.line} "
                  f"{f.rule_id} {f.title}")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(result.to_dict(), fh, ensure_ascii=False, indent=2)
        print(f"JSON gravado em {args.json_out}")

    if args.html_out:
        from .report import render_html

        with open(args.html_out, "w", encoding="utf-8") as fh:
            fh.write(render_html(result))
        print(f"HTML gravado em {args.html_out}")

    # exit code 1 se houver criticos (util para CI/gate de partner).
    return 1 if bysev["critical"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
