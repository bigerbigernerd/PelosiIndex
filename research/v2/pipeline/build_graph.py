"""Merge parsed sources into the public v2 graph: graph.json (hero), s/<id>.json shards (lazy), holders.json (lazy)."""
import collections
import datetime
import json
import math
import re
import shutil
import subprocess
from common import OUT, V2, WEB_DATA, SOURCES, ROOT, load_json, write_json, universe, spy_weights, short_name

CATS = [
    {'id': 'pol', 'zh': '政界人物', 'en': 'POLITICS'},
    {'id': 'ins', 'zh': '公司内部人', 'en': 'INSIDERS'},
    {'id': 'star', 'zh': '明星投资人', 'en': 'SUPERINVESTORS'},
    {'id': 'quant', 'zh': '对冲与量化', 'en': 'HEDGE & QUANT'},
    {'id': 'sov', 'zh': '主权·养老·捐赠', 'en': 'SOVEREIGN & ENDOWMENT'},
]
CAT = {c['id']: i for i, c in enumerate(CATS)}
GROUP_CAT = {'star': 'star', 'value': 'star', 'activist': 'star', 'quant-multistrat': 'quant', 'sovereign': 'sov'}
CAT_OVERRIDE = {'gates-foundation-trust': 'sov'}
KINDS = ['hold', 'add', 'trim', 'new', 'exit', 'buy', 'sell', 'mixed', 'other']
K = {k: i for i, k in enumerate(KINDS)}
TOP_VALUE, TOP_MOVE, TOP_POL = 8, 6, 14
SKIP_SUBJECTS = {'scion'}     # latest 13F is 2025-09-30; listed in the directory only


def norm_ticker(t):
    if not t:
        return None
    t = t.strip().upper().replace('/', '.').replace('-', '.').replace(' ', '.')
    t = t.split(',')[0].strip()
    return None if t in ('NONE', 'N.A', 'NA', '') else t


def sig(v):
    """Round to 3 significant digits so the hero file stays compact."""
    if not v:
        return 0
    digits = 3 - int(math.floor(math.log10(abs(v)))) - 1
    return int(round(v, digits)) if digits <= 0 else round(v, digits)


def money(v):
    if v >= 1e6:
        return f'${v / 1e6:.1f}M'.replace('.0M', 'M')
    if v >= 1e3:
        return f'${v / 1e3:.0f}K'
    return f'${v:.0f}'


