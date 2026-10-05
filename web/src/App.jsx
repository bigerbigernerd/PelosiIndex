import {lazy, Suspense, useEffect, useState} from 'react';
import {loadAtlasImage, loadAtlasMeta, loadGraph} from './data.js';
import LiveGraph from './graph/LiveGraph.jsx';
import {getLanguage, t, useLanguage} from './i18n.js';

const People = lazy(() => import('./pages/People.jsx'));
const Stocks = lazy(() => import('./pages/Stocks.jsx'));
const Skills = lazy(() => import('./pages/Skills.jsx'));
const TITLES = {graph: '佩洛西指数 · 公开披露关系图', people: '人物与机构 · 佩洛西指数', stocks: '股票 · 佩洛西指数', skills: '研究 Skills · 佩洛西指数'};

function route() {
  // v1 hash links: #people?view=holdings&id=berkshire -> /?focus=berkshire
  const hash = location.hash.slice(1);
  if (hash) {
    const [page, query = ''] = hash.split('?');
    const p = new URLSearchParams(query);
    const alias = {'duquesne-family-office': 'duquesne'};
    const id = p.get('id');
    const lang = getLanguage();
    const prefix = lang === 'en' ? '/en' : '';
    const target = page === 'people' && id ? `${prefix}/?focus=${encodeURIComponent(alias[id] || id)}` : page === 'stocks' ? `${prefix}/stocks/` : page === 'skills' ? `${prefix}/skills/` : `${prefix}/`;
    history.replaceState(null, '', target);
  }
  const path = location.pathname.replace(/^\/en(?=\/|$)/, '').replace(/\/+$/, '/') || '/';
  return path.startsWith('/people') ? 'people' : path.startsWith('/stocks') ? 'stocks' : path.startsWith('/skills') ? 'skills' : 'graph';
}

export function App() {
  const lang = useLanguage();
  const [page, setPage] = useState(route);
  const [graph, setGraph] = useState(null);
  const [atlas, setAtlas] = useState(null);
  const [atlasImg, setAtlasImg] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const on = () => { setPage(route()); window.scrollTo(0, 0); };
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  useEffect(() => {
    const queryLang = new URLSearchParams(location.search).get('lang');
    if (queryLang === 'en' || queryLang === 'zh') {
      const url = new URL(location.href);
      let path = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
      if (queryLang === 'en') path = `/en${path}`;
      url.pathname = path;
      url.searchParams.delete('lang');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    const title = t(TITLES[page]);
    const descriptions = {
      graph: lang === 'en' ? 'Public disclosure relationships for US public officials, corporate insiders, funds, and sovereign investors. Data from original House PTR, SEC 13F, and Form 4 filings.' : '佩洛西指数：把国会议员、公司内部人、明星投资人、对冲量化与主权基金的公开披露连成一张关系图。数据来自众议院 PTR、SEC 13F 与 Form 4 原件。',
      people: lang === 'en' ? 'Browse public officials, corporate insiders, prominent investors, hedge funds, and sovereign, pension, and endowment filers.' : '浏览政界人物、公司内部人、明星投资人、对冲量化与主权养老捐赠机构的公开披露。',
      stocks: lang === 'en' ? 'Explore securities connected to public disclosures, with source-specific filing details.' : '查看公开披露关联证券及其各自来源文件。',
      skills: lang === 'en' ? 'Download research skills for public SEC and House disclosures. No online AI analysis is provided.' : '下载公开 SEC 与众议院披露研究 Skills；本站不提供在线 AI 分析。',
    };
    document.title = title;
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.body.dataset.page = page;
    let desc = document.querySelector('meta[name="description"]');
    if (!desc) { desc = document.createElement('meta'); desc.name = 'description'; document.head.append(desc); }
    desc.content = descriptions[page];
    const routePath = location.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    const base = lang === 'en' ? `/en${routePath}` : routePath;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = `https://pelosi.pocketplay.win${base}`;
    for (const [locale, href] of [['zh-CN', `https://pelosi.pocketplay.win${routePath}`], ['en', `https://pelosi.pocketplay.win/en${routePath}`], ['x-default', `https://pelosi.pocketplay.win${routePath}`]]) {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${locale}"]`);
      if (!link) { link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = locale; document.head.append(link); }
      link.href = href;
    }
    for (const [property, value] of [['og:title', title], ['og:description', descriptions[page]], ['og:locale', lang === 'en' ? 'en_US' : 'zh_CN'], ['og:url', `https://pelosi.pocketplay.win${base}`], ['og:site_name', lang === 'en' ? 'Pelosi Index' : '佩洛西指数']]) {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('property', property); document.head.append(meta); }
      meta.content = value;
    }
    for (const [name, value] of [['twitter:title', title], ['twitter:description', descriptions[page]]]) {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.append(meta); }
      meta.content = value;
    }
  }, [page, lang]);
  useEffect(() => {
    loadGraph().then(setGraph, setError);
    loadAtlasMeta().then(meta => { setAtlas(meta); return loadAtlasImage(meta); }).then(setAtlasImg);
  }, []);
  if (error) return <div className="boot error"><p>// {t('数据加载失败')}</p><button onClick={() => location.reload()}>{t('重试')}</button></div>;
  if (page === 'skills') return <Suspense fallback={<Boot />}><Skills /></Suspense>;
  if (!graph) return <Boot />;
  return (
    <Suspense fallback={<Boot />}>
      {page === 'graph' && <LiveGraph graph={graph} atlas={atlasImg ? atlas : null} atlasImg={atlasImg} />}
      {page === 'people' && <People graph={graph} atlas={atlasImg ? atlas : null} />}
      {page === 'stocks' && <Stocks graph={graph} atlas={atlasImg ? atlas : null} />}
    </Suspense>
  );
}

function Boot() {
  return <div className="boot" aria-live="polite"><p><span className="blink">▌</span> {t('LOADING DISCLOSURE GRAPH')}</p></div>;
}
