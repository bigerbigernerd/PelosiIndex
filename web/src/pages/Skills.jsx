import {useState} from 'react';
import {track} from '../data.js';
import {TopNav} from '../ui/common.jsx';
import {t, useLanguage} from '../i18n.js';

const ORIGIN = 'https://pelosi.pocketplay.win';
export const SKILLS = [
  {id: 'sec-13f-diff', name: '13F 季度对比', enName: '13F quarter-over-quarter comparison', tag: 'SEC 13F', desc: '给一家机构的名字或 CIK，自动找到最近两季 13F，逐行解析信息表，按 CUSIP 对齐股数，列出新建仓、清仓、增持、减持。自动识别合并报告、保密省略、修订和拆股。', enDesc: 'Find an institution’s two latest 13F filings, align share counts by CUSIP, and list new positions, exits, adds, and trims. Handles combination reports, confidential omissions, amendments, and stock splits.',
    prompt: '用 sec-13f-diff 对比伯克希尔最近两季 13F，列出新建仓、清仓和变动最大的 10 只股票，附原始文件链接。', enPrompt: 'Use sec-13f-diff to compare Berkshire Hathaway’s two latest 13F filings. List new positions, exits, and the 10 largest changes, with links to the original filings.'},
  {id: 'congress-ptr-reader', name: '国会议员交易', enName: 'Congressional PTR trades', tag: 'HOUSE PTR', desc: '从众议院书记官官方年度索引找到议员的 PTR，下载 PDF 并抽取每一笔交易：资产、代码、买卖、日期、金额区间和 Owner（本人/配偶/子女）。扫描件只给链接，不猜。', enDesc: 'Find House members’ PTRs in the Clerk’s official annual index, download PDFs, and extract assets, tickers, transaction types and dates, amount ranges, and owner codes. Scanned filings are linked without guessing their contents.',
    prompt: '用 congress-ptr-reader 找出 Nancy Pelosi 最近 6 份 PTR，按日期列出全部股票交易，并标注哪些是配偶（SP）名下。', enPrompt: 'Use congress-ptr-reader to find Nancy Pelosi’s six latest PTRs. List all stock transactions by date and identify those reported under spouse code (SP).'},
  {id: 'form4-insider-tracker', name: '内部人买卖', enName: 'Insider transactions', tag: 'SEC FORM 4', desc: '按人名或 CIK 拉取最近的 Form 4 原始 XML，解析交易代码（P/S/A/M/F/G）、价格、数量、交易后持股、直接/间接持有与 10b5-1 计划标记。', enDesc: 'Fetch recent Form 4 original XML by name or CIK. Parse transaction codes (P/S/A/M/F/G), prices, shares, post-transaction holdings, direct/indirect ownership, and the 10b5-1 plan flag.',
    prompt: '用 form4-insider-tracker 查黄仁勋今年的 Form 4，汇总公开市场卖出的股数和金额，并说明是否在 10b5-1 计划内。', enPrompt: 'Use form4-insider-tracker to review Jensen Huang’s Form 4 filings this year. Total open-market shares and value sold, and report whether the filings indicate a 10b5-1 plan.'},
  {id: 'pelosi-graph-data', name: '本站图谱数据', enName: 'Disclosure graph data', tag: 'OPEN JSON', desc: '直接读取本站公开的关系图 JSON：主体、股票、关系、最新披露，以及每个主体的分片明细。适合让 agent 回答“哪些主体同时持有某只股票”这类问题。', enDesc: 'Read this site’s public graph JSON: subjects, tickers, relationships, latest disclosures, and per-subject detail shards. Useful for questions about which subjects share a reported ticker.',
    prompt: '用 pelosi-graph-data 找出同时被政界人物、公司内部人和对冲基金连接的股票，按关联主体数排序。', enPrompt: 'Use pelosi-graph-data to find tickers connected to public officials, corporate insiders, and hedge funds, ranked by the number of connected subjects.'},
  {id: 'disclosure-research', name: '披露研究报告', enName: 'Disclosure research note', tag: 'REPORT', desc: '把上面拿到的证据整理成研究简报：事实 / 推断 / 未知 分开写，保留日期、Owner、期权与计划交易口径，资料不够时不编造目标价和收益。', enDesc: 'Turn the evidence above into a concise research note that separates facts, inference, and unknowns. Preserve dates, owner codes, options, and planned-trade context; do not invent price targets or returns.',
    prompt: '用 disclosure-research，把刚才的 13F 对比和 Form 4 结果写成一页研究简报，每条结论附来源链接。', enPrompt: 'Use disclosure-research to turn the 13F comparison and Form 4 results above into a one-page research note in English. Separate facts, inference, and unknowns, and cite source links for every conclusion.'},
  {id: 'pelosi-data-contributor', name: '新增人物与数据', enName: 'Contribute people and data', tag: 'CONTRIBUTE', desc: '教你的 agent 为本站补充人物和披露：核实身份与官方原件，校验 XML、CIK、日期及 SHA-256，保留信托、赠与与间接持有口径，准备可审核的数据贡献。附离线证据检查脚本；不直接改线上。', enDesc: 'Guide your agent through adding people and disclosures: verify official identities and originals, check XML, CIK, dates, and SHA-256, preserve trust transfers and indirect ownership, and prepare a reviewable contribution. Includes an offline evidence checker.',
    prompt: '用 pelosi-data-contributor，为佩洛西指数准备一个新人物的数据贡献。先查是否已经收录，再找官方原件并验证身份、日期和哈希；保留赠与、信托与间接持有说明，列出接入与验证结果。', enPrompt: 'Use pelosi-data-contributor to prepare a new profile contribution to Pelosi Index. Check whether the person already exists, collect official originals, validate identity, dates and hashes, and preserve gift, trust and indirect-ownership distinctions. Prepare a reviewable contribution in English.'},
];
const AGENTS = [
  ['Claude Code', '~/.claude/skills'],
  ['Grok CLI', '~/.grok/skills'],
  ['Codex', '~/.codex/skills'],
];

