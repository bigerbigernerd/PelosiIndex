#!/usr/bin/env python3
"""Query the public 佩洛西指数 graph data (https://pelosi.pocketplay.win/data/v2/).

  python3 query.py subjects [--cat pol|ins|star|quant|sov]
  python3 query.py subject pelosi            # id or name fragment; prints the full disclosure shard summary
  python3 query.py ticker NVDA               # every subject linked to a ticker, by category
  python3 query.py overlap --min-cats 3      # tickers linked from at least N categories
  python3 query.py feed --n 30               # latest disclosed transactions
"""
import argparse
import json
import os
import urllib.request
import urllib.error
from urllib.parse import urljoin

BASE = os.environ.get('PELOSI_BASE', 'https://pelosi.pocketplay.win/data/v2/')
_cache = {}
_resolved_base = None


def load(path):
    global _resolved_base
    if _resolved_base is None:
        try:
            req = urllib.request.Request(urljoin(BASE, '../version.json'), headers={'User-Agent': 'pelosi-graph-data-skill/1.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                version = json.load(r)
            import re
            if not re.fullmatch(r'/data/revisions/[0-9a-f]{16}/', version['base']):
                raise ValueError('Invalid public data revision')
            _resolved_base = urljoin(BASE, version['base'])
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            _resolved_base = BASE
    if path not in _cache:
        req = urllib.request.Request(_resolved_base + path, headers={'User-Agent': 'pelosi-graph-data-skill/1.0'})
        with urllib.request.urlopen(req, timeout=60) as r:
            _cache[path] = json.loads(r.read())
    return _cache[path]


def find_subject(g, q):
    q = q.lower()
    exact = [s for s in g['S'] if s['id'] == q]
    return exact[0] if exact else next((s for s in g['S'] if q in f"{s['id']} {s['zh']} {s['n']} {s['en']}".lower()), None)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['subjects', 'subject', 'ticker', 'overlap', 'feed'])
    ap.add_argument('arg', nargs='?')
    ap.add_argument('--cat')
    ap.add_argument('--min-cats', type=int, default=3)
    ap.add_argument('--n', type=int, default=30)
    a = ap.parse_args()
    g = load('graph.json')
    cats = [c['id'] for c in g['cats']]
    if a.cmd == 'subjects':
        for s in g['S']:
            if not a.cat or cats[s['c']] == a.cat:
                print(f"{s['id']:28} {cats[s['c']]:5} {s['zh']}  — {s.get('r') or ''}")
    elif a.cmd == 'subject':
        s = find_subject(g, a.arg or '')
        if not s:
            raise SystemExit('subject not found; try `subjects`')
        sh = load(f"s/{s['id']}.json")
        print(f"# {s['zh']} ({s['en']}) · {g['cats'][s['c']]['zh']} · {s.get('r') or ''}\nsource type: {sh['type']}")
        if sh['type'] == '13f':
            print(f"periods: {json.dumps({k: (v['filed'], v['url']) for k, v in sh['periods'].items()})}\ncomparable: {sh['comparable']}")
            for p in [p for p in sh['positions'] if not p['pc']][:a.n]:
                print(f"  {p['t']:6} value ${(p['v2'] or 0) / 1e6:>10,.1f}M  shares {p['sh2'] or 0:>14,.0f}  {p['chg'] or '':5} {'' if p['pct'] is None else format(p['pct'], '+.1%')}")
        elif sh['type'] == 'ptr':
            rows = sorted([dict(r, url=f['url']) for f in sh['filings'] for r in f['rows']], key=lambda r: r['transaction_date'], reverse=True)
            for r in rows[:a.n]:
                print(f"  {r['transaction_date']} {r['type_raw']:12} {r['ticker'] or '-':6} {r['amount_raw']:26} owner={r['owner'] or '-':3} {r['url']}")
        else:
            for f in sh['filings'][:a.n]:
                print(f"filing {f['filed']} · report period {f['period']} · {f['index_url']}")
                for t in f['tx']:
                    shares = 'unknown' if t['shares'] is None else format(t['shares'], ',.0f')
                    price = 'unknown' if t['price'] is None else format(t['price'], ',.2f')
                    activity = 'open-market' if t['code'] in ('P', 'S') else 'non-market/other'
                    print(f"  {t['date']} {t['code']} {t['table']} {f['issuer']['ticker']} shares={shares} price={price} owner={t['direct']} after={t['after']} {activity} 10b5-1={f['aff10b5One']}")
                for h in f.get('holdings', []):
                    print(f"  reported holding ({f['period']}): {h['security']} units={h['after']} owner={h['direct']} {h.get('nature') or ''}")
    elif a.cmd == 'ticker':
        h = load('holders.json')['tickers'].get((a.arg or '').upper())
        if not h:
            raise SystemExit('ticker has no disclosed link in the dataset')
        print(f"# {a.arg.upper()} {h['n']} — {len(h['h'])} subjects")
        for s_i, k, v, dv in sorted(h['h'], key=lambda x: (g['S'][x[0]]['c'], -(x[2] if isinstance(x[2], (int, float)) else 0))):
            s = g['S'][s_i]
            display_value = v if isinstance(v, str) else f'${v:,.0f}' if v else '—'
            print(f"  {cats[s['c']]:5} {s['zh']:18} {g['kinds'][k]:6} {display_value}")
    elif a.cmd == 'overlap':
        h = load('holders.json')['tickers']
        rows = []
        for t, v in h.items():
            c = {g['S'][x[0]]['c'] for x in v['h']}
            if len(c) >= a.min_cats:
                rows.append((len(v['h']), t, v['n'], sorted(cats[i] for i in c)))
        for n, t, name, cs in sorted(rows, reverse=True)[:a.n]:
            print(f"  {t:6} {name[:28]:28} {n:4} subjects  {','.join(cs)}")
    elif a.cmd == 'feed':
        for d, s, _, t, k, v, src, n in g['feed'][:a.n]:
            print(f"  {d} {g['S'][s]['zh']:14} {g['kinds'][k]:5} {t:6} {v if isinstance(v, str) else f'${v:,.0f}'} {src}{f' ×{n}' if n > 1 else ''}")


if __name__ == '__main__':
    main()
