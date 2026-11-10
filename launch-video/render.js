const { chromium } = require('playwright');
const FPS = 30, W = +process.argv[2], N = +process.argv[3];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForFunction('window.READY');
  const total = Math.round((await p.evaluate('TL.total')) * FPS);
  for (let f = W; f < total; f += N) {
    await p.evaluate(t => render(t), f / FPS);
    await p.screenshot({ path: `frames/f${String(f).padStart(5, '0')}.png` });
  }
  await b.close(); console.log('worker', W, 'done', total);
})();