def build():
    stocks_u, _, _ = universe()
    weights = spy_weights()
    f13 = load_json(OUT / '13f.json')
    f4 = load_json(OUT / 'form4.json')['people']
    ptr = load_json(OUT / 'ptr.json')['people']
    names = {}
    names_path = SOURCES / 'names' / 'output.json'
    if names_path.exists():
        names = {n['id']: n for n in load_json(names_path)['subjects']}
    atlas = load_json(WEB_DATA / 'atlas.json')['index'] if (WEB_DATA / 'atlas.json').exists() else {}

    subjects, edges, shards, feed = [], [], {}, []
    extra_names = {}

    def add_subject(sid, cat, zh, en, role, kind, img_key, meta):
        n = names.get(sid, {})
        subjects.append({'id': sid, 'c': CAT[cat], 'n': n.get('short') or zh or en, 'zh': n.get('zh') or zh or en, 'en': n.get('en_short') or en,
                         'r': n.get('role_zh') or role, 'k': kind, 'img': atlas.get(img_key, -1), **meta})
        return len(subjects) - 1

    # ---- institutions (13F)
    q2 = f13['q2']
    for sid, s in f13['subjects'].items():
        if sid in SKIP_SUBJECTS or not s['positions']:
            continue
        cat = CAT_OVERRIDE.get(sid) or GROUP_CAT.get(s['group'], 'star')
        p2 = s['periods'].get(q2) or {}
        idx = add_subject(sid, cat, s['zh'], s['en'], s.get('person'), '13f', f'inst:{sid}',
                          {'period': q2, 'filed': p2.get('filed'), 'cmp': s['comparable']})
        stock_pos = [p for p in s['positions'] if not p['pc']]
        by_value = sorted([p for p in stock_pos if p['v2']], key=lambda p: -p['v2'])[:TOP_VALUE]
        by_move = sorted([p for p in stock_pos if p['dv']], key=lambda p: -abs(p['dv']))[:TOP_MOVE]
        chosen = {p['t']: p for p in by_value + by_move}
        for p in s['positions']:
            if p['pc']:
                continue
            kind = p['chg'] if p['chg'] in K else 'hold'
            value = p['v2'] if p['v2'] else p['v1']
            edges.append({'s': idx, 't': p['t'], 'k': K[kind], 'v': sig(value), 'dv': sig(p['dv']), 'hero': p['t'] in chosen})
        moves = sorted([p for p in stock_pos if p['dv'] and p['chg'] in ('new', 'exit', 'add', 'trim')], key=lambda p: -abs(p['dv']))[:3]
        for p in moves:
            feed.append({'d': p2.get('filed'), 's': idx, 't': p['t'], 'k': K[p['chg']], 'v': sig(abs(p['dv'])), 'src': '13F'})
        shards[sid] = {'id': sid, 'type': '13f', 'periods': s['periods'], 'comparable': s['comparable'], 'positions': s['positions']}

    # ---- insiders (Form 4)
    for p in f4:
        if not p['filings']:
            continue
        category = p.get('category', 'ins')
        latest = max(p['filings'], key=lambda f: (f['filed'] or '', f['accession']))
        meta = {'cik': p['cik'], 'home': norm_ticker(p['ticker']), 'filed': latest['filed'], 'period': latest['period'],
                **{k: p[k] for k in ('role_en', 'coverage_note_zh', 'coverage_note_en') if p.get(k)}}
        idx = add_subject(p['id'], category, p['zh'], p['en'], p.get('role_zh') or p['title'], 'form4', f"avatar:{p['id']}", meta)
        per = collections.defaultdict(lambda: {'buy': 0, 'sell': 0, 'other': 0, 'bv': 0, 'sv': 0})
        for f in p['filings']:
            t = norm_ticker(f['issuer']['ticker'])
            if not t:
                continue
            extra_names.setdefault(t, f['issuer']['name'])
            for x in f['tx']:
                if x['table'] != 'nd':
                    continue
                a = per[t]
                if x['code'] == 'P':
                    a['buy'] += 1
                    a['bv'] += x['value'] or 0
                elif x['code'] == 'S':
                    a['sell'] += 1
                    a['sv'] += x['value'] or 0
                else:
                    a['other'] += 1
                if x['code'] in ('P', 'S') and x['date']:
                    feed.append({'d': x['date'], 's': idx, 't': t, 'k': K['buy' if x['code'] == 'P' else 'sell'], 'v': sig(x['value']), 'src': 'Form 4',
                                 'plan': f['aff10b5One']})
        for t, a in per.items():
            kind = 'mixed' if a['buy'] and a['sell'] else 'buy' if a['buy'] else 'sell' if a['sell'] else 'other'
            edges.append({'s': idx, 't': t, 'k': K[kind], 'v': sig(a['bv'] + a['sv']), 'dv': sig(a['bv'] - a['sv']), 'hero': True})
        shards[p['id']] = {'id': p['id'], 'type': 'form4', 'cik': p['cik'], 'filings': p['filings']}

    # ---- politicians (House PTR)
    for p in ptr:
        rows = [(f, r) for f in p['filings'] for r in f['rows']]
        idx = add_subject(p['id'], 'pol', p['zh'], p['en'], p['office'], 'ptr', f"avatar:{p['id']}",
                          {'party': p['party'], 'bioguide': p['bioguide'], 'scanned': not rows})
        per = collections.defaultdict(lambda: {'buy': 0, 'sell': 0, 'other': 0, 'lo': 0, 'hi': 0})
        for f, r in rows:
            t = norm_ticker(r['ticker'])
            if not t or r['asset_type'] not in ('ST', 'OP'):
                continue
            extra_names.setdefault(t, re.sub(r'\s*\(.*$', '', r['asset']).replace(' - Common Stock', '').strip())
            a = per[t]
            a['buy' if r['kind'] == 'purchase' else 'sell' if r['kind'] in ('sale', 'partial_sale') else 'other'] += 1
            a['lo'] += r['amount_min'] or 0
            a['hi'] += r['amount_max'] or r['amount_min'] or 0
            feed.append({'d': r['transaction_date'], 's': idx, 't': t, 'k': K['buy' if r['kind'] == 'purchase' else 'sell' if 'sale' in r['kind'] else 'other'],
                         'v': r['amount_raw'], 'src': 'PTR', 'own': r['owner']})
        top = set(sorted(per, key=lambda t: -per[t]['hi'])[:TOP_POL])
        for t, a in per.items():
            kind = 'mixed' if a['buy'] and a['sell'] else 'buy' if a['buy'] else 'sell' if a['sell'] else 'other'
            edges.append({'s': idx, 't': t, 'k': K[kind], 'v': sig(a['hi']), 'range': f"{money(a['lo'])}–{money(a['hi'])}", 'dv': None, 'hero': t in top})
        shards[p['id']] = {'id': p['id'], 'type': 'ptr', 'bioguide': p['bioguide'], 'filings': p['filings']}

    # ---- stocks: every ticker that has an edge
    tickers = sorted({e['t'] for e in edges})
    hero_tickers = sorted({e['t'] for e in edges if e['hero']})
    tindex = {t: i for i, t in enumerate(hero_tickers)}
    stocks = []
    for t in hero_tickers:
        u = stocks_u.get(t)
        name = short_name(u['name']) if u else short_name(extra_names.get(t, t))
        attrs = (u or {}).get('attributes', [])
        stocks.append({'t': t, 'n': name, 'w': round(weights.get(t, 0), 3), 'ndx': 'ndx' in attrs or 'nasdaq100' in attrs,
                       'spx': 'sp500' in attrs, 'img': atlas.get(f'logo:{t}', -1)})
    hero_edges = [[e['s'], tindex[e['t']], e['k'], e['v']] for e in edges if e['hero']]

    # degree across categories for spotlight captions
    holders = collections.defaultdict(list)
    for e in edges:
        holders[e['t']].append([e['s'], e['k'], e.get('range') or e['v'], e['dv']])
    spot = []
    for t, hs in holders.items():
        cats = collections.Counter(subjects[h[0]]['c'] for h in hs)
        if len(cats) >= 3 and t in tindex:
            spot.append({'t': tindex[t], 'n': len(hs), 'cats': [cats.get(i, 0) for i in range(len(CATS))],
                         'buy': sum(1 for h in hs if KINDS[h[1]] in ('add', 'new', 'buy')), 'sell': sum(1 for h in hs if KINDS[h[1]] in ('trim', 'exit', 'sell'))})
    spot.sort(key=lambda s: (-len([c for c in s['cats'] if c]), -s['n']))

    # merge same-day, same-subject, same-ticker, same-direction rows (e.g. many Form 4 fills) and keep the ticker varied
    merged = {}
    for f in feed:
        if not f['d']:
            continue
        key = (f['d'], f['s'], f['t'], f['k'], f['src'])
        if key in merged:
            m = merged[key]
            if isinstance(m['v'], (int, float)) and isinstance(f['v'], (int, float)):
                m['v'] = sig(m['v'] + f['v'])
            m['n'] += 1
        else:
            merged[key] = dict(f, n=1)
    feed = sorted(merged.values(), key=lambda f: f['d'], reverse=True)
    per_subject = collections.Counter()
    picked, rest = [], []
    for f in feed:
        (picked if per_subject[f['s']] < 2 else rest).append(f)
        per_subject[f['s']] += 1
    feed = picked + rest
    feed_out = [[f['d'], f['s'], tindex.get(f['t'], -1), f['t'], f['k'], f['v'], f['src'], f['n']] for f in feed[:160]]

    total = collections.Counter(e['s'] for e in edges)
    sub_out = []
    for i, s in enumerate(subjects):
        s = dict(s, nT=total.get(i, 0))
        sub_out.append(s)
    graph = {
        'v': 2, 'generated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'),
        'asOf': {'q2': f13['q2'], 'q1': f13['q1'], 'feedLatest': feed[0]['d'] if feed else None},
        'cats': CATS, 'kinds': KINDS, 'S': sub_out, 'T': stocks, 'E': hero_edges, 'feed': feed_out, 'spot': spot[:40],
        'stats': {'subjects': len(subjects), 'stocks': len(tickers), 'edges': len(edges), 'heroEdges': len(hero_edges),
                  'ptrRows': sum(len(f['rows']) for p in ptr for f in p['filings']),
                  'form4Tx': sum(len(f['tx']) for p in f4 for f in p['filings']),
                  'f13Positions': sum(len(s['positions']) for s in f13['subjects'].values()),
                  'byCat': [sum(1 for s in subjects if s['c'] == i) for i in range(len(CATS))]},
    }
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    write_json(V2 / 'out' / 'graph-nolayout.json', graph, compact=True)
    subprocess.run(['node', str(ROOT / 'web' / 'scripts' / 'layout.mjs'), str(V2 / 'out' / 'graph-nolayout.json'), str(WEB_DATA / 'graph.json')], check=True)
    shard_dir = WEB_DATA / 's'
    if shard_dir.exists():
        shutil.rmtree(shard_dir)
    for sid, sh in shards.items():
        write_json(shard_dir / f'{sid}.json', sh, compact=True)
    sidx = {s['id']: i for i, s in enumerate(subjects)}
    write_json(WEB_DATA / 'holders.json', {'tickers': {t: {'n': short_name((stocks_u.get(t) or {}).get('name') or extra_names.get(t, t)),
                                                         'h': holders[t]} for t in tickers}}, compact=True)
    print(json.dumps(graph['stats'], ensure_ascii=False), 'heroStocks', len(stocks))


if __name__ == '__main__':
    build()
