"""Gera o relatorio HTML branded (kit 5-Day PoV) a partir do ScanResult."""

from __future__ import annotations

import html

from .model import ScanResult, Severity

# Paleta EPM Copilot
INK = "#171717"
LARANJA = "#E9560C"
OFF_WHITE = "#F5F5F5"

_SEV_COLOR = {
    "critical": "#C00000",
    "warning": "#E9560C",
    "info": "#1F4E79",
}
_SEV_LABEL = {"critical": "Critico", "warning": "Atencao", "info": "Info"}


def _esc(s: str) -> str:
    return html.escape(s, quote=True)


def render_html(result: ScanResult, title: str = "HFM Rules Scanner") -> str:
    s = result.summary()
    by = s["by_severity"]

    cards = "".join(
        f'<div class="card"><div class="num" style="color:{_SEV_COLOR[k]}">{by[k]}</div>'
        f'<div class="lbl">{_SEV_LABEL[k]}</div></div>'
        for k in ("critical", "warning", "info")
    )

    sections = []
    for rep in result.reports:
        rows = []
        for f in rep.findings:
            color = _SEV_COLOR[f.severity.value]
            rows.append(
                f"<tr>"
                f'<td><span class="pill" style="background:{color}">'
                f"{_SEV_LABEL[f.severity.value]}</span></td>"
                f"<td class='mono'>{f.rule_id}</td>"
                f"<td>L{f.line}</td>"
                f"<td><b>{_esc(f.title)}</b><br><span class='mono snip'>{_esc(f.snippet)}</span>"
                f"<br><span class='detail'>{_esc(f.detail)}</span></td>"
                f"</tr>"
            )
        body = (
            "".join(rows)
            if rows
            else '<tr><td colspan="4" class="ok">Nenhum achado neste arquivo.</td></tr>'
        )
        sections.append(
            f'<section><h2>{_esc(rep.file)} '
            f'<span class="meta">{rep.line_count} linhas · '
            f'{len(rep.subs)} Sub/Function</span></h2>'
            f'<table><thead><tr><th>Sev.</th><th>Regra</th><th>Linha</th>'
            f"<th>Achado</th></tr></thead><tbody>{body}</tbody></table></section>"
        )

    return f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_esc(title)}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif;
         color: {INK}; background: {OFF_WHITE}; margin: 0; padding: 0 0 60px; }}
  header {{ background: {INK}; color: #fff; padding: 28px 40px;
           border-bottom: 5px solid {LARANJA}; }}
  header h1 {{ margin: 0; font-size: 22px; }}
  header .sub {{ opacity: .75; font-size: 13px; margin-top: 4px; }}
  .wrap {{ max-width: 960px; margin: 0 auto; padding: 0 40px; }}
  .cards {{ display: flex; gap: 16px; margin: 28px 0; }}
  .card {{ flex: 1; background: #fff; border-radius: 10px; padding: 18px;
          text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.08); }}
  .card .num {{ font-size: 34px; font-weight: 700; }}
  .card .lbl {{ font-size: 12px; text-transform: uppercase; letter-spacing: .5px;
               color: #666; margin-top: 4px; }}
  section {{ background: #fff; border-radius: 10px; padding: 8px 22px 18px;
            margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }}
  h2 {{ font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px; }}
  h2 .meta {{ font-size: 12px; color: #999; font-weight: 400; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{ text-align: left; color: #888; font-size: 11px; text-transform: uppercase;
       padding: 6px 8px; }}
  td {{ padding: 8px; border-top: 1px solid #f0f0f0; vertical-align: top; }}
  .pill {{ color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px;
          white-space: nowrap; }}
  .mono {{ font-family: SFMono-Regular, Consolas, monospace; }}
  .snip {{ color: #444; font-size: 12px; }}
  .detail {{ color: #666; font-size: 12px; }}
  .ok {{ color: #006100; text-align: center; padding: 16px; }}
  footer {{ text-align: center; color: #999; font-size: 11px; margin-top: 30px; }}
  @media print {{ body {{ background: #fff; }} section, .card {{ box-shadow: none;
    border: 1px solid #eee; }} }}
</style></head>
<body>
<header>
  <h1>EPM Copilot · Analise Estatica de Regras HFM</h1>
  <div class="sub">Kit "5-Day Proof of Value" — leitura estatica, read-only ·
   Gerado em {_esc(result.generated_at)} · v{_esc(result.tool_version)}</div>
</header>
<div class="wrap">
  <div class="cards">{cards}
    <div class="card"><div class="num">{s['files']}</div>
      <div class="lbl">Arquivos</div></div>
    <div class="card"><div class="num">{s['subs']}</div>
      <div class="lbl">Sub/Function</div></div>
  </div>
  {''.join(sections)}
  <footer>EPM Copilot © MySynergy.ai · Analise heuristica read-only.
   Achados exigem validacao por especialista. Nenhuma conexao ao HFM foi feita.</footer>
</div></body></html>"""
