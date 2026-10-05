const cache = new Map();

export function getJSON(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return r.json();
    }).catch(e => { cache.delete(url); throw e; }));
  }
  return cache.get(url);
}

const DATA = `/data/revisions/${__PELOSI_DATA_REVISION__}/`;
export const loadGraph = () => getJSON(DATA + 'graph.json');
export const loadHolders = () => getJSON(DATA + 'holders.json');
export const loadShard = id => getJSON(`${DATA}s/${encodeURIComponent(id)}.json`);
export const loadAtlasMeta = () => getJSON(DATA + 'atlas.json').catch(() => null);

export function loadAtlasImage(meta) {
  if (!meta) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = meta.src;
  });
}

export const KIND_ZH = {hold: '持有', add: '增持', trim: '减持', new: '新建仓', exit: '清仓', buy: '买入', sell: '卖出', mixed: '买卖', other: '其他', split: '拆股'};
export const KIND_TONE = {hold: 'flat', add: 'up', new: 'up', buy: 'up', trim: 'down', exit: 'down', sell: 'down', mixed: 'mid', other: 'flat', split: 'flat'};
export const CAT_COLORS = ['#ff6a4d', '#f4b740', '#3ee08f', '#45c6ff', '#b18cff'];

export function usd(v, {sign = false} = {}) {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v;
  const a = Math.abs(v);
  const s = sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : (v < 0 ? '−' : '');
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`;
  return `${s}$${a.toFixed(0)}`;
}

export function num(v) {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${(v / 1e3).toFixed(1)}K`;
  return Number(v).toLocaleString('en-US');
}

export const pct = v => v == null ? '' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`;
export const shortDate = d => d ? d.slice(5).replace('-', '.') : '';

// First-party PocketPlay analytics (injected by the host); no personal input is ever sent.
export function track(name, data) {
  try { window.PPAnalytics?.track?.(name, data); } catch { /* analytics is optional */ }
}
