import {useEffect, useMemo, useState} from 'react';
import {CAT_COLORS, loadHolders} from '../data.js';
import {Link, Sprite, TopNav} from '../ui/common.jsx';
import {category, t, useLanguage} from '../i18n.js';

const UP = new Set(['add', 'new', 'buy']), DOWN = new Set(['trim', 'exit', 'sell']);

export default function Stocks({graph, atlas}) {
  const lang = useLanguage();
  const [holders, setHolders] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('n');
  const [limit, setLimit] = useState(120);
  useEffect(() => { loadHolders().then(setHolders, () => setHolders({tickers: {}})); }, []);
  const rows = useMemo(() => {
    if (!holders) return [];
    const img = Object.fromEntries(graph.T.map(t => [t.t, t.img]));
    return Object.entries(holders.tickers).map(([t, v]) => {
      const cats = graph.cats.map(() => 0);
      let up = 0, down = 0;
      for (const [s, k] of v.h) { cats[graph.S[s].c]++; const kind = graph.kinds[k]; if (UP.has(kind)) up++; else if (DOWN.has(kind)) down++; }
      return {t, n: v.n, total: v.h.length, cats, up, down, net: up - down, img: img[t] ?? -1};
    });
  }, [holders, graph]);
  const needle = q.trim().toLowerCase();
  const list = rows.filter(r => !needle || r.t.toLowerCase().includes(needle) || r.n.toLowerCase().includes(needle))
    .sort((a, b) => sort === 'n' ? b.total - a.total : sort === 'up' ? b.net - a.net : a.net - b.net);
  return (
    <div className="page">
      <TopNav page="stocks" />
      <main className="wrap">
        <header className="page-head">
          <p className="eyebrow">// TICKERS</p>
          <h1>{t('股票')}</h1>
          <p className="lede">{rows.length || graph.stats.stocks} {t('只证券，按被多少披露主体连接排序。色条显示五类主体的构成，右侧是本季加仓/买入减去减仓/卖出的数量。')}</p>
          <div className="toolbar">
            <input className="filter" value={q} onChange={e => setQ(e.target.value)} placeholder={t('代码或公司名…')} aria-label={t('筛选股票')} />
            <div className="seg">
              <button className={sort === 'n' ? 'on' : ''} onClick={() => setSort('n')}>{t('关联最多')}</button>
              <button className={sort === 'up' ? 'on' : ''} onClick={() => setSort('up')}>{t('净买入')}</button>
              <button className={sort === 'down' ? 'on' : ''} onClick={() => setSort('down')}>{t('净卖出')}</button>
            </div>
          </div>
        </header>
        {!holders && <p className="loading">LOADING TICKERS…</p>}
        <ol className="stock-list">
          {list.slice(0, limit).map(r => (
            <li key={r.t}>
              <Link to={`/?t=${encodeURIComponent(r.t)}`} className="stock-row">
                <Sprite atlas={atlas} img={r.img} size={28} label={r.t} color="#e8e6dc" />
                <span className="st" aria-label={t('股票代码')}>{r.t}</span>
                <span className="sn">{r.n}</span>
                <span className="bar" aria-label={graph.cats.map((c, i) => `${category(c)} ${r.cats[i]}`).join(', ')}>
                  {r.cats.map((n, i) => n ? <i key={i} style={{flex: n, background: CAT_COLORS[i]}} /> : null)}
                </span>
                <span className="sc">{r.total}</span>
                <span className={`snet ${r.net > 0 ? 'up' : r.net < 0 ? 'down' : ''}`}>{r.net > 0 ? '+' : ''}{r.net}</span>
              </Link>
            </li>
          ))}
        </ol>
        {list.length > limit && <button className="more" onClick={() => setLimit(limit + 200)}>{lang === 'en' ? 'Show 200 more (of' : '再显示 200 只（共'} {list.length}{lang === 'en' ? ')' : '）'}</button>}
      </main>
    </div>
  );
}
