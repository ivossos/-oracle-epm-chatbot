// Renders index.html frame by frame and muxes the ElevenLabs narration.
// Usage: node render.mjs [--fps 30] [--preview 5,15,30] [--out radar-ia-brasil-2026-10-31.mp4]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('--fps', 30);
const OUT = opt('--out', args.includes('--wide') ? 'radar-ia-brasil-2026-10-31-16x9.mp4' : 'radar-ia-brasil-2026-10-31.mp4');
const PREVIEW = opt('--preview', null);
const WIDE = args.includes('--wide');
const VW = WIDE ? 1920 : 1080, VH = WIDE ? 1080 : 1920;
const ROOT = path.dirname(new URL(import.meta.url).pathname);

// tiny static server (fonts need http, not file://)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(`http://127.0.0.1:${port}/index.html${WIDE ? '?wide' : ''}`);
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);

if (PREVIEW) {
  fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
  for (const t of PREVIEW.split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t);
    await page.screenshot({ path: path.join(ROOT, 'preview', `${WIDE ? 'w' : 't'}${String(t).padStart(5, '0')}.png`) });
  }
  await browser.close(); server.close(); process.exit(0);
}

const frames = Math.ceil(duration * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-itsoffset', '0.6', '-i', path.join(ROOT, 'assets/narracao.mp3'),
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-t', String(duration),
  path.join(ROOT, OUT)], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.seek(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close(); server.close();
console.log('done ->', OUT);
