#!/usr/bin/env python3
"""Compare a manager's two most recent 13F-HR filings, straight from SEC EDGAR.

  export SEC_USER_AGENT="Your Name you@example.com"
  python3 f13_diff.py --name "berkshire hathaway"            # or --cik 1067983
  python3 f13_diff.py --cik 1423053 --top 25 --json out.json --csv out.csv
"""
import argparse
import collections
import csv
import json
import os
import sys
from xml.etree import ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgar import filing_files, get, num, recent_filings, search_cik, strip_ns  # noqa: E402

SPLITS = (2, 3, 4, 5, 10, 20)


def pick_filings(cik, period=None):
    """Latest two distinct report periods; restatements replace, 'new holdings' amendments add."""
    by_period = collections.defaultdict(list)
    for f in recent_filings(cik, {'13F-HR', '13F-HR/A'}):
        by_period[f['period']].append(f)
    periods = sorted(by_period, reverse=True)
    if period:
        periods = [p for p in periods if p <= period]
    return [(p, by_period[p]) for p in periods[:2]]


def load_period(cik, filings):
    base_rows, info = [], {}
    added = []
    for f in sorted(filings, key=lambda f: f['filed']):
        base, names = filing_files(cik, f['accession'])
        cover_name = next((n for n in names if n.lower() == 'primary_doc.xml'), None)
        cover = strip_ns(ET.fromstring(get(base + cover_name, binary=True))) if cover_name else None
        amend = (cover.findtext('.//amendmentInfo/amendmentType') or '').upper() if cover is not None else ''
        table = next((n for n in names if n.lower().endswith('.xml') and n != cover_name and 'primary' not in n.lower()), None)
        meta = {'accession': f['accession'], 'form': f['form'], 'filed': f['filed'], 'url': base + (table or ''),
                'reportType': cover.findtext('.//reportType') if cover is not None else None,
                'confidential': (cover.findtext('.//isConfidentialOmitted') or '').lower() == 'true' if cover is not None else None,
                'amendment': amend or None}
        rows = parse_table(get(base + table, binary=True)) if table else []
        if f['form'] == '13F-HR' or 'RESTATEMENT' in amend:
            base_rows, info = rows, meta
        elif 'NEW HOLDINGS' in amend:
            added.append(meta)
            base_rows = base_rows + rows
    info['added'] = [a['accession'] for a in added]
    return info, base_rows


def parse_table(xml):
    root = strip_ns(ET.fromstring(xml))
    rows = []
    for t in root.iter('infoTable'):
        if (t.findtext('shrsOrPrnAmt/sshPrnamtType') or '').strip() != 'SH':
            continue
        rows.append({'issuer': (t.findtext('nameOfIssuer') or '').strip(), 'cls': (t.findtext('titleOfClass') or '').strip(),
                     'cusip': (t.findtext('cusip') or '').strip().upper(), 'value': num(t.findtext('value')) or 0,
                     'shares': num(t.findtext('shrsOrPrnAmt/sshPrnamt')) or 0, 'pc': (t.findtext('putCall') or '').strip().upper()})
    return rows


