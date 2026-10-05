#!/usr/bin/env python3
"""House Periodic Transaction Reports (PTR) for one member, from the Clerk's official index + PDFs.

  python3 ptr.py --last Pelosi --first Nancy --years 2025,2026 --max 6 --json pelosi.json
Needs `pdftotext` (poppler-utils). Scanned (image) PDFs are listed but not OCR'd.
"""
import argparse
import csv
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import zipfile
from xml.etree import ElementTree as ET

UA = os.environ.get('PTR_USER_AGENT', 'ptr-reader/1.0 (personal research)')
CACHE = os.path.expanduser('~/.cache/ptr-reader')
TYPES = {'P': 'purchase', 'S': 'sale', 'S (partial)': 'partial_sale', 'E': 'exchange'}


def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=90) as r, open(path, 'wb') as fh:
            fh.write(r.read())
        time.sleep(0.5)
    return path


def index(year):
    z = zipfile.ZipFile(fetch(f'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}FD.zip', f'{CACHE}/{year}FD.zip'))
    root = ET.fromstring(z.read(f'{year}FD.xml'))
    for m in root.iter('Member'):
        yield {k: (m.findtext(k) or '').strip() for k in ('Prefix', 'Last', 'First', 'Suffix', 'FilingType', 'StateDst', 'Year', 'FilingDate', 'DocID')}


DATE = r'(\d{2}/\d{2}/\d{4})'
TYPE = r'(S \(partial\)|P|S|E)'
AMOUNT = r'(\$[\d,]+\.\d{2}|\$[\d,]+\s*-\s*\$?[\d,]*|\$[\d,]+\s*-|Spouse/DC Over(?: \$[\d,]+)?|Over \$[\d,]+|\$[\d,]+ \+)'
ROW = re.compile(r'^\s*(?:(SP|JT|DC)\s+)?(\S.*?)\s+' + TYPE + r'\s+' + DATE + r'\s+' + DATE + r'\s+' + AMOUNT + r'\s*(.*)$')
HEADER = re.compile(r'^\s*ID\s+Owner\s+Asset')
META = re.compile(r'^\s*(F\s+S\s*:|S\s+O\s*:|D\s*:|C\s*:|L\s*:|\* For the complete)')
TICKER = re.compile(r'\(([A-Z][A-Z0-9.\-]{0,6})\)')
ASSET_TYPE = re.compile(r'\[([A-Z]{2})\]')
OWNERS = {'SP': 'spouse', 'JT': 'joint', 'DC': 'dependent child', None: 'self/unspecified'}


def iso(us):
    m, d, y = us.split('/')
    return f'{y}-{m}-{d}'


def amount_bounds(raw):
    exact = re.fullmatch(r'\$([\d,]+\.\d{2})', raw.strip())
    if exact:
        value = float(exact.group(1).replace(',', ''))
        return value, value
    nums = [int(n.replace(',', '')) for n in re.findall(r'\$([\d,]+)', raw)]
    if raw.startswith('Over') or 'Over' in raw:
        return nums[0] if nums else None, None
    if len(nums) >= 2:
        return nums[0], nums[1]
    return (nums[0], None) if nums else (None, None)


