import {useSyncExternalStore} from 'react';
import {englishRole} from './roles-en.js';

function storedLanguage() { try { return localStorage.getItem('pelosi-lang') || 'zh'; } catch { return 'zh'; } }
function initialLanguage() {
  const query = new URLSearchParams(location.search).get('lang');
  if (query === 'en' || query === 'zh') return query;
  const hashLanguage = new URLSearchParams(location.hash.split('?')[1] || '').get('lang');
  if (hashLanguage === 'en' || hashLanguage === 'zh') return hashLanguage;
  if (location.pathname.startsWith('/en/')) return 'en';
  if (location.pathname === '/' || location.pathname.startsWith('/people/') || location.pathname.startsWith('/stocks/') || location.pathname.startsWith('/skills/')) return 'zh';
  return storedLanguage();
}
let language = initialLanguage();
const listeners = new Set();
export function getLanguage() { return language; }
export function setLanguage(next) {
  language = next === 'en' ? 'en' : 'zh';
  try { localStorage.setItem('pelosi-lang', language); } catch { /* language still works for this page */ }
  const url = new URL(location.href);
  let path = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  if (language === 'en') path = '/en' + (path.startsWith('/') ? path : `/${path}`);
  url.pathname = path;
  url.searchParams.delete('lang');
  history.pushState(null, '', url.pathname + url.search + url.hash);
  listeners.forEach(fn => fn());
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function useLanguage() { return useSyncExternalStore(fn => { const onPop = () => { language = initialLanguage(); listeners.forEach(cb => cb()); }; listeners.add(fn); window.addEventListener('popstate', onPop); return () => { listeners.delete(fn); window.removeEventListener('popstate', onPop); }; }, getLanguage, getLanguage); }
const strings = {
  "关系图": "Graph",
  "人物": "People",
  "股票导航": "Stocks",
  "股票": "Stocks",
  "股票代码": "Ticker",
  "主导航": "Main navigation",
  "搜索": "Search",
  "佩洛西指数首页": "Pelosi Index home",
  "搜索人物、机构或股票": "Search people, institutions, or stocks",
  "增持/新建/买入": "Add / new / buy",
  "减持/清仓/卖出": "Trim / exit / sell",
  "佩洛西指数 · 公开披露关系图": "Pelosi Index · Public Disclosure Graph",
  "人物与机构 · 佩洛西指数": "People & Institutions · Pelosi Index",
  "股票 · 佩洛西指数": "Stocks · Pelosi Index",
  "研究 Skills · 佩洛西指数": "Research Skills · Pelosi Index",
  "数据加载失败": "DATA LOAD FAILED",
  "重试": "Retry",
  "筛选：名字、机构、职务…": "Filter by name, institution, or role…",
  "筛选主体": "Filter subjects",
  "筛选股票": "Filter stocks",
  "代码或公司名…": "Ticker or company name…",
  "人物与机构": "People & Institutions",
  "个披露主体，按五类分组。点任意一位，回到关系图并展开 TA 的全部披露。": "disclosure subjects across five categories. Select a subject to open all disclosures in the graph.",
  "只证券，按被多少披露主体连接排序。色条显示五类主体的构成，右侧是本季加仓/买入减去减仓/卖出的数量。": "securities, ranked by the number of connected disclosing subjects. Bars show the five subject categories; the value at right is this quarter’s adds/buys minus trims/sells.",
  "关联最多": "Most connections",
  "净买入": "Net buying",
  "净卖出": "Net selling",
  "再显示 200 只（共": "Show 200 more (of",
  "LOADING TICKERS…": "LOADING TICKERS…",
  "关联股票数": "Connected ticker count",
  "扫描件": "scanned filing",
  "政界人物": "Public officials",
  "公司内部人": "Corporate insiders",
  "明星投资人": "Prominent investors",
  "对冲与量化": "Hedge funds & quant",
  "主权·养老·捐赠": "Sovereign, pension & endowment",
  "持有": "Hold",
  "增持": "Add",
  "减持": "Trim",
  "新建仓": "New position",
  "清仓": "Exit",
  "买入": "Buy",
  "卖出": "Sell",
  "买卖": "Mixed",
  "其他": "Other",
  "拆股": "Split",
  "数据概览": "Data overview",
  "分类筛选": "Filter categories",
  "视图控制": "View controls",
  "放大": "Zoom in",
  "缩小": "Zoom out",
  "全景": "Fit graph",
  "自动巡游": "Auto tour",
  "关系图：人物与机构连接到他们披露交易或持有的股票。可用搜索打开文字详情。": "Disclosure graph: people and institutions connect to stocks they reported trading or holding. Use search to open text details.",
  "LATEST ▸": "LATEST ▸",
  "原件": "filing",
  "搜索人物、机构或股票代码…  例如 pelosi / 城堡 / NVDA": "Search people, institutions, or ticker… e.g. pelosi / Citadel / NVDA",
  "谁在买，谁在卖。": "Who is buying and selling?",
  "政客、CEO、基金与主权财富，在同一张图上。": "Politicians, CEOs, funds, and sovereign wealth on one graph.",
  "SUBJECTS": "SUBJECTS",
  "TICKERS": "TICKERS",
  "LINKS": "LINKS",
  "RECORDS": "RECORDS",
  "13F 季末": "13F quarter-end",
  "对比": "vs.",
  "最新交易": "Latest transaction",
  "最新披露": "Latest disclosures",
  "搜索关键词": "Search query",
  "没有匹配结果": "No matches",
  "详情": "Details",
  "关闭详情": "Close details",
  "未找到该主体。": "Subject not found.",
  "在图中定位": "Locate in graph",
  "查看股票详情": "View stock details",
  "资料加载失败，请稍后重试。": "Could not load records. Please try again later.",
  "LOADING FILINGS…": "LOADING FILINGS…",
  "LOADING HOLDERS…": "LOADING HOLDERS…",
  "股票池内持仓": "Tracked-universe holdings",
  "两期报告口径不同（合并报告/保密省略/缺期），不计算增减持。": "The filings use different scopes (combined report, confidential omission, or missing period); position changes are not calculated.",
  "按市值": "By value",
  "按变动": "By change",
  "市值": "Value",
  "变动": "Change",
  "PTR 文件": "PTR filings",
  "交易行": "Transaction rows",
  "最近申报": "Latest filing",
  "公开市场卖出": "Open-market sales",
  "公开市场买入": "Open-market purchases",
  "证券": "Security",
  "数量 · 价格": "Shares · price",
  "来源": "Source",
  "关系来自 13F 季度持仓、众议院 PTR 与 Form 4。13F 为季末快照，PTR 为区间金额，Form 4 为实际交易；三者口径不同，不可直接相加。": "Relationships come from quarterly 13F holdings, House PTRs, and Form 4. 13F is a quarter-end snapshot, PTR amounts are ranges, and Form 4 reports transactions; their scopes differ and should not be added together.",
  "申报": "Filed",
  "对比上季": "Quarter comparison",
  "不可比": "Not comparable",
  "展开全部": "Show all",
  "收起": "Collapse",
  "交易": "Transaction",
  "资产": "Asset",
  "金额区间": "Amount range",
  "直接持有": "Direct ownership",
  "最近披露": "Recent disclosures",
  "众议院书记官 PTR 原件": "Original House Clerk PTR filing",
  "金额为申报区间，不是成交额；Owner 为原文（SP 配偶、JT 共同、DC 子女），不等于本人下单。": "Amounts are reported ranges, not transaction values. Owner codes follow the filing (SP spouse, JT joint, DC dependent child) and do not establish who placed the trade.",
  "来源：SEC 13F 信息表": "Source: SEC 13F information table",
  "来源：众议院书记官 PTR 原件": "Source: original House Clerk PTR filings",
  "来源：SEC Form 4 原始 XML": "Source: SEC Form 4 original XML",
  "来源：": "Source: ",
  "两期报告口径不同": "The two filings use different scopes",
  "期原件": " filing",
  "份为扫描件，未自动抽取，请阅读原件。": " filing(s) are scans and were not extracted. Please review the original.",
  "直接": "Direct",
  "间接": "Indirect",
  "· 部分": " · partial",
  "无价格": "No price",
  "个": "",
  "另有": "and",
  "没有": "No",
  "检索": "Search",
  "—": "—",
  "本季": "This quarter",
  "新建仓/清仓/增持/减持": "new positions, exits, adds, and trims",
  "季末": "Quarter end",
  "股": "shares",
  "Q2 原件": "Q2 filing",
  "Q1 原件": "Q1 filing",
  "本人/未注明": "Filer / unspecified",
  "部分": "Partial",
  "间接 · ": "Indirect · ",
  "P/S 为公开市场买卖；A/M/F/G 等为授予、行权、缴税与赠与，不当作主动买卖。10b5-1 表示申报勾选了预设交易计划。": "P/S are open-market purchases/sales. A/M/F/G include awards, exercises, tax withholding, and gifts, and are not treated as discretionary trades. 10b5-1 means the filing checked a pre-arranged trading plan.",
  "把研究能力装进你的 agent": "Bring research skills to your agent",
  "本站不再提供在线 AI 分析。下面 5 个 skill 直接从 SEC、众议院等官方源取数，脚本只用 Python 标准库与 pdftotext，可在 Claude Code、Grok、Codex 等支持 skills 的 agent 中使用。": "Online AI analysis is not available. These five skills retrieve data from official sources such as the SEC and House Clerk. Scripts use the Python standard library and pdftotext, and work with skills-enabled agents such as Claude Code, Grok, and Codex.",
  "选择 agent": "Choose an agent",
  "install · all skills": "install · all skills",
  "或单独": "Or download individually: ",
  "下载全部 ZIP": "Download all ZIPs",
  "目录名以你的 agent 实际配置为准。": "Use the skills directory configured for your agent.",
  "下载 ZIP": "Download ZIP",
  "复制安装命令": "Copy install command",
  "复制示例提问": "Copy sample prompt",
  "复制": "Copy",
  "已复制 ✓": "Copied ✓",
  "研究报告": "Research report",
  "或": "or",
  "政界人物：众议院 PTR（参议院与行政分支系统本次无法访问，暂未收录）。公司内部人：SEC Form 4。机构：SEC 13F（2026-06-30 与 2026-03-31 两期）。右侧数字为该主体关联的股票数。": "Public officials: House PTRs (Senate and executive-branch systems were inaccessible for this collection and are not included). Corporate insiders: SEC Form 4. Institutions: SEC 13F (periods ending 2026-06-30 and 2026-03-31). The number at right is the subject’s connected ticker count.",
};
export function t(value) { if (language !== 'en') return value; return strings[value] || value; }
export function category(cat) { return language === 'en' ? (strings[cat?.zh] || cat?.en) : cat?.zh; }
export function subjectName(subject, compact = false) { if (language !== 'en') return compact ? subject?.n : subject?.zh; return subject?.en || subject?.n || subject?.zh; }
export function roleText(subject) { return language === 'en' ? englishRole(subject) : (subject?.r || subject?.en || ''); }
export function kindName(key, fallback) { const zh = fallback || key; return t(zh); }
