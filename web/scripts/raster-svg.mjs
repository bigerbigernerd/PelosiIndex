// Rasterize SVG logos to 128px PNG with headless Chromium (used by research/v2/pipeline/build_atlas.py).
// Usage: node scripts/raster-svg.mjs <outdir> <file.svg>...
import {chromium} from '../../../pocketplay-unified/dev/node_modules/playwright/index.mjs';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

const [outDir, ...files] = process.argv.slice(2);
let executablePath; const base = homedir() + '/.cache/ms-playwright';
for (const d of readdirSync(base).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()) { for (const s of readdirSync(base + '/' + d)) { const p = `${base}/${d}/${s}/chrome-headless-shell`; if (existsSync(p)) executablePath = p; } if (executablePath) break; }
const browser = await chromium.launch({executablePath});
const page = await browser.newPage({viewport: {width: 128, height: 128}});
for (const f of files) {
  const svg = readFileSync(f, 'utf8');
  if (/<script/i.test(svg)) { console.log('skip (script)', f); continue; }
  await page.setContent(`<html><body style="margin:0;background:transparent"><img id=i style="width:128px;height:128px;object-fit:contain" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`);
  await page.waitForTimeout(50);
  await page.locator('#i').screenshot({path: path.join(outDir, path.basename(f, '.svg') + '.png'), omitBackground: true});
}
await browser.close();
console.log('rasterized', files.length);
