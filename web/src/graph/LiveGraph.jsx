import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {GraphEngine} from './engine.js';
import {CAT_COLORS, KIND_ZH, shortDate, track, usd} from '../data.js';
import {CatDot, Kind, TopNav, useMedia} from '../ui/common.jsx';
import {Drawer} from '../ui/Drawer.jsx';
import {Palette} from '../ui/Palette.jsx';
import {category, getLanguage, roleText, subjectName, t, useLanguage} from '../i18n.js';

const TOUR_EVERY = 7000, IDLE_BEFORE_TOUR = 12000;

function captionFor(graph, node) {
  if (!node) return null;
  if (node.kind === 't') {
    const sp = graph.spot.find(s => s.t === node.i);
    const en = getLanguage() === 'en';
    const cats = sp ? sp.cats.map((n, i) => n ? `${category(graph.cats[i])} ${n}` : null).filter(Boolean).join(' · ') : '';
    return {tag: 'TICKER', title: `${node.ref.t} · ${node.ref.en || node.ref.n}`, lines: [sp ? (en ? `Connected to ${sp.n} disclosed subjects — ${cats}` : `被 ${sp.n} 个披露主体连接 — ${cats}`) : (en ? `${node.deg} disclosed relationships` : `${node.deg} 条披露关系`),
      sp ? (en ? `${sp.buy} adds/buys · ${sp.sell} trims/sells this quarter` : `本季 ${sp.buy} 个加仓/买入 · ${sp.sell} 个减仓/卖出`) : ''], color: '#e8e6dc'};
  }
  const s = node.ref;
  const en = getLanguage() === 'en';
  return {tag: graph.cats[s.c].en, title: subjectName(s), lines: [roleText(s), en ? `${node.deg} graph connections` : `${node.deg} 条关系在图中`], color: CAT_COLORS[s.c]};
}

