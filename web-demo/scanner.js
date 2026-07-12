/*
 * HFM Rules Scanner — porte JS do motor Python (scanner/parser.py + checks.py).
 * DEMO estatico: roda 100% no navegador; os arquivos NAO saem da maquina.
 * Mantido em paridade com o backend Python (tests/ garantem o Python;
 * scripts/verify_parity.mjs compara os dois nas amostras).
 */
(function (root) {
  "use strict";

  // ---- Parser -------------------------------------------------------------
  const SUB_START = /^\s*(Sub|Function)\s+([A-Za-z_]\w*)/i;
  const SUB_END = /^\s*End\s+(Sub|Function)\b/i;

  function stripComment(line) {
    let out = "", inStr = false;
    for (const ch of line) {
      if (ch === '"') inStr = !inStr;
      if (ch === "'" && !inStr) break;
      out += ch;
    }
    return out;
  }

  function parse(text, filename) {
    const physical = text.split(/\r?\n/);
    const logical = [], subs = [];
    let cur = null, i = 0;
    while (i < physical.length) {
      const raw = physical[i];
      const start = i + 1;
      const m = raw.match(SUB_START);
      if (m) { cur = m[2]; if (!subs.includes(cur)) subs.push(cur); }
      let joined = stripComment(raw).replace(/\s+$/, "");
      while (joined.endsWith("_")) {
        joined = joined.slice(0, -1).replace(/\s+$/, "");
        i += 1;
        if (i >= physical.length) break;
        joined += " " + stripComment(physical[i]).trim();
      }
      logical.push({ text: joined.trim(), raw: raw.trim(), line: start, sub: cur });
      if (SUB_END.test(raw)) cur = null;
      i += 1;
    }
    return { file: filename, lineCount: physical.length, logical, subs };
  }

  // ---- Checks -------------------------------------------------------------
  const SEV_RANK = { critical: 0, warning: 1, info: 2 };

  const YEAR = /"[^"]*\b20[0-9]{2}\b[^"]*"/;
  function checkYear(pf) {
    const out = [];
    for (const ll of pf.logical) {
      if (YEAR.test(ll.text)) {
        out.push({
          rule_id: "HFM001", title: "Ano fixo (hardcoded) na regra",
          severity: "warning", file: pf.file, line: ll.line, snippet: ll.raw,
          detail: "Ano literal encontrado. Use @CUR/Y#Cur ou variavel de POV para a regra sobreviver a virada de ano.",
          fix: ll.raw.replace(/\b20[0-9]{2}\b/g, "@CUR"),
        });
      }
    }
    return out;
  }

  const MAGIC = /HS\.Exp\s+"[^"]*=\s*-?\d+(\.\d+)?\s*"/i;
  function checkMagic(pf) {
    const out = [];
    for (const ll of pf.logical) {
      if (MAGIC.test(ll.text)) {
        out.push({
          rule_id: "HFM002", title: "Valor numerico fixo atribuido em HS.Exp",
          severity: "warning", file: pf.file, line: ll.line, snippet: ll.raw,
          detail: "Constante numerica gravada diretamente no consolidado. Externalize para driver/premissa ou membro de dados.",
          fix: ll.raw.replace(/=\s*(-?\d+(?:\.\d+)?)\s*(")/,
            "= A#Driver$2  ' externalize $1 para conta/premissa"),
        });
      }
    }
    return out;
  }

  const DIV = /HS\.Exp\s+"[^"]*\/[^"]*"/i;
  const GUARD = /<>\s*0|>\s*0|=\s*0\s+Then|IsZero/i;
  const DIV_PARTS = /HS\.Exp\s+"\s*([AEIVSYPWC][^"=]*?)\s*=\s*[^"]*?\/\s*((?:[AEIVSYPWC]\d?#[A-Za-z0-9_%[\].]+|[A-Za-z_]\w*))/i;
  function divisionFix(raw) {
    const m = raw.match(DIV_PARTS);
    if (!m) return null;
    const lhs = m[1].trim(), den = m[2].trim();
    const indent = raw.slice(0, raw.length - raw.replace(/^\s+/, "").length);
    const expr = raw.trim();
    const cond = den.includes("#") ? 'HS.GetCell("' + den + '")' : den;
    return indent + "If " + cond + " <> 0 Then\n" +
      indent + "    " + expr + "\n" +
      indent + "Else\n" +
      indent + '    HS.Clear "' + lhs + '"\n' +
      indent + "End If";
  }
  function checkDivision(pf) {
    const out = [], L = pf.logical;
    for (let idx = 0; idx < L.length; idx++) {
      const ll = L[idx];
      if (!DIV.test(ll.text)) continue;
      let guarded = false;
      for (let p = Math.max(0, idx - 3); p < idx; p++) {
        if (L[p].sub === ll.sub && GUARD.test(L[p].text)) { guarded = true; break; }
      }
      if (!guarded) {
        out.push({
          rule_id: "HFM003", title: "Divisao sem protecao contra divisao por zero",
          severity: "critical", file: pf.file, line: ll.line, snippet: ll.raw,
          detail: "Divisao sem checagem previa de denominador <> 0. Pode gerar erro/#IND no consolidado. Proteja com If <denominador> <> 0 Then ... Else HS.Clear.",
          fix: divisionFix(ll.raw),
        });
      }
    }
    return out;
  }

  const ASSIGN = /HS\.Exp\s+"([AEIVSYPW]|C[1-4])#([^"=]+?)\s*=\s*(.+?)"/i;
  function checkCircular(pf) {
    const out = [];
    for (const ll of pf.logical) {
      const m = ll.text.match(ASSIGN);
      if (!m) continue;
      const token = m[1] + "#" + m[2].trim(), rhs = m[3];
      if (new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(rhs)) {
        out.push({
          rule_id: "HFM004", title: "Possivel logica circular (alvo referenciado na origem)",
          severity: "critical", file: pf.file, line: ll.line, snippet: ll.raw,
          detail: "O membro '" + token + "' aparece nos dois lados da atribuicao. Revise para evitar acumulo/recalculo circular.",
          fix: ll.raw.replace(/\s+$/, "") + "\n' Evite '" + token +
            "' nos dois lados: acumule num membro auxiliar,\n' ex.: HS.Exp \"" +
            token + " = A#_Base + " + rhs.split(token).join("A#_Delta").trim() + "\"",
        });
      }
    }
    return out;
  }

  const HS = /\b(HS|Hs|hs|hS)\./g;
  function checkCase(pf) {
    const variants = {}, firstLine = {};
    for (const ll of pf.logical) {
      let m;
      HS.lastIndex = 0;
      while ((m = HS.exec(ll.text)) !== null) {
        variants[m[1]] = (variants[m[1]] || 0) + 1;
        if (!(m[1] in firstLine)) firstLine[m[1]] = ll.line;
      }
    }
    const keys = Object.keys(variants);
    if (keys.length <= 1) return [];
    const dominant = keys.reduce((a, b) => (variants[b] > variants[a] ? b : a));
    const minor = keys.filter((v) => v !== dominant);
    const line = Math.min(...minor.map((v) => firstLine[v]));
    return [{
      rule_id: "HFM005", title: "Inconsistencia de caixa no prefixo HS.",
      severity: "info", file: pf.file, line,
      snippet: "variantes: " + keys.slice().sort().join(", "),
      detail: "Mistura de 'HS.'/'Hs.' no mesmo arquivo. Padronize (o guia Oracle usa 'HS.') para legibilidade e busca.",
      fix: "' Padronize todas as chamadas para '" + dominant + ".' (localize e substitua: " +
        minor.map((v) => v + ".").join(", ") + " -> " + dominant + ".)",
    }];
  }

  const CHECKS = [checkYear, checkMagic, checkDivision, checkCircular, checkCase];

  function scan(sources) {
    const reports = sources.map(([name, text]) => {
      const pf = parse(text, name);
      const findings = [];
      for (const chk of CHECKS) findings.push(...chk(pf));
      findings.sort((a, b) => a.line - b.line || SEV_RANK[a.severity] - SEV_RANK[b.severity]);
      return { file: pf.file, subs: pf.subs, line_count: pf.lineCount, findings };
    });
    const by = { critical: 0, warning: 0, info: 0 };
    let fixes = 0;
    for (const r of reports) for (const f of r.findings) {
      by[f.severity]++; if (f.fix) fixes++;
    }
    return {
      generated_at: new Date().toISOString().slice(0, 16).replace("T", " "),
      reports,
      summary: {
        files: reports.length,
        subs: reports.reduce((n, r) => n + r.subs.length, 0),
        findings: reports.reduce((n, r) => n + r.findings.length, 0),
        by_severity: by, fixes,
      },
    };
  }

  root.HFMScanner = { parse, scan, CHECKS };
})(typeof module !== "undefined" ? module.exports : (globalThis.window || globalThis));
