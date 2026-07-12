/* Renderiza o ScanResult (do scanner.js) no relatorio HTML branded.
 * Espelha scanner/report.py — mantido em paridade visual. */
(function (root) {
  "use strict";
  const SEV_COLOR = { critical: "#C00000", warning: "#E9560C", info: "#1F4E79" };
  const SEV_LABEL = { critical: "Critico", warning: "Atencao", info: "Info" };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render(result) {
    const s = result.summary, by = s.by_severity;
    const cards = ["critical", "warning", "info"].map((k) =>
      '<div class="card"><div class="num" style="color:' + SEV_COLOR[k] + '">' +
      by[k] + '</div><div class="lbl">' + SEV_LABEL[k] + "</div></div>").join("");

    const sections = result.reports.map((rep) => {
      const rows = rep.findings.length ? rep.findings.map((f) => {
        const color = SEV_COLOR[f.severity];
        const fix = f.fix ? '<div class="fix"><div class="fix-h"><span>✔ Correção sugerida</span>' +
          '<button class="copy" type="button" onclick="HFMReport.copyFix(this)">Copiar</button></div>' +
          "<pre>" + esc(f.fix) + "</pre></div>" : "";
        return "<tr><td><span class=\"pill\" style=\"background:" + color + "\">" +
          SEV_LABEL[f.severity] + "</span></td><td class='mono'>" + f.rule_id +
          "</td><td>L" + f.line + "</td><td><b>" + esc(f.title) +
          "</b><br><span class='mono snip'>" + esc(f.snippet) + "</span><br>" +
          "<span class='detail'>" + esc(f.detail) + "</span>" + fix + "</td></tr>";
      }).join("") : '<tr><td colspan="4" class="ok">Nenhum achado neste arquivo.</td></tr>';
      return '<section class="rep"><h2>' + esc(rep.file) + ' <span class="meta">' +
        rep.line_count + " linhas · " + rep.subs.length + " Sub/Function</span></h2>" +
        "<table><thead><tr><th>Sev.</th><th>Regra</th><th>Linha</th><th>Achado</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></section>";
    }).join("");

    return '<div class="cards">' + cards +
      '<div class="card"><div class="num">' + s.files + '</div><div class="lbl">Arquivos</div></div>' +
      '<div class="card"><div class="num">' + s.subs + '</div><div class="lbl">Sub/Function</div></div>' +
      '<div class="card fix-card"><div class="num" style="color:#006100">' + s.fixes +
      '</div><div class="lbl">Correções sugeridas</div></div></div>' + sections;
  }

  function copyFix(btn) {
    const pre = btn.parentElement.nextElementSibling;
    navigator.clipboard.writeText(pre.textContent).then(() => {
      const old = btn.textContent; btn.textContent = "Copiado ✓";
      setTimeout(() => { btn.textContent = old; }, 1500);
    });
  }

  root.HFMReport = { render, copyFix };
})(globalThis.window || globalThis);
