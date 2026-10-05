#!/usr/bin/env node
// After `vite build`: write per-route HTML (title, meta, canonical, crawlable noscript body), then audit dist/ for anything not meant to be public.
import {readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(web, 'dist');
const origin = 'https://pelosi.pocketplay.win';
const graph = JSON.parse(readFileSync(path.join(web, 'public/data/v2/graph.json'), 'utf8'));
const holders = JSON.parse(readFileSync(path.join(web, 'public/data/v2/holders.json'), 'utf8'));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const st = graph.stats;
const scope = `数据：众议院 PTR ${st.ptrRows.toLocaleString('en-US')} 行、SEC Form 4 ${st.form4Tx} 笔、SEC 13F 持仓 ${st.f13Positions.toLocaleString('en-US')} 条（季末 ${graph.asOf.q2}，对比 ${graph.asOf.q1}）。全部来自官方原始文件，金额区间、Owner、10b5-1 与季度快照口径保留原样，不构成投资建议。`;
const nav = '<nav aria-label="页面导航"><a href="/">关系图</a> · <a href="/people/">人物与机构</a> · <a href="/stocks/">股票</a> · <a href="/skills/">研究 Skills</a></nav>';
const enNav = '<nav aria-label="Page navigation"><a href="/en/">Graph</a> · <a href="/en/people/">People</a> · <a href="/en/stocks/">Stocks</a> · <a href="/en/skills/">Research Skills</a></nav>';

function subjectList(limitPerCat = 99) {
  return graph.cats.map((c, ci) => {
    const list = graph.S.filter(s => s.c === ci).sort((a, b) => (b.nT || 0) - (a.nT || 0)).slice(0, limitPerCat);
    return `<h2>${esc(c.zh)}（${graph.S.filter(s => s.c === ci).length}）</h2><ul>${list.map(s => `<li><a href="/?focus=${encodeURIComponent(s.id)}">${esc(s.zh)}</a> — ${esc(s.r || s.en)}，关联 ${s.nT || 0} 只股票</li>`).join('')}</ul>`;
  }).join('');
}
function tickerList(n, english = false) {
  const rows = Object.entries(holders.tickers).sort((a, b) => b[1].h.length - a[1].h.length).slice(0, n);
  return `<ol>${rows.map(([t, v]) => `<li><a href="${english ? '/en/' : '/'}?t=${encodeURIComponent(t)}">${esc(t)}</a> ${esc(v.n)} — ${v.h.length} ${english ? 'disclosing subjects' : '个披露主体'}</li>`).join('')}</ol>`;
}
const SKILLS = [
  ['sec-13f-diff', '13F 季度对比：最近两季新建仓、清仓、增减持'],
  ['congress-ptr-reader', '国会议员交易：众议院 PTR 原件逐笔抽取'],
  ['form4-insider-tracker', '内部人买卖：Form 4 交易代码、价格与 10b5-1'],
  ['pelosi-graph-data', '本站图谱数据：查询主体、股票与重叠持仓'],
  ['disclosure-research', '披露研究报告：事实 / 推断 / 未知分开写'],
  ['pelosi-data-contributor', '新增人物与数据：身份、原件、哈希、解析与贡献审核'],
];
const pages = [
  {route: '/', title: '佩洛西指数 · 政客、CEO 与基金的公开披露关系图',
    description: `一张互动关系图：${st.byCat[0]} 位政界人物、${st.byCat[1]} 位公司内部人、${st.byCat[2] + st.byCat[3] + st.byCat[4]} 家明星投资人、对冲量化与主权养老基金，连接到他们披露交易或持有的 ${st.stocks} 只股票。数据来自众议院 PTR、SEC 13F 与 Form 4 原件。`,
    body: `<h1>佩洛西指数：谁在买，谁在卖</h1><p>政客、CEO、基金与主权财富，在同一张图上。每条连线都是一份公开披露：绿色为增持/新建/买入，红色为减持/清仓/卖出。</p><p>${scope}</p>${subjectList(8)}<h2>被最多主体连接的股票</h2>${tickerList(20)}`},
  {route: '/people/', title: '人物与机构 · 佩洛西指数',
    description: `${st.subjects} 个披露主体：政界人物（众议院 PTR 或对应的 SEC Form 4）、公司内部人（Form 4）、明星投资人、对冲与量化、主权·养老·捐赠基金（13F）。每位都可在关系图中展开全部披露。`,
    body: `<h1>人物与机构</h1><p>${scope}</p>${subjectList()}`},
  {route: '/stocks/', title: '股票 · 佩洛西指数',
    description: `${st.stocks} 只证券，按被多少国会议员、公司内部人与机构的公开披露连接排序，并显示本季净买入与净卖出。`,
    body: `<h1>股票</h1><p>${scope}</p>${tickerList(150)}`},
  {route: '/skills/', title: '研究 Skills · 佩洛西指数',
    description: '6 个可下载的 agent skills：13F、国会议员 PTR、Form 4、图谱数据、披露研究与新增人物数据贡献。可用于 Claude Code、Grok、Codex。',
    body: `<h1>把研究能力装进你的 agent</h1><p>本站不提供在线 AI 分析，改为提供可下载的研究 Skills，直接从 SEC 与众议院官方源取数。</p><ul>${SKILLS.map(([id, d]) => `<li><a href="/downloads/${id}.zip">${id}</a> — ${esc(d)}</li>`).join('')}</ul><p><a href="/downloads/pelosi-skills.zip">下载全部 Skills</a></p>`},
];

const enPages = [
  {route:'/en/',title:'Pelosi Index · Public Disclosure Graph',description:`A graph connecting ${st.byCat[0]} public officials, ${st.byCat[1]} corporate insiders, and ${st.byCat[2]+st.byCat[3]+st.byCat[4]} institutional investors to ${st.stocks} reported securities. Sources: original House PTR, SEC 13F, and Form 4 filings.`,body:`<h1>Pelosi Index: Who is buying and selling?</h1><p>Politicians, CEOs, funds, and sovereign wealth on one graph. Each edge represents a public disclosure: green indicates adds, new positions, or buys; red indicates trims, exits, or sells.</p><p>Data: House PTR ${st.ptrRows.toLocaleString('en-US')} rows, SEC Form 4 ${st.form4Tx} transactions, SEC 13F ${st.f13Positions.toLocaleString('en-US')} positions (period ending ${graph.asOf.q2}, compared with ${graph.asOf.q1}). Official source documents; each source retains its own scope. Not investment advice.</p>${graph.cats.map((c,ci)=>`<h2>${esc(c.en)} (${graph.S.filter(s=>s.c===ci).length})</h2><ul>${graph.S.filter(s=>s.c===ci).slice(0,8).map(s=>`<li><a href="/en/?focus=${encodeURIComponent(s.id)}">${esc(s.en||s.n)}</a> — ${s.nT||0} connected tickers</li>`).join('')}</ul>`).join('')}<h2>Most connected tickers</h2>${tickerList(20,true)}`},
  {route:'/en/people/',title:'People & Institutions · Pelosi Index',description:`${st.subjects} disclosure subjects across five categories. Explore reported filings in the graph.`,body:`<h1>People & Institutions</h1><p>Data sources: House PTR, SEC Form 4, and SEC 13F. Institutional periods end ${graph.asOf.q2} and ${graph.asOf.q1}. Senate and OGE disclosures are not currently integrated; public officials can also have source-specific SEC Form 4 evidence.</p>${graph.cats.map((c,ci)=>`<h2>${esc(c.en)} (${graph.S.filter(s=>s.c===ci).length})</h2><ul>${graph.S.filter(s=>s.c===ci).map(s=>`<li><a href="/en/?focus=${encodeURIComponent(s.id)}">${esc(s.en||s.n)}</a> — ${s.nT||0} connected tickers</li>`).join('')}</ul>`).join('')}`},
  {route:'/en/stocks/',title:'Stocks · Pelosi Index',description:`${st.stocks} securities ranked by connected public disclosures.`,body:`<h1>Stocks</h1><p>Securities ranked by the number of connected disclosures. Sources include public House PTR, SEC Form 4, and SEC 13F; each has a distinct scope.</p>${tickerList(150,true)}`},
  {route:'/en/skills/',title:'Research Skills · Pelosi Index',description:'Six downloadable research and data-contribution skills for original SEC and House disclosures. Compatible with Claude Code, Grok, and Codex.',body:`<h1>Bring research skills to your agent</h1><p>Online AI analysis is not available. Downloadable skills retrieve public records directly from official SEC and House sources.</p><ul>${[['sec-13f-diff','13F quarter-over-quarter comparison'],['congress-ptr-reader','House PTR transaction reader'],['form4-insider-tracker','Form 4 insider tracker'],['pelosi-graph-data','Public graph data'],['disclosure-research','Disclosure research note'],['pelosi-data-contributor','Contribute people and original disclosure data']].map(([id,d])=>`<li><a href="/downloads/${id}.zip">${id}</a> — ${d}</li>`).join('')}</ul><p><a href="/downloads/pelosi-skills.zip">Download all skills</a></p>`},
];

function render(template, page) {
  const url = origin + page.route;
  const isEnglish = page.route.startsWith('/en/');
  const zhRoute = isEnglish ? page.route.replace(/^\/en/, '') : page.route;
  const enRoute = isEnglish ? page.route : `/en${page.route}`;
  let html = template.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta name="description"[^>]*>/, '');
  html = html.replace('<html lang="zh-CN">', `<html lang="${isEnglish ? 'en' : 'zh-CN'}">`);
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    '<meta name="robots" content="index,follow,max-image-preview:large" />',
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${origin}${zhRoute}" />`,
    `<link rel="alternate" hreflang="en" href="${origin}${enRoute}" />`,
    `<link rel="alternate" hreflang="x-default" href="${origin}${zhRoute}" />`,
    '<meta property="og:type" content="website" />', `<meta property="og:locale" content="${isEnglish ? 'en_US' : 'zh_CN'}" />`, '<meta property="og:site_name" content="Pelosi Index" />',
    `<meta property="og:title" content="${esc(page.title)}" />`, `<meta property="og:description" content="${esc(page.description)}" />`, `<meta property="og:url" content="${url}" />`,
    '<meta name="twitter:card" content="summary" />', `<meta name="twitter:title" content="${esc(page.title)}" />`, `<meta name="twitter:description" content="${esc(page.description)}" />`,
  ].join('\n    ');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript><main class="noscript">${isEnglish ? enNav : nav}${page.body}</main></noscript>`);
  if (page.route !== '/' && page.route !== '/en/') html = html.replace(/<link rel="preload" href="\/data\/(?:v2|revisions\/[0-9a-f]{16})\/graph\.json"[^>]*>\n?\s*/, '');
  return html;
}

const dataVersion = JSON.parse(readFileSync(path.join(web, 'public/data/version.json'), 'utf8'));
const template = readFileSync(path.join(dist, 'index.html'), 'utf8').replace('href="/data/v2/graph.json"', `href="${dataVersion.base}graph.json"`);
if (/src="\/src\//.test(template)) throw Error('expected the production Vite HTML');
const allPages = [...pages, ...enPages];
// Pre-revision tabs have graph indexes cached in memory. Keep their original entire dataset.
// Current clients and skills discover the newest immutable dataset through data/version.json.
rmSync(path.join(dist, 'data/v2'), {recursive:true, force:true});
cpSync(path.join(web, 'compat/data-v2-20261004'), path.join(dist, 'data/v2'), {recursive:true});
writeFileSync(path.join(dist, 'health.json'), JSON.stringify({ok: true, service: 'pelosi-index', name: '佩洛西指数', version: 2,
  subjects: st.subjects, tickers: st.stocks, records: st.ptrRows + st.form4Tx + st.f13Positions}) + '\n');
for (const page of allPages) {
  const target = path.join(dist, page.route.slice(1), 'index.html');
  mkdirSync(path.dirname(target), {recursive: true});
  writeFileSync(target, render(template, page));
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${allPages.map(p => {
  const zh = p.route.startsWith('/en/') ? p.route.replace(/^\/en/, '') : p.route;
  const en = p.route.startsWith('/en/') ? p.route : `/en${p.route}`;
  return `  <url><loc>${origin}${p.route}</loc><xhtml:link rel="alternate" hreflang="zh-CN" href="${origin}${zh}"/><xhtml:link rel="alternate" hreflang="en" href="${origin}${en}"/></url>`;
}).join('\n')}\n</urlset>\n`;
writeFileSync(path.join(web, 'public/sitemap.xml'), sitemapXml);
writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml);

