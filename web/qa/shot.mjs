// Usage: node qa/shot.mjs <origin> <outdir> [path...]
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const [origin = 'http://127.0.0.1:5190', out = 'qa/shots', ...paths] = process.argv.slice(2);
mkdirSync(out, {recursive: true});
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const targets = paths.length ? paths : ['/'];
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({viewport: {width, height: width > 500 ? 900 : 844}, deviceScaleFactor: 1, hasTouch: width < 500});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  for (const p of targets) {
    const t = Date.now();
    await page.goto(origin + p, {waitUntil: 'networkidle'});
    await page.waitForTimeout(p === '/' || p.startsWith('/?') ? 2500 : 600);
    const name = (p.replace(/[^a-z0-9]+/gi, '_') || 'root') + '-' + width;
    await page.screenshot({path: `${out}/${name}.png`});
    const fps = p === '/' ? await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })) : null;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(JSON.stringify({p, width, ms: Date.now() - t, fps, overflow, errors: errors.splice(0)}));
  }
  await ctx.close();
}
await browser.close();
