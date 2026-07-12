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

_EDITOR_SAMPLE = """Sub Calculate()
    ' Cole ou edite sua regra HFM aqui e clique em Analisar.
    HS.Exp "A#GrossMargin = A#Sales - A#COGS"

    ' Exemplo de divisao SEM protecao (dispara HFM003 - critico):
    HS.Exp "A#Margem = A#Lucro / A#Receita"
End Sub"""

# String literal JS seguro (aspas e quebras de linha escapadas).
_EDITOR_SAMPLE_JS = json.dumps(_EDITOR_SAMPLE)

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
  .tabs {{ display: flex; gap: 4px; margin-bottom: 18px; }}
  .tab {{ background: #eee; color: #555; border: 0; border-radius: 8px 8px 0 0;
         padding: 10px 22px; font-size: 14px; font-weight: 600; cursor: pointer; }}
  .tab.active {{ background: #fff; color: {INK}; box-shadow: 0 -2px 0 {LARANJA} inset; }}
  .pane {{ display: none; }}
  .pane.active {{ display: block; }}
  #drop {{ border: 3px dashed #ccc; border-radius: 14px; padding: 54px 20px;
          text-align: center; background: #fff; transition: .15s; cursor: pointer; }}
  #drop.hot {{ border-color: {LARANJA}; background: #fff7f2; }}
  #drop .big {{ font-size: 17px; font-weight: 600; }}
  #drop .small {{ color: #888; font-size: 13px; margin-top: 6px; }}
  #files {{ margin: 18px 0; font-size: 13px; color: #444; }}
  #files span {{ display: inline-block; background: #fff; border: 1px solid #eee;
                border-radius: 8px; padding: 4px 10px; margin: 3px; }}
  .ed-name {{ font-family: SFMono-Regular, Consolas, monospace; font-size: 13px;
             border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px;
             width: 240px; margin-bottom: 10px; }}
  .editor-shell {{ position: relative; border: 1px solid #ddd; border-radius: 10px;
                  overflow: hidden; background: #fff; display: flex; }}
  #gutter {{ background: #fafafa; color: #aaa; text-align: right; padding: 14px 8px;
            font-family: SFMono-Regular, Consolas, monospace; font-size: 13px;
            line-height: 1.5; user-select: none; white-space: pre; border-right: 1px solid #eee; }}
  #code {{ flex: 1; border: 0; outline: 0; resize: vertical; min-height: 300px;
          padding: 14px 12px; font-family: SFMono-Regular, Consolas, monospace;
          font-size: 13px; line-height: 1.5; tab-size: 4; color: {INK}; }}
  button {{ background: {LARANJA}; color: #fff; border: 0; border-radius: 8px;
           padding: 12px 26px; font-size: 15px; font-weight: 600; cursor: pointer; }}
  button.ghost {{ background: #fff; color: {LARANJA}; border: 1px solid {LARANJA};
                 padding: 11px 18px; font-size: 13px; }}
  button:disabled {{ background: #ccc; cursor: default; }}
  .bar {{ display: flex; gap: 12px; align-items: center; margin-top: 12px; flex-wrap: wrap; }}
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
  <div class="tabs">
    <button class="tab active" data-pane="p-files">📁 Arquivos</button>
    <button class="tab" data-pane="p-editor">✏️ Editor</button>
  </div>

  <div id="p-files" class="pane active">
    <div id="drop">
      <div class="big">Arraste arquivos .rle / .vbs aqui</div>
      <div class="small">ou clique para selecionar · processamento 100% local</div>
      <input id="picker" type="file" multiple accept=".rle,.vbs" class="hidden">
    </div>
    <div id="files"></div>
    <div class="bar">
      <button id="run" disabled>Analisar</button>
    </div>
  </div>

  <div id="p-editor" class="pane">
    <input id="ed-name" class="ed-name" value="editor.rle"
           title="Nome do arquivo lógico usado no relatório">
    <div class="editor-shell">
      <div id="gutter">1</div>
      <textarea id="code" spellcheck="false"
        placeholder="Cole ou digite a regra HFM (VBScript) aqui…"></textarea>
    </div>
    <div class="bar">
      <button id="run-ed">Analisar</button>
      <button id="load-sample" class="ghost" type="button">Carregar exemplo</button>
      <button id="clear-ed" class="ghost" type="button">Limpar</button>
    </div>
  </div>

  <div class="bar">
    <span id="status" class="small"></span>
    <a id="dl" class="badge hidden" download="hfm-report.html">⬇ baixar relatório</a>
  </div>
  <div id="err"></div>
  <iframe id="out" class="hidden" title="Relatório"></iframe>
</div>
<script>
  const $ = id => document.getElementById(id);
  const drop = $('drop'), picker = $('picker'), filesDiv = $('files');
  const runBtn = $('run'), runEd = $('run-ed');
  const statusEl = $('status'), errEl = $('err'), out = $('out'), dl = $('dl');
  const code = $('code'), gutter = $('gutter'), edName = $('ed-name');
  const SAMPLE = {_EDITOR_SAMPLE_JS};
  let picked = [];

  // ---- Tabs ----
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {{
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $(t.dataset.pane).classList.add('active');
  }}));

  // ---- Editor gutter (line numbers) ----
  function syncGutter() {{
    const n = code.value.split('\\n').length || 1;
    let s = ''; for (let i = 1; i <= n; i++) s += i + '\\n';
    gutter.textContent = s.trimEnd();
  }}
  code.addEventListener('input', syncGutter);
  code.addEventListener('scroll', () => {{ gutter.scrollTop = code.scrollTop; }});
  $('load-sample').addEventListener('click', () => {{ code.value = SAMPLE; syncGutter(); }});
  $('clear-ed').addEventListener('click', () => {{ code.value = ''; syncGutter(); }});
  syncGutter();

  // ---- Shared scan call ----
  async function runScan(sources, label) {{
    statusEl.textContent = 'Analisando…'; errEl.textContent = '';
    try {{
      const resp = await fetch('/scan', {{
        method: 'POST', headers: {{'Content-Type':'application/json'}},
        body: JSON.stringify({{ files: sources }}) }});
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' — ' + (await resp.text()));
      const html = await resp.text();
      out.srcdoc = html; out.classList.remove('hidden');
      const blob = new Blob([html], {{type:'text/html'}});
      dl.href = URL.createObjectURL(blob); dl.classList.remove('hidden');
      statusEl.textContent = 'Concluído.';
    }} catch (e) {{
      errEl.textContent = 'Erro: ' + e.message; statusEl.textContent = '';
    }}
  }}

  // ---- Files pane ----
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
    runBtn.disabled = true; statusEl.textContent = 'Lendo arquivos…';
    try {{
      const sources = await Promise.all(picked.map(f =>
        f.text().then(t => ({{ name: f.name, text: t }}))));
      await runScan(sources);
    }} finally {{ runBtn.disabled = false; }}
  }});

  // ---- Editor pane ----
  runEd.addEventListener('click', async () => {{
    const text = code.value;
    if (!text.trim()) {{ errEl.textContent = 'Editor vazio.'; return; }}
    let name = (edName.value || 'editor.rle').trim();
    if (!/\\.(rle|vbs)$/i.test(name)) name += '.rle';
    runEd.disabled = true;
    try {{ await runScan([{{ name, text }}]); }}
    finally {{ runEd.disabled = false; }}
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