// public allowlist: built assets, v2 data, atlas, skill zips, robots/sitemap/favicon and the four route pages
const walk = d => readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dist).map(f => path.relative(dist, f).split(path.sep).join('/'));
const routeFiles = new Set(allPages.map(p => (p.route === '/' ? '' : p.route.slice(1)) + 'index.html'));
const ok = f => routeFiles.has(f) || ['robots.txt', 'sitemap.xml', 'favicon.svg', 'health.json', 'data/version.json'].includes(f)
  || /^assets\/[\w.-]+\.(js|css|woff2?)$/.test(f) || /^img\/atlas-[0-9a-f]{10}\.webp$/.test(f)
  || /^data\/v2\/(graph|holders|atlas|credits)\.json$/.test(f) || /^data\/v2\/s\/[a-z0-9-]+\.json$/.test(f)
  || /^data\/revisions\/[0-9a-f]{16}\/(?:(?:graph|holders|atlas|credits)\.json|s\/[a-z0-9-]+\.json)$/.test(f)
  || /^downloads\/[a-z0-9-]+\.zip$/.test(f);
const bad = files.filter(f => !ok(f));
if (bad.length) throw Error('unapproved public files: ' + bad.join(', '));
for (const page of allPages) {
  const html = readFileSync(path.join(dist, page.route.slice(1), 'index.html'), 'utf8');
  if ((html.match(/rel="canonical"/g) || []).length !== 1 || /noindex/.test(html)) throw Error('bad page metadata ' + page.route);
}
const bytes = files.reduce((a, f) => a + statSync(path.join(dist, f)).size, 0);
const manifest = {origin, prepared_at: new Date().toISOString(), routes: allPages.map(p => p.route), files: files.length, bytes,
  stats: st, asOf: graph.asOf, sha256: Object.fromEntries(files.sort().map(f => [f, createHash('sha256').update(readFileSync(path.join(dist, f))).digest('hex')]))};
writeFileSync(path.join(web, 'public-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(JSON.stringify({routes: manifest.routes, files: files.length, mb: +(bytes / 1048576).toFixed(2), privacy: 'passed'}));