def aggregate(rows):
    agg = {}
    for r in rows:
        a = agg.setdefault((r['cusip'], r['pc']), {'issuer': r['issuer'], 'cls': r['cls'], 'shares': 0, 'value': 0, 'lines': 0})
        a['shares'] += r['shares']
        a['value'] += r['value']
        a['lines'] += 1
    return agg


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cik')
    ap.add_argument('--name')
    ap.add_argument('--period', help='latest period to consider, YYYY-MM-DD')
    ap.add_argument('--top', type=int, default=20)
    ap.add_argument('--json')
    ap.add_argument('--csv')
    a = ap.parse_args()
    cik = a.cik
    if not cik:
        if not a.name:
            ap.error('give --cik or --name')
        hits = search_cik(a.name, '13F-HR')
        if len(hits) != 1:
            print('Multiple or no matches; rerun with --cik:', file=sys.stderr)
            for c, n in hits[:15]:
                print(f'  {c}  {n}', file=sys.stderr)
            sys.exit(2)
        cik = hits[0][0]
    pair = pick_filings(cik, a.period)
    if len(pair) < 1:
        sys.exit('no 13F-HR filings found')
    (p2, f2), (p1, f1) = pair[0], (pair[1] if len(pair) > 1 else (None, []))
    i2, r2 = load_period(cik, f2)
    i1, r1 = load_period(cik, f1) if f1 else ({}, [])
    A2, A1 = aggregate(r2), aggregate(r1)
    comparable = bool(r1) and i2.get('reportType') == i1.get('reportType') and not i2.get('confidential') and not i1.get('confidential') \
        and 0.5 <= len(r1) / max(1, len(r2)) <= 2
    out = []
    for key in set(A2) | set(A1):
        x2, x1 = A2.get(key), A1.get(key)
        chg, pct = None, None
        if comparable:
            if x2 and not x1:
                chg = 'NEW'
            elif x1 and not x2:
                chg = 'EXIT'
            elif x1['shares']:
                pct = x2['shares'] / x1['shares'] - 1
                ratio = x2['shares'] / x1['shares']
                vr = x2['value'] / x1['value'] if x1['value'] else 0
                split = any(abs(ratio - k) < 0.002 * k or abs(ratio - 1 / k) < 0.002 / k for k in SPLITS) and 0.6 < vr < 1.6
                chg = 'SPLIT?' if split else 'HOLD' if abs(pct) < 0.05 else 'ADD' if pct > 0 else 'TRIM'
        x = x2 or x1
        price = (x2['value'] / x2['shares']) if x2 and x2['shares'] else (x1['value'] / x1['shares'] if x1 and x1['shares'] else 0)
        dv = ((x2['shares'] if x2 else 0) - (x1['shares'] if x1 else 0)) * price if comparable else None
        out.append({'cusip': key[0], 'putCall': key[1] or None, 'issuer': x['issuer'], 'class': x['cls'],
                    'shares_now': x2 and x2['shares'], 'value_now': x2 and x2['value'], 'shares_prev': x1 and x1['shares'],
                    'value_prev': x1 and x1['value'], 'change': chg, 'pct': pct, 'delta_value_est': dv, 'lines': x['lines']})
    out.sort(key=lambda r: -(r['value_now'] or 0))
    meta = {'cik': cik, 'period_now': p2, 'period_prev': p1, 'filing_now': i2, 'filing_prev': i1, 'comparable': comparable,
            'note': 'Rows from different discretion/other-manager lines within one filing are summed. Values are as reported (USD since 2023). '
                    'Changes compare share counts only; intraquarter trades are not observable.'}
    print(f"# 13F {i2.get('form')} CIK {cik}: {p2} vs {p1 or '—'}  (comparable={comparable})")
    print(f"now:  {i2.get('url')}\nprev: {i1.get('url', '—')}\nreportType {i2.get('reportType')} / {i1.get('reportType')}\n")
    print('## Top holdings now')
    for r in out[:a.top]:
        pct = '' if r['pct'] is None else format(r['pct'], '+.1%')
        print(f"{r['issuer'][:28]:28} {r['class'][:10]:10} {r['putCall'] or '':4} ${(r['value_now'] or 0) / 1e6:>10,.1f}M  {r['change'] or '':6} {pct}")
    if comparable:
        moves = sorted([r for r in out if r['change'] in ('NEW', 'EXIT', 'ADD', 'TRIM') and r['delta_value_est']], key=lambda r: -abs(r['delta_value_est']))
        print('\n## Biggest moves (share change x latest implied price)')
        for r in moves[:a.top]:
            print(f"{r['change']:5} {r['issuer'][:28]:28} {r['class'][:10]:10} ~${r['delta_value_est'] / 1e6:>+10,.1f}M")
    else:
        print('\nNot comparable (different report type, confidential omission, missing prior period, or table-size break): no change labels.')
    if a.json:
        json.dump({'meta': meta, 'positions': out}, open(a.json, 'w'), indent=1)
    if a.csv:
        with open(a.csv, 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=list(out[0].keys()) if out else ['cusip'])
            w.writeheader()
            w.writerows(out)


if __name__ == '__main__':
    main()
