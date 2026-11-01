// Renders src/og.png (1200x630) for LinkedIn/WhatsApp previews. Uses the page's own tokens.
//   node scripts/og.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Playwright is preinstalled globally in some environments; require() honours NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');

const html = `<!doctype html><html><head><style>${css}
  body { width: 1200px; height: 630px; margin: 0; display: flex; flex-direction: column; justify-content: space-between;
         padding: var(--space-9); background: var(--color-bg); }
  h1 { font-size: 4rem; max-width: 18ch; margin: 0; }
  .bar { width: var(--space-9); height: var(--space-2); background: var(--color-accent); margin-bottom: var(--space-6); }
  .foot { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-xl); }
  .brand { font-weight: var(--weight-bold); }
</style></head><body>
  <div><div class="bar"></div><h1>Pergunte ao seu FCCS por que o resultado variou.</h1></div>
  <div class="foot"><span class="brand">EPM Copilot</span><span class="muted">Demo de 30 min · somente leitura</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.screenshot({ path: join(root, 'src', 'og.png') });
await browser.close();
console.log('✓ Wrote src/og.png');
