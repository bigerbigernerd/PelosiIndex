"""Form 4 ownership XML -> normalized insider transactions (deterministic, from raw files only)."""
from pathlib import Path
import subprocess
import sys
from common import SOURCES, OUT, ROOT, V2, load_json, parse_xml, text, num, sha256, write_json

TASK = SOURCES / 'insiders'
CODES = {
    'P': '公开市场买入', 'S': '公开市场卖出', 'A': '授予/奖励', 'M': '期权行权/转换', 'C': '证券转换',
    'F': '缴税扣股', 'G': '赠与', 'D': '处置给发行人', 'J': '其他', 'X': '行使期权', 'W': '继承', 'I': '自主交易',
}


def bool_text(el, path):
    value = (text(el, path) or '').lower()
    return value in ('1', 'true')


def parse_file(path):
    doc = parse_xml(path)
    issuer = {'cik': text(doc, 'issuer/issuerCik'), 'name': text(doc, 'issuer/issuerName'),
              'ticker': (text(doc, 'issuer/issuerTradingSymbol') or '').upper().replace('-', '.')}
    owners = [{'cik': text(o, 'reportingOwnerId/rptOwnerCik'), 'name': text(o, 'reportingOwnerId/rptOwnerName'),
               'title': text(o, 'reportingOwnerRelationship/officerTitle')} for o in doc.findall('reportingOwner')]
    footnotes = {f.get('id'): ' '.join((f.text or '').split()) for f in doc.findall('footnotes/footnote')}
    tx = []
    for kind, table in (('nd', 'nonDerivativeTable/nonDerivativeTransaction'), ('d', 'derivativeTable/derivativeTransaction')):
        for i, t in enumerate(doc.findall(table)):
            code = text(t, 'transactionCoding/transactionCode')
            shares = num(text(t, 'transactionAmounts/transactionShares/value'))
            price = num(text(t, 'transactionAmounts/transactionPricePerShare/value'))
            notes = list(dict.fromkeys(footnotes.get(f.get('id')) for f in t.iter('footnoteId') if footnotes.get(f.get('id'))))
            tx.append({
                'table': kind, 'row': i + 1,
                'security': text(t, 'securityTitle/value'),
                'date': text(t, 'transactionDate/value'),
                'code': code, 'code_zh': CODES.get(code, code),
                'shares': shares, 'price': price,
                'ad': text(t, 'transactionAmounts/transactionAcquiredDisposedCode/value'),
                'after': num(text(t, 'postTransactionAmounts/sharesOwnedFollowingTransaction/value')),
                'direct': text(t, 'ownershipNature/directOrIndirectOwnership/value'),
                'nature': text(t, 'ownershipNature/natureOfOwnership/value'),
                'value': round(shares * price, 2) if shares is not None and price else None,
                'footnotes': notes,
            })
    holdings = []
    for kind, table in (('nd', 'nonDerivativeTable/nonDerivativeHolding'), ('d', 'derivativeTable/derivativeHolding')):
        for h in doc.findall(table):
            holdings.append({'table': kind, 'security': text(h, 'securityTitle/value'),
                             'after': num(text(h, 'postTransactionAmounts/sharesOwnedFollowingTransaction/value')),
                             'direct': text(h, 'ownershipNature/directOrIndirectOwnership/value'),
                             'nature': text(h, 'ownershipNature/natureOfOwnership/value'),
                             'footnotes': list(dict.fromkeys(footnotes[f.get('id')] for f in h.iter('footnoteId') if f.get('id') in footnotes))})
    return {'issuer': issuer, 'owners': owners, 'aff10b5One': bool_text(doc, 'aff10b5One'),
            'period': text(doc, 'periodOfReport'), 'doc_type': text(doc, 'documentType'),
            'tx': tx, 'holdings': holdings, 'footnotes': footnotes}


def build():
    roster = load_json(TASK / 'roster.json')
    # owners with no Form 4 since 2026-04-01 get a wider window (2025-07-01+) fetched separately
    extra = {x['id']: x['filings'] for x in load_json(TASK.parent.parent / 'sec-form4-extra' / 'manifest.json')['people']}
    roster_people = []
    for p in roster['people']:
        roster_people.append(dict(p, filings=[dict(f, _source_root=str(TASK)) for f in p.get('filings') or extra.get(p['id'], [])]))
    additions_path = V2 / 'sources/form4-additions.json'
    if additions_path.exists():
        checker = ROOT / 'web/skills-src/pelosi-data-contributor/scripts/validate_form4.py'
        subprocess.run([sys.executable, str(checker), str(additions_path), '--source-root', str(V2)], check=True)
        existing = {p['id']: p for p in roster_people}
        for added in load_json(additions_path)['people']:
            added = dict(added, filings=[dict(f, _source_root=str(V2)) for f in added['filings']])
            if added['id'] not in existing:
                roster_people.append(added)
                existing[added['id']] = added
                continue
            p = existing[added['id']]
            if int(p['owner_cik']) != int(added['owner_cik']):
                raise ValueError('Subject identity changed: ' + p['id'])
            by_accession = {f['accession']: f for f in p['filings']}
            for f in added['filings']:
                old = by_accession.get(f['accession'])
                if old and old['sha256'] != f['sha256']:
                    raise ValueError('Conflicting original filing: ' + f['accession'])
                by_accession.setdefault(f['accession'], f)
            p.update({k: v for k, v in added.items() if k != 'filings'})
            p['filings'] = list(by_accession.values())
    people = []
    for p in roster_people:
        filings = []
        for f in p['filings']:
            local = Path(f['_source_root']) / f['local_path'] if f.get('local_path') else None
            if not local or not local.exists():
                raise SystemExit(f'missing source {local}; run scripts/fetch_sources.py first')
            if f.get('sha256') and sha256(local) != f['sha256']:
                raise SystemExit(f'hash mismatch {local}')
            parsed = parse_file(local)
            if int(p['owner_cik']) not in [int(o['cik']) for o in parsed['owners'] if o['cik']]:
                raise ValueError('Reporting owner does not match original XML: ' + p['id'])
            acc = f['accession']
            cik = str(int(p['owner_cik']))
            filings.append({
                'accession': acc, 'form': f.get('form'), 'filed': f.get('filingDate'), 'period': parsed['period'],
                'xml_url': f.get('xml_url'),
                'index_url': f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{acc}-index.htm",
                'issuer': parsed['issuer'], 'aff10b5One': parsed['aff10b5One'],
                'co_owners': [o for o in parsed['owners'] if int(o['cik']) != int(p['owner_cik'])],
                'tx': parsed['tx'], 'holdings': parsed['holdings'], 'footnotes': parsed['footnotes'], 'sha256': sha256(local),
            })
        filings.sort(key=lambda f: (f['filed'] or '', f['accession']), reverse=True)
        people.append({'id': p['id'], 'zh': p['name_zh'], 'en': p['name_en'], 'title': p.get('title'), 'ticker': p.get('ticker'),
                       'cik': p['owner_cik'], 'edgar_name': p.get('edgar_name'), 'filings': filings,
                       **{k: p[k] for k in ('category', 'role_zh', 'role_en', 'coverage_note_zh', 'coverage_note_en') if p.get(k)}})
    out = {'source': 'SEC Form 4 ownership XML (raw archives)', 'people': people}
    write_json(OUT / 'form4.json', out)
    tx = sum(len(f['tx']) for p in people for f in p['filings'])
    print(f'form4: {len(people)} people, {sum(len(p["filings"]) for p in people)} filings, {tx} transactions')


if __name__ == '__main__':
    build()
