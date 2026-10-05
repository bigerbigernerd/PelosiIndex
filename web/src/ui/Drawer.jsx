import {useEffect, useMemo, useState} from 'react';
import {CAT_COLORS, KIND_ZH, loadHolders, loadShard, num, pct, usd} from '../data.js';
import {CatDot, Kind, Sprite} from './common.jsx';
import {category, getLanguage, roleText, subjectName, t, useLanguage} from '../i18n.js';

const OWNER = {SP: '配偶', JT: '共同', DC: '子女'};
const FORM4_CODES = {P:'Purchase',S:'Sale',A:'Award',M:'Exercise',F:'Tax withholding',G:'Gift',D:'Disposition',J:'Other'};

export function Drawer({graph, atlas, sel, onSelect, onClose}) {
  useLanguage();
  if (!sel) return null;
  return (
    <aside className="drawer" aria-label={t('详情')}>
      <button className="drawer-x" onClick={onClose} aria-label={t('关闭详情')}>×</button>
      {sel.kind === 's' ? <SubjectPanel key={sel.id} graph={graph} atlas={atlas} id={sel.id} onSelect={onSelect} />
        : <StockPanel key={sel.id} graph={graph} atlas={atlas} ticker={sel.id} onSelect={onSelect} />}
    </aside>
  );
}

