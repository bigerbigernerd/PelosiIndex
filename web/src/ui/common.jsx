import {useEffect, useState} from 'react';
import {CAT_COLORS, KIND_TONE, KIND_ZH} from '../data.js';
import {category, getLanguage, kindName, setLanguage, subjectName, t, useLanguage} from '../i18n.js';

export function navigate(path) {
  if (getLanguage() === 'en' && !path.startsWith('/en/')) path = '/en' + path;
  if (getLanguage() !== 'en') path = path.replace(/^\/en(?=\/|$)/, '') || '/';
  if (location.pathname + location.search === path) return;
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function Link({to, children, className, ...rest}) {
  const href = getLanguage() === 'en' && !to.startsWith('/en/') ? `/en${to}` : getLanguage() !== 'en' ? (to.replace(/^\/en(?=\/|$)/, '') || '/') : to;
  return (
    <a href={href} className={className} onClick={e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    }} {...rest}>{children}</a>
  );
}

export function Kind({k}) {
  return <span className={`kind kind-${KIND_TONE[k] || 'flat'}`}>{kindName(k, KIND_ZH[k] || k)}</span>;
}

export function CatDot({c}) {
  return <i className="cat-dot" style={{'--c': CAT_COLORS[c]}} aria-hidden="true" />;
}

// Small avatar/logo cut from the shared sprite atlas; falls back to initials.
export function Sprite({atlas, img, size = 36, label, color, round = true}) {
  if (atlas && img >= 0) {
    const col = img % atlas.cols, row = Math.floor(img / atlas.cols);
    return <span className={`sprite${round ? ' round' : ''}`} style={{
      width: size, height: size, backgroundImage: `url(${atlas.src})`,
      backgroundSize: `${atlas.cols * size}px auto`, backgroundPosition: `-${col * size}px -${row * size}px`,
      '--ring': color || 'transparent',
    }} aria-hidden="true" />;
  }
  const text = String(label || '?').replace(/[^A-Za-z0-9一-鿿 ]/g, '').trim();
  const mono = /[一-鿿]/.test(text) ? text.slice(0, 1) : text.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <span className={`sprite mono${round ? ' round' : ''}`} style={{width: size, height: size, fontSize: size * 0.38, '--ring': color || 'transparent'}} aria-hidden="true">{mono}</span>;
}

export function useMedia(query) {
  const [match, setMatch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

export function TopNav({page, onSearch, overlay = false}) {
  const lang = useLanguage();
  const en = lang === 'en';
  const items = [['graph', '/', t('关系图')], ['people', '/people/', t('人物')], ['stocks', '/stocks/', t('股票导航')], ['skills', '/skills/', 'Skills']];
  const localized = path => en ? `/en${path}` : path;
  return (
    <header className={`topnav${overlay ? ' overlay' : ''}`}>
      <Link to={localized('/')} className="brand" aria-label={t('佩洛西指数首页')}>
        <span className="brand-mark">PI<b>//</b></span>
          <span className="brand-text"><strong>{en ? 'Pelosi Index' : '佩洛西指数'}</strong><small>PELOSI INDEX · DISCLOSURE GRAPH</small></span>
      </Link>
      <nav aria-label={t('主导航')}>
        {items.map(([id, to, label]) => <Link key={id} to={localized(to)} className={page === id ? 'on' : ''} aria-current={page === id ? 'page' : undefined}>{label}</Link>)}
      </nav>
      <button className="lang-btn" onClick={() => setLanguage(en ? 'zh' : 'en')} aria-label={en ? '切换到中文' : 'Switch to English'}>{en ? '中文' : 'EN'}</button>
      {onSearch && <button className="search-btn" onClick={onSearch} aria-label={t('搜索人物、机构或股票')}><span>{t('搜索')}</span><kbd>⌘K</kbd></button>}
    </header>
  );
}