export default function LiveGraph({graph, atlas, atlasImg}) {
  const lang = useLanguage();
  const en = lang === 'en';
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [sel, setSel] = useState(null);           // {kind:'s'|'t', id}
  const [hover, setHover] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [tour, setTour] = useState(true);
  const [caption, setCaption] = useState(null);
  const [palette, setPalette] = useState(false);
  const [mouse, setMouse] = useState([0, 0]);
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const narrow = useMedia('(max-width: 720px)');
  const tourIdx = useRef(0);

  // Captions are snapshots of the previous language; the next hover/tour regenerates them.
  useEffect(() => { setHover(null); setCaption(null); }, [lang]);

  const tourList = useMemo(() => {
    const picks = [];
    const bestBy = c => graph.S.map((s, i) => ({s, i})).filter(x => x.s.c === c).sort((a, b) => countEdges(graph, b.i) - countEdges(graph, a.i))[0];
    const spots = graph.spot.slice(0, 10);
    graph.cats.forEach((_, c) => { const b = bestBy(c); if (b) picks.push({kind: 's', id: b.s.id}); if (spots[c]) picks.push({kind: 't', id: graph.T[spots[c].t].t}); });
    const pelosi = graph.S.find(s => s.id.includes('p000197') || s.id.includes('pelosi'));
    if (pelosi) picks.unshift({kind: 's', id: pelosi.id});
    return picks;
  }, [graph]);

  // mount engine
  useEffect(() => {
    const engine = new GraphEngine(canvasRef.current, graph, {reducedMotion: reduced, english: en});
    engineRef.current = engine;
    engine.on('hover', n => setHover(n));
    engine.on('select', n => {
      setSel(n ? {kind: n.kind, id: n.kind === 's' ? n.ref.id : n.ref.t} : null);
      if (n) track('graph_focus', {kind: n.kind === 's' ? 'subject' : 'ticker', via: 'canvas'});
    });
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvasRef.current);
    const vis = () => (document.hidden ? engine.stop() : engine.start());
    document.addEventListener('visibilitychange', vis);
    engine.start();
    window.__pelosiEngine = engine;
    return () => { ro.disconnect(); document.removeEventListener('visibilitychange', vis); engine.destroy(); };
  }, [graph, reduced, en]);

  useEffect(() => { const e = engineRef.current; if (e) { e.atlas = atlasImg; e.atlasMeta = atlas; } }, [atlasImg, atlas, graph, reduced, en]);
  useEffect(() => { engineRef.current?.setHidden(hidden); }, [hidden, en]);

  // initial selection from URL (?focus=id | ?t=TICKER)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const f = p.get('focus'), t = p.get('t');
    if (f && graph.S.some(s => s.id === f)) setSel({kind: 's', id: f});
    else if (t) setSel({kind: 't', id: t.toUpperCase()});
  }, [graph]);

  // apply selection to engine + URL
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    const node = sel ? e.find(sel.kind, sel.id) : null;
    e.setSelected(node);
    if (node) { e.focusNode(node, 1.4); setCaption(null); }
    const qs = sel ? (sel.kind === 's' ? `?focus=${encodeURIComponent(sel.id)}` : `?t=${encodeURIComponent(sel.id)}`) : '';
    const base = location.pathname.startsWith('/en/') ? '/en/' : '/';
    if ((location.pathname === '/' || location.pathname === '/en/') && location.search !== qs) history.replaceState(null, '', base + qs);
  }, [sel, graph, lang]);

  // auto tour when idle
  useEffect(() => {
    if (!tour || reduced || sel) return;
    const timer = setInterval(() => {
      const e = engineRef.current;
      if (!e || palette || performance.now() - e.lastInput < IDLE_BEFORE_TOUR) return;
      const pick = tourList[tourIdx.current++ % tourList.length];
      const node = pick && e.find(pick.kind, pick.id);
      if (!node || e.isHidden(node)) return;
      e.setSelected(node);
      e.focusNode(node, 1.25);
      setCaption(captionFor(graph, node));
      setTimeout(() => { if (engineRef.current?.selected === node && !document.querySelector('.drawer')) { e.setSelected(null); e.fit(true); } }, TOUR_EVERY - 1800);
    }, TOUR_EVERY);
    return () => clearInterval(timer);
  }, [tour, reduced, sel, tourList, graph, palette]);

  // keyboard
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
      else if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName)) { e.preventDefault(); setPalette(true); }
      else if (e.key === 'Escape' && !palette) setSel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette]);

  const toggleCat = c => setHidden(h => { const n = new Set(h); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const select = useCallback(s => setSel(s), []);
  const stats = graph.stats;
  const filings = stats.ptrRows + stats.form4Tx + stats.f13Positions;
  const hoverCap = hover && !sel ? captionFor(graph, hover) : null;
  const cap = hoverCap || caption;

  return (
    <div className="graph-page" onPointerMove={e => setMouse([e.clientX, e.clientY])}>
      <canvas ref={canvasRef} className="graph-canvas" aria-label={t('关系图：人物与机构连接到他们披露交易或持有的股票。可用搜索打开文字详情。')} role="img" />
      <div className="scanlines" aria-hidden="true" />
      <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      <TopNav page="graph" overlay onSearch={() => setPalette(true)} />

      <section className="hud-stats" aria-label={t('数据概览')}>
        <p className="hud-title"><span className="blink">●</span> LIVE DISCLOSURE GRAPH</p>
      <h1>{t('谁在买，谁在卖。')}<span>{t('政客、CEO、基金与主权财富，在同一张图上。')}</span></h1>
        <dl>
          <div><dt>SUBJECTS</dt><dd>{stats.subjects}</dd></div>
          <div><dt>TICKERS</dt><dd>{stats.stocks}</dd></div>
          <div><dt>LINKS</dt><dd>{stats.edges.toLocaleString('en-US')}</dd></div>
          <div><dt>RECORDS</dt><dd>{filings.toLocaleString('en-US')}</dd></div>
        </dl>
        <p className="asof">13F {t('13F 季末')} {graph.asOf.q2} · {t('对比')} {graph.asOf.q1} · {t('最新交易')} {graph.asOf.feedLatest}</p>
      </section>

      <section className="hud-legend" aria-label={t('分类筛选')}>
        {graph.cats.map((c, i) => (
          <button key={c.id} className={hidden.has(i) ? 'off' : ''} onClick={() => toggleCat(i)} aria-pressed={!hidden.has(i)} style={{'--c': CAT_COLORS[i]}}>
            <CatDot c={i} /><span>{category(c)}</span><b>{stats.byCat[i]}</b>
          </button>
        ))}
        <p className="edge-key"><span className="up">━ {t('增持/新建/买入')}</span><span className="down">━ {t('减持/清仓/卖出')}</span><span className="flat">━ {t('持有')}</span></p>
      </section>

      <section className="hud-controls" aria-label={t('视图控制')}>
        <button onClick={() => { const e = engineRef.current; e.cam.k = Math.min(4, e.cam.k * 1.3); e.lastInput = performance.now(); }} aria-label={t('放大')}>＋</button>
        <button onClick={() => { const e = engineRef.current; e.cam.k = Math.max(0.1, e.cam.k / 1.3); e.lastInput = performance.now(); }} aria-label={t('缩小')}>－</button>
        <button onClick={() => { setSel(null); engineRef.current.fit(true); }} aria-label={t('全景')}>⤢</button>
        {!reduced && <button className={tour ? 'on' : ''} onClick={() => setTour(!tour)} aria-pressed={tour} aria-label={t('自动巡游')}>{tour ? 'TOUR ON' : 'TOUR OFF'}</button>}
      </section>

      {cap && !sel && (
        <div className={`caption${hoverCap ? ' hover' : ''}`} style={hoverCap && !narrow ? {left: Math.min(mouse[0] + 18, innerWidth - 340), top: Math.min(mouse[1] + 18, innerHeight - 140)} : undefined} aria-live="polite">
          <p className="cap-tag" style={{color: cap.color}}>// {cap.tag}</p>
          <p className="cap-title">{cap.title}</p>
          {cap.lines.filter(Boolean).map((l, i) => <p key={i} className="cap-line">{l}</p>)}
        </div>
      )}

      <Feed graph={graph} onSelect={select} />
      <Drawer graph={graph} atlas={atlas} sel={sel} onSelect={select} onClose={() => setSel(null)} />
      <Palette graph={graph} atlas={atlas} open={palette} onClose={() => setPalette(false)} onPick={r => { setSel({kind: r.kind, id: r.id}); track('graph_focus', {kind: r.kind === 's' ? 'subject' : 'ticker', via: 'search'}); }} />
    </div>
  );
}

function countEdges(graph, s) { let n = 0; for (const e of graph.E) if (e[0] === s) n++; return n; }

function Feed({graph, onSelect}) {
  const items = graph.feed.slice(0, 60);
  const row = prefix => items.map((f, i) => {
    const [d, s, , t, k, v, src] = f;
    const sub = graph.S[s];
    const kind = graph.kinds[k];
    return (
      <button key={prefix + i} className="feed-item" onClick={() => onSelect({kind: 't', id: t})}>
        <span className="d">{shortDate(d)}</span>
        <span className="who" style={{color: CAT_COLORS[sub.c]}}>{subjectName(sub, true)}</span>
        <Kind k={kind} />
        <span className="t">{t}</span>
        <span className="v">{typeof v === 'number' ? usd(v) : v}</span>
        <span className="src">{src}</span>
      </button>
    );
  });
  return (
      <div className="feed" aria-label={t('最新披露')}>
      <span className="feed-label">{t('LATEST ▸')}</span>
      <div className="feed-track"><div className="feed-run">{row('a')}{row('b')}</div></div>
    </div>
  );
}

export {KIND_ZH};
