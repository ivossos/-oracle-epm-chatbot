// Builds the static site in dist/ from src/ and content.json. No dependencies.
//   node build.mjs           preview build: warns about missing values
//   node build.mjs --strict  publish build: fails if anything required is missing
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes('--strict');
const c = JSON.parse(readFileSync(join(root, 'content.json'), 'utf8'));

const required = ['calendly_url', 'contact_email', 'company_legal_name'];
const missing = required.filter((k) => !String(c[k] || '').trim());
if (c.result_value && !c.result_source) missing.push('result_source (every number needs a source)');
if (c.result_value && !c.result_label) missing.push('result_label');
if (c.screenshot_path && !c.screenshot_alt) missing.push('screenshot_alt');

if (missing.length) {
  const msg = `Missing in content.json: ${missing.join(', ')}`;
  if (strict) { console.error(`✗ ${msg}`); process.exit(1); }
  console.warn(`! ${msg} (preview build only, do not publish)`);
}

const vars = {
  ...c,
  calendly_url: c.calendly_url || '#agendamento-nao-configurado',
  year: String(new Date().getFullYear()),
  updated: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
  has_proof: c.years_epm || c.result_value ? '1' : '',
  no_result: c.result_value ? '' : '1',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(tpl) {
  // <!--if:key--> ... <!--endif:key-->  (inner blocks first, then outer)
  let prev;
  do {
    prev = tpl;
    tpl = tpl.replace(/[ \t]*<!--if:(\w+)-->\n?([\s\S]*?)[ \t]*<!--endif:\1-->\n?/g, (_, k, body) =>
      String(vars[k] || '').trim() ? body : '');
  } while (tpl !== prev);
  tpl = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`Unknown template key: ${k}`);
    return esc(vars[k]);
  });
  return tpl;
}

const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const page of ['index.html', '404.html', 'privacidade.html']) {
  const html = render(readFileSync(join(root, 'src', page), 'utf8'));
  const leftover = html.match(/\{\{|<!--(if|endif):/);
  if (leftover) throw new Error(`Unrendered template syntax in ${page}`);
  writeFileSync(join(out, page), html);
}
// Clean URL for the privacy page on hosts without rewrites.
mkdirSync(join(out, 'privacidade'), { recursive: true });
copyFileSync(join(out, 'privacidade.html'), join(out, 'privacidade', 'index.html'));

for (const f of ['styles.css', 'favicon.svg', 'og.png']) {
  if (existsSync(join(root, 'src', f))) copyFileSync(join(root, 'src', f), join(out, f));
}
if (c.screenshot_path) {
  const src = join(root, 'src', c.screenshot_path.replace(/^\//, ''));
  if (!existsSync(src)) { console.error(`✗ Screenshot not found: ${src}`); process.exit(1); }
  mkdirSync(dirname(join(out, c.screenshot_path)), { recursive: true });
  copyFileSync(src, join(out, c.screenshot_path));
}

console.log(`✓ Built ${strict ? 'publish' : 'preview'} site in dist/`);