function useAsync(fn, deps) {
  const [state, setState] = useState({loading: true});
  useEffect(() => {
    let live = true;
    setState({loading: true});
    fn().then(data => live && setState({data}), error => live && setState({error}));
    return () => { live = false; };
  }, deps);    // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

function SubjectPanel({graph, atlas, id, onSelect}) {
  const s = graph.S.find(x => x.id === id);
  const {data, error, loading} = useAsync(() => loadShard(id), [id]);
  if (!s) return <p className="muted">{t('未找到该主体。')}</p>;
  const cat = graph.cats[s.c];
  return (
    <div className="panel">
      <div className="panel-head">
        <Sprite atlas={atlas} img={s.img} size={56} label={s.en || s.n} color={CAT_COLORS[s.c]} />
        <div>
          <p className="eyebrow"><CatDot c={s.c} />{category(cat)} <span className="dim">/ {cat.en}</span></p>
          <h2>{subjectName(s)}</h2>
          <p className="role">{roleText(s)}</p>
        </div>
      </div>
      {(s.coverage_note_zh || s.coverage_note_en) && <p className="note">{getLanguage() === 'en' ? s.coverage_note_en : s.coverage_note_zh}</p>}
      {loading && <p className="loading">LOADING FILINGS…</p>}
      {error && <p className="error">{t('资料加载失败，请稍后重试。')}</p>}
      {data?.type === '13f' && <Thirteen data={data} graph={graph} onSelect={onSelect} />}
      {data?.type === 'ptr' && <Ptr data={data} graph={graph} onSelect={onSelect} />}
      {data?.type === 'form4' && <Form4 data={data} graph={graph} onSelect={onSelect} />}
    </div>
  );
}

function TickerBtn({t: ticker, graph, onSelect}) {
  const inGraph = graph.T.some(x => x.t === ticker);
  return <button className="tick" onClick={() => onSelect({kind: 't', id: ticker})} title={inGraph ? t('在图中定位') : t('查看股票详情')}>{ticker}</button>;
}

function Thirteen({data, graph, onSelect}) {
  const [sort, setSort] = useState('value');
  const [all, setAll] = useState(false);
  const q2 = data.periods['2026-06-30'], q1 = data.periods['2026-03-31'];
  const latest = q2 || Object.values(data.periods)[0];
  const rows = useMemo(() => {
    const list = data.positions.filter(p => !p.pc);
    if (sort === 'move') return [...list].filter(p => p.dv).sort((a, b) => Math.abs(b.dv) - Math.abs(a.dv));
    return list;
  }, [data, sort]);
  const counts = data.positions.reduce((m, p) => { if (!p.pc && p.chg) m[p.chg] = (m[p.chg] || 0) + 1; return m; }, {});
  const total = data.positions.filter(p => !p.pc).reduce((a, p) => a + (p.v2 || 0), 0);
  const shown = all ? rows : rows.slice(0, 30);
  return (
    <>
      <dl className="facts">
        <div><dt>{t('季末')}</dt><dd>{latest?.accession ? (q2 ? '2026-06-30' : Object.keys(data.periods)[0]) : '—'}</dd></div>
        <div><dt>{t('申报')}</dt><dd>{latest?.filed || '—'}</dd></div>
        <div><dt>{t('股票池内持仓')}</dt><dd>{usd(total)}</dd></div>
        <div><dt>{t('对比上季')}</dt><dd>{data.comparable ? 'Q1 → Q2' : t('不可比')}</dd></div>
      </dl>
      {data.comparable && <p className="chips">{['new', 'add', 'trim', 'exit', 'hold'].filter(k => counts[k]).map(k => <span key={k}><Kind k={k} /> {counts[k]}</span>)}</p>}
      {!data.comparable && <p className="note">{t('两期报告口径不同（合并报告/保密省略/缺期），不计算增减持。')}</p>}
      <div className="seg" role="tablist">
        <button className={sort === 'value' ? 'on' : ''} onClick={() => setSort('value')}>{t('按市值')}</button>
        <button className={sort === 'move' ? 'on' : ''} onClick={() => setSort('move')} disabled={!data.comparable}>{t('按变动')}</button>
      </div>
      <table className="rows">
        <thead><tr><th>{t('股票代码')}</th><th>{t('市值')}</th><th>{t('变动')}</th></tr></thead>
        <tbody>
          {shown.map(p => (
            <tr key={p.t + (p.pc || '')}>
              <td><TickerBtn t={p.t} graph={graph} onSelect={onSelect} /><small>{p.issuer}</small></td>
              <td className="num">{usd(p.v2 ?? p.v1)}<small>{num(p.sh2 ?? p.sh1)} {t('股')}</small></td>
              <td>{p.chg ? <Kind k={p.chg} /> : <span className="dim">—</span>}<small className={p.dv > 0 ? 'up' : p.dv < 0 ? 'down' : ''}>{p.chg === 'add' || p.chg === 'trim' ? pct(p.pct) : ''} {p.dv ? usd(p.dv, {sign: true}) : ''}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 30 && <button className="more" onClick={() => setAll(!all)}>{all ? t('收起') : (getLanguage() === 'en' ? `Show all ${rows.length} rows` : `展开全部 ${rows.length} 条`)}</button>}
      <p className="source">
        {t('来源：SEC 13F 信息表')} {latest?.url && <a href={latest.url} target="_blank" rel="noreferrer">Q2 {t('原件')} ↗</a>} {q1?.url && <a href={q1.url} target="_blank" rel="noreferrer">Q1 {t('原件')} ↗</a>}
        <br />{getLanguage() === 'en' ? 'Rows across managers and discretion lines in one filing are aggregated for that filer. Only S&P 500 / Nasdaq-100 universe securities are included; changes compare shares, and values are estimated using quarter-end prices. This is not a person’s trades or complete portfolio.' : '同一申报内不同管理人/裁量行合计为该申报主体的公开披露持仓；只含 S&P 500 / Nasdaq-100 股票池内证券；变动按股数比较，金额按季末价格估算。不代表个人交易或完整组合。'}
      </p>
    </>
  );
}

function Ptr({data, graph, onSelect}) {
  const rows = data.filings.flatMap(f => f.rows.map(r => ({...r, f}))).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  const scanned = data.filings.filter(f => f.pdf_kind !== 'electronic_text');
  const [all, setAll] = useState(false);
  return (
    <>
      <dl className="facts">
        <div><dt>{t('PTR 文件')}</dt><dd>{data.filings.length}</dd></div>
        <div><dt>{t('交易行')}</dt><dd>{rows.length}</dd></div>
        <div><dt>{t('最近申报')}</dt><dd>{data.filings[0]?.filed || '—'}</dd></div>
      </dl>
      {scanned.length > 0 && <p className="note">{scanned.length}{t('份为扫描件，未自动抽取，请阅读原件。')}</p>}
      <table className="rows">
        <thead><tr><th>{t('交易')}</th><th>{t('资产')}</th><th>{t('金额区间')}</th></tr></thead>
        <tbody>
          {(all ? rows : rows.slice(0, 40)).map(r => (
            <tr key={r.id}>
              <td><Kind k={r.kind === 'purchase' ? 'buy' : r.kind.includes('sale') ? 'sell' : 'other'} /><small>{r.transaction_date}</small></td>
              <td>{r.ticker && (r.asset_type === 'ST' || r.asset_type === 'OP') ? <TickerBtn t={r.ticker.replace(/[-/ ]/g, '.')} graph={graph} onSelect={onSelect} /> : null}<small>{r.asset.replace(/\s*\[[A-Z]{2}\]\s*/, ' ').slice(0, 64)}</small></td>
              <td className="num">{r.amount_raw}<small>{getLanguage() === 'en' ? ({SP:'Spouse',JT:'Joint',DC:'Dependent child'}[r.owner] || 'Filer / unspecified') : (OWNER[r.owner] || '本人/未注明')}{r.type_raw === 'S (partial)' ? t('· 部分') : ''}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 40 && <button className="more" onClick={() => setAll(!all)}>{all ? t('收起') : (getLanguage() === 'en' ? `Show all ${rows.length} rows` : `展开全部 ${rows.length} 条`)}</button>}
      <p className="source">{getLanguage() === 'en' ? 'Source: original House Clerk PTR filings ' : '来源：众议院书记官 PTR 原件 '}{data.filings.slice(0, 6).map(f => <a key={f.doc_id} href={f.url} target="_blank" rel="noreferrer">#{f.doc_id} ↗</a>)}
        <br />{getLanguage() === 'en' ? 'Amounts are reported ranges, not transaction values. Owner codes follow the original filing (SP spouse, JT joint, DC dependent child); they do not establish who placed the trade.' : '金额为申报区间，不是成交额；Owner 为原文（SP 配偶、JT 共同、DC 子女），不等于本人下单。'}</p>
    </>
  );
}

function Form4({data, graph, onSelect}) {
  const rows = data.filings.flatMap(f => f.tx.filter(t => t.table === 'nd').map(t => ({...t, f}))).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sold = rows.filter(r => r.code === 'S').reduce((a, r) => a + (r.value || 0), 0);
  const bought = rows.filter(r => r.code === 'P').reduce((a, r) => a + (r.value || 0), 0);
  const [all, setAll] = useState(false);
  return (
    <>
      <dl className="facts">
        <div><dt>Form 4</dt><dd>{data.filings.length}</dd></div>
        <div><dt>{getLanguage() === 'en' ? 'Latest included filing' : '最新收录申报'}</dt><dd>{data.filings[0]?.filed || '—'}</dd></div>
        <div><dt>{t('公开市场卖出')}</dt><dd className="down">{usd(sold)}</dd></div>
        <div><dt>{t('公开市场买入')}</dt><dd className="up">{usd(bought)}</dd></div>
      </dl>
      <table className="rows">
        <thead><tr><th>{t('交易')}</th><th>{t('证券')}</th><th>{t('数量 · 价格')}</th></tr></thead>
        <tbody>
          {(all ? rows : rows.slice(0, 40)).map((r, i) => (
            <tr key={r.f.accession + r.row + i}>
              <td><span className={`kind kind-${r.code === 'P' ? 'up' : r.code === 'S' ? 'down' : 'flat'}`}>{r.code} {getLanguage() === 'en' ? (FORM4_CODES[r.code] || r.code) : r.code_zh}</span><small>{r.date}</small></td>
              <td><TickerBtn t={(r.f.issuer.ticker || '').replace('-', '.').split(',')[0]} graph={graph} onSelect={onSelect} /><small>{getLanguage() === 'en' ? (r.direct === 'I' ? `Indirect · ${r.nature || ''}` : 'Direct ownership') : (r.direct === 'I' ? `间接 · ${r.nature || ''}` : '直接持有')}{r.f.aff10b5One ? ' · 10b5-1' : ''}</small>
                {r.footnotes?.length > 0 && <details className="filing-notes"><summary>{getLanguage() === 'en' ? 'SEC source notes' : 'SEC 原文脚注'}</summary>{r.footnotes.map((note, i) => <p key={i}>{note}</p>)}</details>}
              </td>
              <td className="num">{num(r.shares)}<small>{r.price != null ? `@ $${r.price.toFixed(2)}${r.value != null ? ` · ${usd(r.value)}` : ''}` : t('无价格')}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 40 && <button className="more" onClick={() => setAll(!all)}>{all ? t('收起') : (getLanguage() === 'en' ? `Show all ${rows.length} rows` : `展开全部 ${rows.length} 条`)}</button>}
      {data.filings[0]?.holdings?.length > 0 && <section className="reported-holdings">
        <h3>{getLanguage() === 'en' ? 'Reported holdings' : '申报中的持有记录'} · {data.filings[0].period}</h3>
        <p className="source">{getLanguage() === 'en' ? 'Snapshot in this filing; not current holdings or a complete portfolio.' : '仅为该原件的申报快照，不代表当前持仓或完整组合。'}</p>
        {data.filings[0].holdings.map((h, i) => <div key={i} className="reported-holding">
          <p>{h.security} <span className="mono">{num(h.after)}</span></p>
          <small>{getLanguage() === 'en' ? (h.direct === 'I' ? 'Indirect ownership' : 'Direct ownership') : (h.direct === 'I' ? '间接持有' : '直接持有')} · {h.table === 'd' ? (getLanguage() === 'en' ? 'Derivative' : '衍生证券') : (getLanguage() === 'en' ? 'Non-derivative' : '非衍生证券')}</small>
          {h.nature && <p className="source">{h.nature}</p>}
          {h.footnotes?.length > 0 && <details className="filing-notes"><summary>{getLanguage() === 'en' ? 'SEC source notes' : 'SEC 原文脚注'}</summary>{h.footnotes.map((note, j) => <p key={j}>{note}</p>)}</details>}
        </div>)}
      </section>}
      <p className="source">{getLanguage() === 'en' ? 'Source: SEC Form 4 original XML ' : '来源：SEC Form 4 原始 XML '}{data.filings.slice(0, 5).map(f => <a key={f.accession} href={f.index_url} target="_blank" rel="noreferrer">{f.filed} ↗</a>)}
        <br />{getLanguage() === 'en' ? 'P/S are open-market purchases and sales. A/M/F/G include awards, exercises, tax withholding, and gifts, not discretionary trades. 10b5-1 means the filing checked a pre-arranged trading plan.' : 'P/S 为公开市场买卖；A/M/F/G 等为授予、行权、缴税与赠与，不当作主动买卖。10b5-1 表示申报勾选了预设交易计划。'}</p>
    </>
  );
}

function StockPanel({graph, atlas, ticker, onSelect}) {
  const {data, loading, error} = useAsync(() => loadHolders(), []);
  const stock = graph.T.find(t => t.t === ticker);
  const h = data?.tickers?.[ticker];
  const groups = useMemo(() => {
    if (!h) return [];
    const g = graph.cats.map(() => []);
    for (const [s, k, v, dv] of h.h) g[graph.S[s].c].push({s: graph.S[s], k: graph.kinds[k], v, dv});
    g.forEach(list => list.sort((a, b) => (b.v || 0) - (a.v || 0)));
    return g;
  }, [h, graph]);
  const feed = graph.feed.filter(f => f[3] === ticker).slice(0, 8);
  return (
    <div className="panel">
      <div className="panel-head">
        <Sprite atlas={atlas} img={stock?.img ?? -1} size={56} label={ticker} color="#e8e6dc" />
        <div>
          <p className="eyebrow">{stock?.spx ? 'S&P 500' : ''}{stock?.spx && stock?.ndx ? ' · ' : ''}{stock?.ndx ? 'NASDAQ-100' : ''}{stock?.w ? ` · ${getLanguage() === 'en' ? 'SPY weight' : 'SPY 权重'} ${stock.w}%` : ''}</p>
          <h2 className="mono">{ticker}</h2>
          <p className="role">{h?.n || stock?.n}</p>
        </div>
      </div>
      {loading && <p className="loading">LOADING HOLDERS…</p>}
      {error && <p className="error">{t('资料加载失败，请稍后重试。')}</p>}
      {h && <p className="chips">{groups.map((g, i) => g.length ? <span key={i}><CatDot c={i} />{category(graph.cats[i])} {g.length}</span> : null)}</p>}
      {groups.map((g, i) => g.length > 0 && (
        <section key={i} className="holder-group">
          <h3><CatDot c={i} />{category(graph.cats[i])}</h3>
          <ul>
            {g.slice(0, 24).map(x => (
              <li key={x.s.id}>
                <button onClick={() => onSelect({kind: 's', id: x.s.id})}>
                  <Sprite atlas={atlas} img={x.s.img} size={22} label={x.s.en || x.s.n} color={CAT_COLORS[x.s.c]} />
                  <span>{subjectName(x.s, true)}</span>
                </button>
                <Kind k={x.k} />
                <span className="num">{typeof x.v === 'number' ? (x.v ? usd(x.v) : '—') : x.v}</span>
              </li>
            ))}
            {g.length > 24 && <li className="dim">{getLanguage() === 'en' ? `${g.length - 24} more` : `另有 ${g.length - 24} 个`}</li>}
          </ul>
        </section>
      ))}
      {feed.length > 0 && <section className="holder-group"><h3>{t('最近披露')}</h3><ul>{feed.map((f, i) => (
        <li key={i}><span className="dim mono">{f[0]}</span><span>{subjectName(graph.S[f[1]], true)}</span><Kind k={graph.kinds[f[4]]} /><span className="num">{typeof f[5] === 'number' ? usd(f[5]) : f[5]}</span></li>
      ))}</ul></section>}
      <p className="source">{t('关系来自 13F 季度持仓、众议院 PTR 与 Form 4。13F 为季末快照，PTR 为区间金额，Form 4 为实际交易；三者口径不同，不可直接相加。')}</p>
    </div>
  );
}

export {KIND_ZH};
