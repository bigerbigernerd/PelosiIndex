import {useMemo, useState} from 'react';
import {CAT_COLORS} from '../data.js';
import {CatDot, Link, Sprite, TopNav} from '../ui/common.jsx';
import {category, roleText, subjectName, t, useLanguage} from '../i18n.js';

export default function People({graph, atlas}) {
  const lang = useLanguage();
  const [q, setQ] = useState('');
  const deg = useMemo(() => { const d = new Array(graph.S.length).fill(0); for (const [s] of graph.E) d[s]++; return d; }, [graph]);
  const needle = q.trim().toLowerCase();
  return (
    <div className="page">
      <TopNav page="people" />
      <main className="wrap">
        <header className="page-head">
          <p className="eyebrow">// DIRECTORY</p>
          <h1>{t('人物与机构')}</h1>
          <p className="lede">{graph.stats.subjects} {t('个披露主体，按五类分组。点任意一位，回到关系图并展开 TA 的全部披露。')}</p>
          <input className="filter" value={q} onChange={e => setQ(e.target.value)} placeholder={t('筛选：名字、机构、职务…')} aria-label={t('筛选主体')} />
          {!needle && <section className="popular-profiles" aria-label={lang === 'en' ? 'Popular profiles' : '热门人物'}>
            <p className="eyebrow">{lang === 'en' ? 'POPULAR PROFILES' : '热门人物'}</p>
            <div>{['donald-j-trump', 'elon-musk', 'warren-buffett', 'jeff-bezos', 'mark-zuckerberg', 'jensen-huang'].map(id => graph.S.find(s => s.id === id)).filter(Boolean).map(s => (
              <Link key={s.id} to={`/?focus=${encodeURIComponent(s.id)}`} className="popular-profile"><CatDot c={s.c} />{subjectName(s, true)}</Link>
            ))}</div>
          </section>}
        </header>
        {graph.cats.map((c, ci) => {
          const list = graph.S.map((s, i) => ({s, i})).filter(({s}) => s.c === ci && (!needle || `${s.zh} ${s.n} ${s.en} ${roleText(s)} ${s.r || ''}`.toLowerCase().includes(needle)));
          if (!list.length) return null;
          return (
            <section key={c.id} className="dir-group" style={{'--c': CAT_COLORS[ci]}}>
              <h2><CatDot c={ci} />{category(c)}<span>{c.en} · {list.length}</span></h2>
              <ul className="dir-grid">
                {list.sort((a, b) => (b.s.nT || 0) - (a.s.nT || 0)).map(({s, i}) => (
                  <li key={s.id}>
                    <Link to={`/?focus=${encodeURIComponent(s.id)}`} className="dir-card">
                      <Sprite atlas={atlas} img={s.img} size={44} label={s.en || s.n} color={CAT_COLORS[ci]} />
                      <span className="dir-name">{subjectName(s)}<small>{roleText(s)}</small></span>
                      <span className="dir-n" title={s.scanned ? t('扫描件') : t('关联股票数')}>{s.nT || (s.scanned ? (lang === 'en' ? 'Scanned' : '扫描件') : '—')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <p className="fine">{lang === 'en' ? 'Public officials: House PTR or applicable SEC Form 4 filings. Corporate insiders: SEC Form 4. Institutions: SEC 13F (2026-06-30 and 2026-03-31). Senate and OGE filings are not currently integrated. Numbers show connected tickers; inclusion dates are shown in each profile.' : '政界人物：众议院 PTR 或对应的 SEC Form 4。公司内部人：SEC Form 4。机构：SEC 13F（2026-06-30 与 2026-03-31）。参议院与 OGE 披露尚未接入。右侧数字为关联股票数，各人物详情显示收录日期。'}</p>
      </main>
    </div>
  );
}
