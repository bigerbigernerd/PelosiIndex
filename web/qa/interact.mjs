// Interaction QA against a running build: node qa/interact.mjs <origin> <outdir>
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
const [origin = 'http://127.0.0.1:5191', out = 'qa/interact'] = process.argv.slice(2);
mkdirSync(out, {recursive: true});
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({executablePath});
const results = [];
const check = (name, ok, extra = {}) => { results.push({name, ok: !!ok, ...extra}); console.log((ok ? 'PASS ' : 'FAIL ') + name, JSON.stringify(extra)); };
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({viewport: {width, height: width > 500 ? 900 : 844}, hasTouch: width < 500});
  await ctx.addInitScript(() => localStorage.setItem('pp-analytics-optout', '1'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const t0 = Date.now();
  await page.goto(origin + '/');
  await page.waitForFunction(() => window.__pelosiEngine && window.__pelosiEngine.nodes.length > 100, null, {timeout: 15000});
  check(`${width} graph ready`, true, {ms: Date.now() - t0});
  await page.waitForFunction(() => window.__pelosiEngine.atlas, null, {timeout: 15000}).catch(() => {});
  check(`${width} atlas loaded`, await page.evaluate(() => !!window.__pelosiEngine.atlas));
  // palette search
  if (width > 500) {
    await page.keyboard.press('Control+K');
    await page.getByLabel('搜索关键词').fill('pelosi');
    await page.keyboard.press('Enter');
  } else {
    await page.getByRole('button', {name: '搜索人物、机构或股票'}).click();
    await page.getByLabel('搜索关键词').fill('NVDA');
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector('.drawer .panel-head h2', {timeout: 8000});
  await page.waitForTimeout(1600);
  check(`${width} palette -> drawer`, true, {title: await page.locator('.drawer .panel-head h2').textContent(), url: page.url().replace(origin, '')});
  await page.waitForSelector('.drawer table.rows tbody tr, .drawer .holder-group li', {timeout: 8000});
  await page.screenshot({path: `${out}/drawer-${width}.png`});
  await page.getByRole('button', {name: '关闭详情'}).click();
  // click a node on the canvas
  const pt = await page.evaluate(() => { const e = window.__pelosiEngine; const n = e.nodes.find(n => n.kind === 's' && n.ref.id === 'berkshire'); e.cam = {x: n.x, y: n.y, k: 1.2}; e.camTarget = null; return e.toScreen(n.x, n.y); });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => { const e = window.__pelosiEngine; const n = e.nodes.find(n => n.kind === 's' && n.ref.id === 'berkshire'); return e.toScreen(n.x, n.y); });
  if (width < 500) await page.touchscreen.tap(after[0], after[1]); else await page.mouse.click(after[0], after[1]);
  await page.waitForSelector('.drawer .panel-head h2', {timeout: 8000}).catch(() => {});
  check(`${width} canvas click opens subject`, (await page.locator('.drawer .panel-head h2').textContent().catch(() => '')).includes('伯克希尔'));
  await page.keyboard.press('Escape');
  // drag pan
  if (width > 500) {
    const before = await page.evaluate(() => ({...window.__pelosiEngine.cam}));
    await page.mouse.move(200, 450); await page.mouse.down(); await page.mouse.move(420, 520, {steps: 8}); await page.mouse.up();
    const cam = await page.evaluate(() => ({...window.__pelosiEngine.cam}));
    check(`${width} drag pans camera`, Math.abs(cam.x - before.x) > 20);
    // idle -> tour caption
    await page.evaluate(() => { window.__pelosiEngine.lastInput = -1e9; });
    await page.waitForSelector('.caption:not(.hover)', {timeout: 16000}).catch(() => {});
    const cap = await page.locator('.caption:not(.hover) .cap-title').textContent().catch(() => null);
    check(`${width} tour caption`, !!cap, {cap});
    await page.screenshot({path: `${out}/tour-${width}.png`});
  }
  // motion: positions change over time
  const p1 = await page.evaluate(() => window.__pelosiEngine.nodes.slice(0, 5).map(n => [n.x, n.y]));
  await page.waitForTimeout(1500);
  const p2 = await page.evaluate(() => window.__pelosiEngine.nodes.slice(0, 5).map(n => [n.x, n.y]));
  check(`${width} graph keeps moving`, JSON.stringify(p1) !== JSON.stringify(p2));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${width} no overflow / errors`, overflow <= 1 && !errors.length, {overflow, errors});
  // legacy hash migration
  await page.goto(origin + '/#people?view=holdings&id=duquesne-family-office');
  await page.waitForSelector('.drawer .panel-head h2', {timeout: 8000}).catch(() => {});
  check(`${width} legacy hash -> focus`, page.url().includes('focus=duquesne'), {url: page.url().replace(origin, '')});
  await ctx.close();
}
// reduced motion
const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
const page = await ctx.newPage();
await page.goto(origin + '/');
await page.waitForFunction(() => window.__pelosiEngine && window.__pelosiEngine.nodes.length > 100);
check('reduced motion has no tour button', (await page.getByRole('button', {name: '自动巡游'}).count()) === 0);
await browser.close();
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.log(results.every(r => r.ok) ? 'ALL PASS' : 'SOME FAILED');
