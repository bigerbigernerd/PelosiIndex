import {useEffect, useMemo, useRef, useState} from 'react';
import {CAT_COLORS, loadHolders} from '../data.js';
import {Sprite} from './common.jsx';
import {roleText, subjectName, t, useLanguage} from '../i18n.js';

// ⌘K command palette: subjects and every ticker with a disclosed link.
export function Palette({graph, atlas, open, onClose, onPick}) {
  const lang = useLanguage();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const [holders, setHolders] = useState(null);
  const input = useRef(null);
  useEffect(() => {
    if (!open) return;
    setQ(''); setCursor(0);
    setTimeout(() => input.current?.focus(), 0);
    loadHolders().then(setHolders, () => {});
  }, [open]);
  const results = useMemo(() => {
    if (!graph) return [];
    const needle = q.trim().toLowerCase();
    const subs = graph.S.map(s => ({kind: 's', id: s.id, title: subjectName(s), sub: roleText(s), img: s.img, c: s.c, hay: `${s.zh} ${s.n} ${s.en} ${roleText(s)} ${s.r || ''} ${s.id}`.toLowerCase()}));
    const tick = holders ? Object.entries(holders.tickers).map(([t, v]) => ({kind: 't', id: t, title: t, sub: lang === 'en' ? `${v.n} · ${v.h.length} connected subjects` : `${v.n} · ${v.h.length} 个关联主体`, n: v.h.length, hay: `${t} ${v.n}`.toLowerCase(),
      img: graph.T.find(x => x.t === t)?.img ?? -1}))
      : graph.T.map(t => ({kind: 't', id: t.t, title: t.t, sub: t.n, img: t.img, n: 0, hay: `${t.t} ${t.n}`.toLowerCase()}));
    if (!needle) return [...subs.filter(s => ['donald-j-trump', 'elon-musk', 'warren-buffett', 'jeff-bezos', 'mark-zuckerberg', 'pelosi', 'berkshire', 'jensen-huang'].some(k => s.id.includes(k))),
      ...tick.sort((a, b) => b.n - a.n).slice(0, 5)];
    const score = r => {
      if (r.kind === 't' && r.id.toLowerCase() === needle) return 0;
      if (r.title.toLowerCase().startsWith(needle)) return 1;
      return r.hay.includes(needle) ? 2 : 9;
    };
    return [...subs, ...tick].map(r => [score(r), r]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || (b[1].n || 0) - (a[1].n || 0)).slice(0, 12).map(x => x[1]);
  }, [q, graph, holders, lang]);
  if (!open) return null;
  const pick = r => { if (r) { onPick(r); onClose(); } };
  return (
    <div className="palette-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-label={t('搜索')}>
        <div className="palette-input">
          <span className="prompt">&gt;</span>
          <input ref={input} value={q} placeholder={t('搜索人物、机构或股票代码…  例如 pelosi / 城堡 / NVDA')} aria-label={t('搜索关键词')}
            onChange={e => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(results.length - 1, c + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
              else if (e.key === 'Enter') pick(results[cursor]);
            }} />
          <kbd>ESC</kbd>
        </div>
        <ul>
          {results.map((r, i) => (
            <li key={r.kind + r.id} className={i === cursor ? 'on' : ''} onMouseEnter={() => setCursor(i)} onClick={() => pick(r)}>
              <Sprite atlas={atlas} img={r.img} size={26} label={r.kind === 't' ? r.id : r.title} color={r.kind === 's' ? CAT_COLORS[r.c] : '#e8e6dc'} />
              <span className="t">{r.title}</span>
              <span className="s">{r.sub}</span>
              <span className="k">{r.kind === 's' ? 'SUBJECT' : 'TICKER'}</span>
            </li>
          ))}
          {!results.length && <li className="empty">{t('没有匹配结果')}</li>}
        </ul>
      </div>
    </div>
  );
}
