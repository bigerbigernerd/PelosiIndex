#!/usr/bin/env python3
"""Recent SEC Form 4 filings for one reporting owner (insider), parsed from the raw ownership XML.

  export SEC_USER_AGENT="Your Name you@example.com"
  python3 form4.py --name "huang jen"                 # EDGAR owner names are usually "LAST FIRST"
  python3 form4.py --cik 1197649 --since 2026-01-01 --max 20 --json huang.json
"""
import argparse
import collections
import json
import os
import sys
from xml.etree import ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgar import get, num, recent_filings, search_cik, strip_ns  # noqa: E402

CODES = {'P': 'open-market purchase', 'S': 'open-market sale', 'A': 'grant/award', 'M': 'option exercise/conversion',
         'C': 'conversion', 'F': 'tax withholding', 'G': 'gift', 'D': 'disposition to issuer', 'X': 'option exercise', 'J': 'other'}


def parse(xml):
    doc = strip_ns(ET.fromstring(xml))
    notes = {f.get('id'): ' '.join((f.text or '').split()) for f in doc.findall('footnotes/footnote')}
    out = {'issuer': doc.findtext('issuer/issuerName'), 'ticker': doc.findtext('issuer/issuerTradingSymbol'),
           'plan_10b5_1': (doc.findtext('aff10b5One') or '').strip().lower() in ('1', 'true'), 'tx': []}
    for table, path in (('non-derivative', 'nonDerivativeTable/nonDerivativeTransaction'), ('derivative', 'derivativeTable/derivativeTransaction')):
        for t in doc.findall(path):
            shares = num(t.findtext('transactionAmounts/transactionShares/value'))
            price = num(t.findtext('transactionAmounts/transactionPricePerShare/value'))
            out['tx'].append({'table': table, 'security': t.findtext('securityTitle/value'), 'date': t.findtext('transactionDate/value'),
                              'code': t.findtext('transactionCoding/transactionCode'), 'shares': shares, 'price': price,
                              'acq_disp': t.findtext('transactionAmounts/transactionAcquiredDisposedCode/value'),
                              'owned_after': num(t.findtext('postTransactionAmounts/sharesOwnedFollowingTransaction/value')),
                              'direct': t.findtext('ownershipNature/directOrIndirectOwnership/value'),
                              'nature': t.findtext('ownershipNature/natureOfOwnership/value'),
                              'value': shares * price if shares and price else None,
                              'footnotes': [notes[f.get('id')] for f in t.iter('footnoteId') if f.get('id') in notes][:3]})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cik')
    ap.add_argument('--name')
    ap.add_argument('--since', default='')
    ap.add_argument('--max', type=int, default=15)
    ap.add_argument('--json')
    a = ap.parse_args()
    cik = a.cik
    if not cik:
        if not a.name:
            ap.error('give --cik or --name')
        hits = search_cik(a.name, '4', owner='only')
        if len(hits) != 1:
            print('Multiple or no matches; rerun with --cik (check which one files for your company):', file=sys.stderr)
            for c, n in hits[:15]:
                print(f'  {c}  {n or ""}', file=sys.stderr)
            sys.exit(2)
        cik = hits[0][0]
    filings = [f for f in recent_filings(cik, {'4', '4/A'}) if f['filed'] >= a.since][:a.max]
    if not filings:
        sys.exit('no Form 4 in range')
    out, totals = [], collections.defaultdict(lambda: [0, 0.0])
    for f in filings:
        raw = f['primary'].split('/')[-1]              # strip the xsl rendering folder to get the raw XML
        url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{f['accession'].replace('-', '')}/{raw}"
        p = parse(get(url, binary=True))
        p.update({'accession': f['accession'], 'filed': f['filed'], 'form': f['form'], 'url': url,
                  'index': f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{f['accession'].replace('-', '')}/{f['accession']}-index.htm"})
        out.append(p)
        print(f"# {f['filed']} {f['form']} {p['issuer']} ({p['ticker']}){'  [10b5-1 plan box checked]' if p['plan_10b5_1'] else ''}  {p['index']}")
        for t in p['tx']:
            if t['table'] != 'non-derivative':
                continue
            if t['code'] in ('P', 'S'):
                totals[(p['ticker'], t['code'])][0] += t['shares'] or 0
                totals[(p['ticker'], t['code'])][1] += t['value'] or 0
            print(f"  {t['date']}  {t['code']} {CODES.get(t['code'], t['code']):26} {t['shares'] or 0:>14,.0f} @ {t['price'] or 0:>9,.2f}"
                  f"  after {t['owned_after'] or 0:>14,.0f} {'direct' if t['direct'] == 'D' else 'indirect: ' + (t['nature'] or '')}")
    print('\n## Open-market totals (code P / S only)')
    for (ticker, code), (sh, val) in sorted(totals.items()):
        print(f"  {ticker:6} {'BUY ' if code == 'P' else 'SELL'} {sh:>14,.0f} shares  ~${val / 1e6:,.1f}M")
    if a.json:
        json.dump({'cik': cik, 'filings': out}, open(a.json, 'w'), indent=1)


if __name__ == '__main__':
    main()
