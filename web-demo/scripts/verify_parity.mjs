// Compara os achados do porte JS com o "esperado" do Python nas amostras.
// Uso: node scripts/verify_parity.mjs  (rodar da raiz do repo)
import { readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { scan } = require("../scanner.js").HFMScanner;

const dir = "samples";
const files = readdirSync(dir).filter((f) => /\.(rle|vbs)$/i.test(f)).sort();
const sources = files.map((f) => [f, readFileSync(`${dir}/${f}`, "utf8")]);

// JS
const js = scan(sources).reports.flatMap((r) =>
  r.findings.map((f) => `${f.file}:${f.line}:${f.rule_id}`)
).sort();

// Python (fonte da verdade)
const pyOut = execSync(
  `python3 -c "import json,glob,os;from scanner.cli import scan_sources;` +
  `s=[(os.path.basename(p),open(p,encoding='utf-8').read()) for p in sorted(glob.glob('samples/*.rle'))];` +
  `r=scan_sources(s);print(json.dumps(sorted(f['file']+':'+str(f['line'])+':'+f['rule_id'] ` +
  `for rep in r.to_dict()['reports'] for f in rep['findings'])))"`,
  { encoding: "utf8", env: { ...process.env, PYTHONPATH: process.cwd() } }
);
const py = JSON.parse(pyOut);

const same = JSON.stringify(js) === JSON.stringify(py);
console.log("JS :", JSON.stringify(js));
console.log("PY :", JSON.stringify(py));
console.log(same ? "PARITY OK — findings identicos" : "PARITY FAIL — divergencia!");
process.exit(same ? 0 : 1);
