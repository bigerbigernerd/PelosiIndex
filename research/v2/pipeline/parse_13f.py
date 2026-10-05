"""13F information tables (raw SEC XML) -> per-subject positions for Q2 2026 and Q1 2026, with share-count changes.

Rules (see research/README.md and g3 REPORT):
- Only SH rows; positions keyed by CUSIP + putCall. Rows from different discretion/other-manager lines of the SAME filing are summed
  into the filer's total reported position (labelled as such). Different filings/entities are never merged.
- 13F-HR/A restatement replaces that period's table; "new holdings" amendments are appended.
- No change is derived when either period is a combination report, has confidential omissions, or is missing.
- Changes use share counts only; a share ratio that is an exact split multiple with flat value is treated as a split (hold).
"""
import collections
import re
import statistics
from common import SOURCES, OUT, RESEARCH, V2, load_json, parse_xml, text, num, sha256, universe, write_json

G3 = SOURCES / 'institutions'
Q2, Q1 = '2026-06-30', '2026-03-31'
ALIASES = {'duquesne-family-office': 'duquesne'}
NAME_PATTERNS = {
    'ALAB': r'ASTERA LABS', 'ALNY': r'ALNYLAM', 'ARM': r'^ARM HOLDINGS', 'ASML': r'^ASML', 'CCEP': r'COCA[- ]?COLA EUROPAC',
    'CRWV': r'COREWEAVE', 'EA': r'ELECTRONIC ARTS', 'FER': r'FERROVIAL', 'MELI': r'MERCADOLIBRE', 'MSTR': r'^(MICRO)?STRATEGY',
    'NBIS': r'NEBIUS', 'PDD': r'^PDD HOLDINGS', 'RKLB': r'ROCKET LAB', 'SHOP': r'SHOPIFY', 'SPCX': r'SPACE EXPLORATION|SPACEX|SPACE EXPL',
    'TRI': r'THOMSON REUTERS',
}


def read_table(path):
    doc = parse_xml(path)
    rows = []
    for t in doc.iter('infoTable'):
        rows.append({
            'issuer': text(t, 'nameOfIssuer'), 'cls': text(t, 'titleOfClass'), 'cusip': (text(t, 'cusip') or '').upper(),
            'value': num(text(t, 'value')), 'shares': num(text(t, 'shrsOrPrnAmt/sshPrnamt')),
            'type': text(t, 'shrsOrPrnAmt/sshPrnamtType'), 'pc': (text(t, 'putCall') or '').upper() or None,
        })
    return rows


def cover(path):
    if not path or not path.exists():
        return {}
    doc = parse_xml(path)
    return {'reportType': text(doc, './/coverPage/reportType') or text(doc, './/reportType'),
            'confidentialOmitted': (text(doc, './/isConfidentialOmitted') or '').lower() == 'true',
            'tableEntryTotal': num(text(doc, './/summaryPage/tableEntryTotal')),
            'tableValueTotal': num(text(doc, './/summaryPage/tableValueTotal'))}


def collect_filings():
    """subject -> period -> list of filing dicts (base + amendments) with local table path."""
    out = collections.defaultdict(lambda: collections.defaultdict(list))
    meta = {}
    huge = {(h['accession']): V2 / h['path'] for h in load_json(V2 / 'sec-huge' / 'manifest.json')}
    v1 = load_json(RESEARCH / 'expansion' / 'manifest.json')
    covers = {c['accession']: V2 / c['path'] for c in load_json(V2 / 'sec-covers' / 'manifest.json')}
    for f in v1['filings']:
        sid = ALIASES.get(f['id'], f['id'])
        if f['period'] not in (Q2, Q1) and sid != 'scion':
            continue
        out[sid][f['period']].append({'form': '13F-HR', 'accession': f['accession'], 'filed': f['filed'], 'amend': None,
                                      'table': RESEARCH / f['raw_file'], 'sha256': f['sha256'], 'url': f['source_url'], 'cover': covers.get(f['accession']),
                                      'entity': f['entity'], 'cik': f['cik']})
    for inst in load_json(G3 / 'roster.json')['institutions']:
        sid = ALIASES.get(inst['id'], inst['id'])
        meta[sid] = inst
        for f in inst['filings']:
            if f['period'] not in (Q2, Q1):
                continue
            it = f.get('information_table') or {}
            table = huge.get(f['accession']) if it.get('skipped') else (G3 / it['path'] if it.get('path') else None)
            pd = f.get('primary_doc') or {}
            existing = {x['accession'] for x in out[sid][f['period']]}
            if f['accession'] in existing:
                continue
            out[sid][f['period']].append({'form': f['form'], 'accession': f['accession'], 'filed': f['filingDate'],
                                          'amend': f.get('amendment_kind'), 'table': table, 'url': it.get('url'),
                                          'cover': G3 / pd['path'] if pd.get('path') else None, 'entity': inst['en'], 'cik': inst['cik']})
    # amendments found after collection (e.g. Citadel's Q2 restatement filed 2026-09-02)
    for a in load_json(V2 / 'sec-amend' / 'manifest.json'):
        sid = ALIASES.get(a['id'], a['id'])
        if a['accession'] not in {x['accession'] for x in out[sid][a['period']]}:
            out[sid][a['period']].append({'form': a['form'], 'accession': a['accession'], 'filed': a['filed'], 'amend': a['amendment_kind'],
                                          'table': V2 / a['table'], 'url': a['url'], 'cover': V2 / a['cover'],
                                          'entity': (meta.get(sid) or {}).get('en'), 'cik': (meta.get(sid) or {}).get('cik')})
    return out, meta


