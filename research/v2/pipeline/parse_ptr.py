"""House PTR PDFs -> transactions. Independent re-extraction with pdftotext -layout; Original source PDFs are the only transaction evidence."""
import collections
import re
import subprocess
from common import SOURCES, OUT, load_json, sha256, write_json

TASK = SOURCES / 'house-ptr'
DATE = r'(\d{2}/\d{2}/\d{4})'
TYPE = r'(S \(partial\)|P|S|E)'
AMOUNT = r'(\$[\d,]+\.\d{2}|\$[\d,]+\s*-\s*\$?[\d,]*|\$[\d,]+\s*-|Spouse/DC Over(?: \$[\d,]+)?|Over \$[\d,]+|\$[\d,]+ \+)'
ROW = re.compile(r'^\s*(?:(SP|JT|DC)\s+)?(\S.*?)\s+' + TYPE + r'\s+' + DATE + r'\s+' + DATE + r'\s+' + AMOUNT + r'\s*(.*)$')
HEADER = re.compile(r'^\s*ID\s+Owner\s+Asset')
META = re.compile(r'^\s*(F\s+S\s*:|S\s+O\s*:|D\s*:|C\s*:|L\s*:|\* For the complete)')
TICKER = re.compile(r'\(([A-Z][A-Z0-9.\-]{0,6})\)')
ASSET_TYPE = re.compile(r'\[([A-Z]{2})\]')
TYPES = {'P': 'purchase', 'S': 'sale', 'S (partial)': 'partial_sale', 'E': 'exchange'}
OWNERS = {'SP': '配偶', 'JT': '共同', 'DC': '受抚养子女', None: '本人/未注明'}


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


def build():
    roster = load_json(TASK / 'roster.json')
    people, all_rows = [], 0
    for p in roster['people']:
        filings = []
        for f in p.get('files', []):
            pdf = TASK / f['local_path']
            if not pdf.exists():
                raise SystemExit(f"missing source {pdf}; run scripts/fetch_sources.py first")
            if f.get('sha256') and sha256(pdf) != f['sha256']:
                raise SystemExit(f'hash mismatch {pdf}')
            rows = extract(pdf) if f.get('pdf_kind') == 'electronic_text' else []
            for k, r in enumerate(rows, 1):
                r['id'] = f"house-{f['doc_id']}-{k}"
                r['lag_days'] = None
            filings.append({'doc_id': f['doc_id'], 'filed': f['filing_date'], 'url': f['url'], 'pdf_kind': f.get('pdf_kind'),
                            'pages': f.get('pages'), 'sha256': f.get('sha256'), 'rows': rows})
            all_rows += len(rows)
        people.append({'id': p['id'], 'zh': p.get('name_zh'), 'en': p['name_en'], 'party': p.get('party'), 'state': p.get('state'),
                       'district': p.get('district'), 'office': p.get('office'), 'bioguide': p.get('bioguide_id'),
                       'clerk_match': p.get('clerk_match'), 'ptr_count': p.get('ptr_count_after_2025_07_01'), 'filings': filings})
    write_json(OUT / 'ptr.json', {'source': 'House Clerk PTR PDFs (pdftotext -layout re-extraction)', 'people': people})
    print(f'ptr: {len(people)} people, {sum(len(p["filings"]) for p in people)} filings, {all_rows} rows')



if __name__ == '__main__':
    build()