function Copy({text, label = '复制', event}) {
  useLanguage();
  const [done, setDone] = useState(false);
  return <button className="copy" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); if (event) track('skill_copy', event); } catch { /* clipboard blocked */ }
  }}>{done ? t('已复制 ✓') : t(label)}</button>;
}

export default function Skills() {
  const lang = useLanguage();
  const en = lang === 'en';
  const [agent, setAgent] = useState(0);
  const dir = AGENTS[agent][1];
  const all = `mkdir -p ${dir} && curl -fsSL ${ORIGIN}/downloads/pelosi-skills.zip -o /tmp/pelosi-skills.zip && unzip -o /tmp/pelosi-skills.zip -d ${dir}`;
  return (
    <div className="page">
      <TopNav page="skills" />
      <main className="wrap">
        <header className="page-head">
          <p className="eyebrow">// SKILLS</p>
          <h1>{t('把研究能力装进你的 agent')}</h1>
          <p className="lede">{en ? `These ${SKILLS.length} research and data-contribution skills work with skills-enabled agents such as Claude Code, Grok, and Codex. Research uses original SEC and House disclosures; the contribution skill validates evidence before review. Online AI analysis is not available.` : `下面 ${SKILLS.length} 个研究与数据贡献 skill，可用于 Claude Code、Grok、Codex 等支持 skills 的 agent。研究以 SEC、众议院官方原件为依据，数据贡献需先核验证据。本站不提供在线 AI 分析。`}</p>
        </header>
        <section className="install">
          <div className="seg" role="tablist" aria-label={t('选择 agent')}>
            {AGENTS.map(([name], i) => <button key={name} className={agent === i ? 'on' : ''} onClick={() => setAgent(i)} role="tab" aria-selected={agent === i}>{name}</button>)}
          </div>
          <div className="term">
          <p className="term-bar"><i /><i /><i /><span>{t('install · all skills')}</span></p>
            <pre><span className="prompt">$</span> {all}</pre>
            <Copy text={all} event={{what: 'install', skill: 'all', agent: AGENTS[agent][0]}} />
          </div>
          <p className="fine">{t('或单独')} <a href="/downloads/pelosi-skills.zip" download onClick={() => track('skill_download_click', {skill: 'all'})}>{t('下载全部 ZIP')}</a>。{t('目录名以你的 agent 实际配置为准。')}</p>
        </section>
        <ol className="skill-list">
          {SKILLS.map((s, i) => {
            const cmd = `mkdir -p ${dir} && curl -fsSL ${ORIGIN}/downloads/${s.id}.zip -o /tmp/${s.id}.zip && unzip -o /tmp/${s.id}.zip -d ${dir}`;
            return (
              <li key={s.id} className="skill">
                <p className="skill-n">{String(i + 1).padStart(2, '0')}</p>
                <div>
                  <p className="eyebrow">{s.tag}</p>
                  <h2>{en ? s.enName : s.name} <code>{s.id}</code></h2>
                  <p>{en ? s.enDesc : s.desc}</p>
                  <div className="skill-actions">
                    <a className="btn" href={`/downloads/${s.id}.zip`} download onClick={() => track('skill_download_click', {skill: s.id})}>{t('下载 ZIP')}</a>
                    <Copy text={cmd} label="复制安装命令" event={{what: 'install', skill: s.id, agent: AGENTS[agent][0]}} />
                    <Copy text={en ? s.enPrompt : s.prompt} label="复制示例提问" event={{what: 'prompt', skill: s.id}} />
                  </div>
                  <p className="example">“{en ? s.enPrompt : s.prompt}”</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="fine">{en ? 'Skills read public disclosures only. Congressional reports are subject to the use restrictions in 5 U.S.C. §13107 and may not be used for commercial solicitation or credit ratings. Identify your SEC User-Agent and follow its request-rate limits. Research is not investment advice.' : 'skill 只读取公开披露；国会报告受 5 U.S.C. §13107 用途限制，不得用于商业招揽或信用评级等用途。SEC 访问请声明 User-Agent 并遵守每秒请求上限。研究结果不构成投资建议。'}</p>
      </main>
    </div>
  );
}