def extract(pdf):
    pages = subprocess.run(['pdftotext', '-layout', str(pdf), '-'], capture_output=True, text=True, check=True).stdout.split('\f')
    # stitch pages so rows broken across a page boundary stay whole; drop repeated table headers
    lines, page_of = [], []
    for page_no, page in enumerate(pages, 1):
        skip = 0
        # trailing blank lines at a page end would cut a row that continues on the next page
        for line in page.rstrip('\n ').split('\n'):
            if HEADER.match(line):
                skip = 2
                continue
            if skip and (re.match(r'^\s*(Type|\$200\?)', line) or re.search(r'Gains >|\$200\?\s*$', line)):
                skip -= 1
                continue
            skip = 0
            if re.match(r'^\s*Filing ID #', line):
                continue
            lines.append(line)
            page_of.append(page_no)
    rows = []
    i = 0
    if True:
        while i < len(lines):
            m = ROW.match(lines[i])
            if not m:
                i += 1
                continue
            owner, asset, typ, tdate, ndate, amount, tail = m.groups()
            j = i + 1
            # amount may wrap ("$1,000,001 -" / "$5,000,000"); asset name may wrap over the next lines
            extra = []
            while j < len(lines) and lines[j].strip() and not META.match(lines[j]) and not ROW.match(lines[j]):
                extra.append(lines[j].strip())
                j += 1
            if amount.rstrip().endswith('-') or amount.rstrip().endswith('Over'):
                for k, e in enumerate(extra):
                    n = re.match(r'^(\$[\d,]+)\s*(.*)$', e.split('  ')[-1].strip())
                    if n:
                        amount = amount.rstrip() + ' ' + n.group(1)
                        extra[k] = e.replace(n.group(1), '').strip()
                        break
            full_asset = ' '.join([asset] + [e for e in extra if e]).strip()
            comment = []
            while j < len(lines) and META.match(lines[j]):
                comment.append(re.sub(r'\s+', ' ', lines[j].strip()))
                j += 1
            tick = TICKER.findall(full_asset)
            atype = ASSET_TYPE.findall(full_asset)
            lo, hi = amount_bounds(amount)
            rows.append({
                'page': page_of[i], 'owner': owner, 'asset': re.sub(r'\s+', ' ', full_asset), 'ticker': tick[-1] if tick else None,
                'asset_type': atype[-1] if atype else None, 'type_raw': typ, 'kind': TYPES[typ],
                'transaction_date': iso(tdate), 'notification_date': iso(ndate),
                'amount_raw': re.sub(r'\s+', ' ', amount.strip()), 'amount_min': lo, 'amount_max': hi,
                'cap_gains_over_200': (tail.strip() or None), 'comment': ' | '.join(comment) or None,
            })
            i = j
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--last', required=True, help='member last name as in the Clerk index, e.g. Pelosi')
    ap.add_argument('--first', help='first name filter')
    ap.add_argument('--years', default='2025,2026')
    ap.add_argument('--max', type=int, default=6, help='most recent N PTRs')
    ap.add_argument('--json')
    ap.add_argument('--csv')
    a = ap.parse_args()
    filings = []
    for y in a.years.split(','):
        for m in index(y.strip()):
            if m['FilingType'] == 'P' and m['Last'].lower() == a.last.lower() and (not a.first or m['First'].lower().startswith(a.first.lower())):
                mo, dd, yy = (int(x) for x in m['FilingDate'].split('/'))
                m['FilingDateISO'] = f'{yy:04d}-{mo:02d}-{dd:02d}'
                filings.append(m)
    filings.sort(key=lambda m: m['FilingDateISO'], reverse=True)
    if not filings:
        sys.exit('no PTR found; check the spelling of --last (and --first) and --years')
    out = []
    for m in filings[:a.max]:
        url = f"https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{m['Year']}/{m['DocID']}.pdf"
        pdf = fetch(url, f"{CACHE}/ptr/{m['Year']}/{m['DocID']}.pdf")
        rows = extract(pdf)
        scanned = not rows and len(subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout.strip()) < 50
        out.append({'doc_id': m['DocID'], 'member': f"{m['First']} {m['Last']}", 'district': m['StateDst'], 'filed': m['FilingDateISO'],
                    'url': url, 'scanned': scanned, 'rows': rows})
        print(f"# {m['First']} {m['Last']} {m['StateDst']}  PTR {m['DocID']}  filed {m['FilingDateISO']}  {url}" + ('  [SCANNED - read manually]' if scanned else ''))
        for r in rows:
            print(f"  {r['transaction_date']}  {r['type_raw']:12} {(r['ticker'] or '-'):6} {r['amount_raw']:28} {OWNERS.get(r['owner'], r['owner']):16} {r['asset'][:60]}")
    if a.json:
        json.dump(out, open(a.json, 'w'), indent=1)
    if a.csv:
        with open(a.csv, 'w', newline='') as fh:
            w = csv.writer(fh)
            w.writerow(['doc_id', 'filed', 'transaction_date', 'notification_date', 'type', 'ticker', 'asset_type', 'asset', 'amount', 'amount_min', 'amount_max', 'owner', 'url'])
            for f in out:
                for r in f['rows']:
                    w.writerow([f['doc_id'], f['filed'], r['transaction_date'], r['notification_date'], r['type_raw'], r['ticker'], r['asset_type'], r['asset'], r['amount_raw'], r['amount_min'], r['amount_max'], r['owner'], f['url']])


if __name__ == '__main__':
    main()
