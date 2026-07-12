"""
UI web local do HFM Rules Scanner (stdlib only, sem dependencias).

Arraste arquivos .rle/.vbs no navegador -> o parser Python real roda
localmente e devolve o relatorio branded. Os arquivos sao lidos como
texto no navegador e enviados apenas para 127.0.0.1 (localhost); nada
sai da maquina. Nenhuma conexao ao HFM.

Uso:
    python3 -m scanner.web            # abre em http://127.0.0.1:8765
    python3 -m scanner.web --port 9000 --no-open
"""

from __future__ import annotations

import argparse
import json
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import __version__
from .cli import scan_sources
from .report import render_html

INK = "#171717"
LARANJA = "#E9560C"
OFF_WHITE = "#F5F5F5"

_INDEX = f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HFM Rules Scanner — EPM Copilot</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: {INK};
         background: {OFF_WHITE}; margin: 0; }}
  header {{ background: {INK}; color: #fff; padding: 24px 40px;
           border-bottom: 5px solid {LARANJA}; }}
  header h1 {{ margin: 0; font-size: 20px; }}
  header .sub {{ opacity: .75; font-size: 13px; margin-top: 4px; }}
  .wrap {{ max-width: 960px; margin: 0 auto; padding: 32px 40px; }}
  #drop {{ border: 3px dashed #ccc; border-radius: 14px; padding: 54px 20px;
          text-align: center; background: #fff; transition: .15s; cursor: pointer; }}
  #drop.hot {{ border-color: {LARANJA}; background: #fff7f2; }}
  #drop .big {{ font-size: 17px; font-weight: 600; }}
  #drop .small {{ color: #888; font-size: 13px; margin-top: 6px; }}
  #files {{ margin: 18px 0; font-size: 13px; color: #444; }}
  #files span {{ display: inline-block; background: #fff; border: 1px solid #eee;
                border-radius: 8px; padding: 4px 10px; margin: 3px; }}
  button {{ background: {LARANJA}; color: #fff; border: 0; border-radius: 8px;
           padding: 12px 26px; font-size: 15px; font-weight: 600; cursor: pointer; }}
  button:disabled {{ background: #ccc; cursor: default; }}
  .bar {{ display: flex; gap: 12px; align-items: center; margin-top: 8px; }}
  #err {{ color: #C00000; font-size: 13px; margin-top: 10px; }}
  iframe {{ width: 100%; height: 78vh; border: 1px solid #ddd; border-radius: 10px;
           margin-top: 24px; background: #fff; }}
  .hidden {{ display: none; }}
  a.badge {{ color: {LARANJA}; font-size: 13px; text-decoration: none; margin-left: 12px; }}
</style></head>
<body>
<header>
  <h1>EPM Copilot · HFM Rules Scanner</h1>
  <div class="sub">Kit "5-Day Proof of Value" — análise estática local, read-only ·
   v{__version__} · os arquivos não saem da máquina</div>
</header>
<div class="wrap">
  <div id="drop">
    <div class="big">Arraste arquivos .rle / .vbs aqui</div>
    <div class="small">ou clique para selecionar · processamento 100% local</div>
    <input id="picker" type="file" multiple accept=".rle,.vbs" class="hidden">
  </div>
  <div id="files"></div>
  <div class="bar">
    <button id="run" disabled>Analisar</button>
    <span id="status" class="small"></span>
    <a id="dl" class="badge hidden" download="hfm-report.html">⬇ baixar relatório</a>
  </div>
  <div id="err"></div>
  <iframe id="out" class="hidden" title="Relatório"></iframe>
</div>
<script>
  const drop = document.getElementById('drop');
  const picker = document.getElementById('picker');
  const filesDiv = document.getElementById('files');
  const runBtn = document.getElementById('run');
  const statusEl = document.getElementById('status');
  const errEl = document.getElementById('err');
  const out = document.getElementById('out');
  const dl = document.getElementById('dl');
  let picked = [];

  function show() {{
    filesDiv.innerHTML = picked.map(f => '<span>'+f.name+'</span>').join('');
    runBtn.disabled = picked.length === 0;
  }}
  function accept(list) {{
    picked = [...list].filter(f => /\\.(rle|vbs)$/i.test(f.name));
    errEl.textContent = picked.length < list.length
      ? 'Ignorados arquivos que não são .rle/.vbs.' : '';
    show();
  }}
  drop.addEventListener('click', () => picker.click());
  picker.addEventListener('change', e => accept(e.target.files));
  ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, e => {{
    e.preventDefault(); drop.classList.add('hot'); }}));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => {{
    e.preventDefault(); drop.classList.remove('hot'); }}));
  drop.addEventListener('drop', e => accept(e.dataTransfer.files));

  runBtn.addEventListener('click', async () => {{
    runBtn.disabled = true; statusEl.textContent = 'Lendo arquivos…'; errEl.textContent='';
    try {{
      const sources = await Promise.all(picked.map(f =>
        f.text().then(t => ({{ name: f.name, text: t }}))));
      statusEl.textContent = 'Analisando…';
      const resp = await fetch('/scan', {{
        method: 'POST', headers: {{'Content-Type':'application/json'}},
        body: JSON.stringify({{ files: sources }}) }});
      if (!resp.ok) throw new Error('HTTP '+resp.status);
      const html = await resp.text();
      out.srcdoc = html; out.classList.remove('hidden');
      const blob = new Blob([html], {{type:'text/html'}});
      dl.href = URL.createObjectURL(blob); dl.classList.remove('hidden');
      statusEl.textContent = 'Concluído.';
    }} catch (e) {{
      errEl.textContent = 'Erro: ' + e.message; statusEl.textContent = '';
    }} finally {{ runBtn.disabled = false; }}
  }});
</script>
</body></html>"""


class _Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/index.html"):
            self._send(200, _INDEX.encode("utf-8"), "text/html; charset=utf-8")
        else:
            self._send(404, b"not found", "text/plain")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/scan":
            self._send(404, b"not found", "text/plain")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            sources = [(f["name"], f["text"]) for f in payload.get("files", [])]
            if not sources:
                raise ValueError("nenhum arquivo enviado")
            result = scan_sources(sources)
            html = render_html(result)
            self._send(200, html.encode("utf-8"), "text/html; charset=utf-8")
        except Exception as exc:  # devolve erro legivel ao cliente
            self._send(400, f"erro: {exc}".encode("utf-8"), "text/plain; charset=utf-8")

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        return


def serve(port: int = 8765, open_browser: bool = True) -> None:
    server = ThreadingHTTPServer(("127.0.0.1", port), _Handler)
    url = f"http://127.0.0.1:{port}"
    print(f"HFM Rules Scanner UI  ·  {url}  (Ctrl+C para parar)")
    if open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando.")
    finally:
        server.server_close()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="hfm-scanner-web", description=__doc__)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true", help="nao abrir o navegador")
    args = ap.parse_args(argv)
    serve(port=args.port, open_browser=not args.no_open)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