def period_rows(filings):
    """Apply amendments: latest restatement replaces, new_holdings appends."""
    base = [f for f in filings if not f['amend']]
    restated = sorted([f for f in filings if f['amend'] == 'restatement'], key=lambda f: (f['filed'], f['accession']))
    added = [f for f in filings if f['amend'] == 'new_holdings']
    chosen = restated[-1] if restated else (base[-1] if base else None)
    if not chosen:
        return None, [], []
    used = [chosen] + added
    rows = []
    for f in used:
        if not f['table'] or not f['table'].exists():
            raise SystemExit(f"missing table {f['accession']}")
        rows.extend(read_table(f['table']))
    return chosen, used, rows


def build():
    stocks, by_cusip, _ = universe()
    filings, meta = collect_filings()
    parsed = {}
    for sid, periods in filings.items():
        parsed[sid] = {}
        for period, fs in periods.items():
            chosen, used, rows = period_rows(fs)
            if chosen:
                parsed[sid][period] = {'filing': chosen, 'used': used, 'rows': rows, 'cover': cover(chosen.get('cover'))}

    # consensus CUSIPs for index members missing an identifier (issuer-name agreement across >=3 filers)
    votes = collections.defaultdict(lambda: collections.defaultdict(set))
    for sid, periods in parsed.items():
        for period, p in periods.items():
            for r in p['rows']:
                if r['pc'] or r['type'] != 'SH' or not r['issuer']:
                    continue
                for t, pat in NAME_PATTERNS.items():
                    if t in stocks and re.search(pat, r['issuer'].upper()):
                        votes[t][r['cusip']].add(sid)
    consensus = {}
    for t, by in votes.items():
        ranked = sorted(by.items(), key=lambda kv: -len(kv[1]))
        total = sum(len(v) for v in by.values())
        if ranked and len(ranked[0][1]) >= 3 and len(ranked[0][1]) / total >= 0.8 and ranked[0][0] not in by_cusip:
            consensus[ranked[0][0]] = t
    cusip_map = dict(by_cusip, **consensus)

    # consensus implied price per CUSIP/period, used to detect thousand-dollar value units and to price changes
    implied = collections.defaultdict(list)
    for sid, periods in parsed.items():
        for period, p in periods.items():
            for r in p['rows']:
                if not r['pc'] and r['type'] == 'SH' and r['shares'] and r['value'] and r['cusip'] in cusip_map:
                    implied[(r['cusip'], period)].append(r['value'] / r['shares'])
    price = {k: statistics.median(v) for k, v in implied.items() if len(v) >= 3}

    subjects = {}
    for sid, periods in parsed.items():
        positions = {}
        info = {}
        for period, p in periods.items():
            ratios = [r['value'] / r['shares'] / price[(r['cusip'], period)] for r in p['rows']
                      if not r['pc'] and r['type'] == 'SH' and r['shares'] and r['value'] and (r['cusip'], period) in price]
            med = statistics.median(ratios) if ratios else 1
            scale = 1000 if 0.0005 < med < 0.002 else 1
            agg = collections.defaultdict(lambda: {'shares': 0, 'value': 0, 'lines': 0, 'cls': None, 'issuer': None})
            mapped = unmapped = 0
            for r in p['rows']:
                if r['type'] != 'SH':
                    continue
                t = cusip_map.get(r['cusip'])
                if not t:
                    unmapped += (r['value'] or 0) * scale
                    continue
                a = agg[(t, r['pc'])]
                a['shares'] += r['shares'] or 0
                a['value'] += (r['value'] or 0) * scale
                a['lines'] += 1
                a['cls'] = a['cls'] or r['cls']
                a['issuer'] = a['issuer'] or r['issuer']
                mapped += (r['value'] or 0) * scale
            for key, a in agg.items():
                positions.setdefault(key, {})[period] = a
            f = p['filing']
            info[period] = {'accession': f['accession'], 'form': f['form'], 'filed': f['filed'], 'url': f['url'], 'entity': f['entity'],
                            'cik': f['cik'], 'amendments': [u['accession'] for u in p['used'] if u is not f],
                            'rows': len(p['rows']), 'value_scale': scale, 'mapped_value': round(mapped), 'unmapped_value': round(unmapped),
                            'reportType': p['cover'].get('reportType'), 'confidentialOmitted': p['cover'].get('confidentialOmitted')}
        # comparable: same report type in both periods, no confidential omission, and no structural break in table size
        comparable = (Q2 in info and Q1 in info
                      and (info[Q2]['reportType'] or '') == (info[Q1]['reportType'] or '') != ''
                      and not any(info[q]['confidentialOmitted'] for q in (Q2, Q1))
                      and 0.5 <= info[Q1]['rows'] / max(1, info[Q2]['rows']) <= 2)
        rows = []
        for (t, pc), per in positions.items():
            a2, a1 = per.get(Q2), per.get(Q1)
            if Q2 not in info and a1 is None:
                continue
            chg = pct = None
            if comparable:
                if a2 and not a1:
                    chg = 'new'
                elif a1 and not a2:
                    chg = 'exit'
                elif a1 and a2 and a1['shares']:
                    pct = (a2['shares'] - a1['shares']) / a1['shares']
                    ratio = a2['shares'] / a1['shares']
                    value_ratio = (a2['value'] / a1['value']) if a1['value'] else None
                    split = any(abs(ratio - k) < 0.002 * k or abs(ratio - 1 / k) < 0.002 / k for k in (2, 3, 4, 5, 10, 20)) and value_ratio and 0.6 < value_ratio < 1.6
                    chg = 'split' if split else ('hold' if abs(pct) < 0.05 else ('add' if pct > 0 else 'trim'))
            if not comparable and not a2:
                continue    # without a comparable prior period only the latest snapshot is shown
            p2 = price.get((cusip_of(cusip_map, t), Q2))
            delta_value = None
            if chg in ('new', 'exit', 'add', 'trim') and p2:
                delta_value = round(((a2['shares'] if a2 else 0) - (a1['shares'] if a1 else 0)) * p2)
            rows.append({'t': t, 'pc': pc, 'sh2': a2 and a2['shares'], 'v2': a2 and round(a2['value']), 'sh1': a1 and a1['shares'],
                         'v1': a1 and round(a1['value']), 'lines': (a2 or a1)['lines'], 'cls': (a2 or a1)['cls'], 'issuer': (a2 or a1)['issuer'],
                         'chg': chg, 'pct': None if pct is None else round(pct, 4), 'dv': delta_value})
        rows.sort(key=lambda r: -((r['v2'] or 0) or (r['v1'] or 0)))
        m = meta.get(sid, {})
        subjects[sid] = {'id': sid, 'zh': m.get('zh'), 'en': m.get('en'), 'person': m.get('person'), 'group': m.get('group'),
                         'type': m.get('type'), 'cik': m.get('cik'), 'domain': m.get('domain'), 'periods': info,
                         'comparable': comparable, 'positions': rows}
    write_json(OUT / '13f.json', {'q2': Q2, 'q1': Q1, 'consensus_cusips': consensus, 'subjects': subjects}, compact=True)
    for sid, s in sorted(subjects.items()):
        c = collections.Counter(r['chg'] for r in s['positions'])
        scale = {q: v['value_scale'] for q, v in s['periods'].items()}
        print(f"{sid:24} {s['group'] or '?':16} pos {len(s['positions']):5} cmp {str(s['comparable'])[0]} {dict(c)} scale {scale}")
    print('consensus cusips', consensus)


def cusip_of(cusip_map, ticker):
    for c, t in cusip_map.items():
        if t == ticker:
            return c
    return None


if __name__ == '__main__':
    build()
