"""Shared helpers for the v2 deterministic pipeline (no network, no LLM)."""
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]          # pelosi-index/
RESEARCH = ROOT / 'research'
V2 = RESEARCH / 'v2'
SOURCES = V2 / 'sources'
OUT = V2 / 'out'
WEB_DATA = ROOT / 'web' / 'public' / 'data' / 'v2'


def load_json(path):
    return json.loads(Path(path).read_text())


def write_json(path, value, compact=False):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, ensure_ascii=False, separators=(',', ':')) if compact else json.dumps(value, ensure_ascii=False, indent=1)
    path.write_text(text + '\n')
    return path


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def strip_ns(root):
    for el in root.iter():
        if isinstance(el.tag, str) and '}' in el.tag:
            el.tag = el.tag.split('}', 1)[1]
    return root


def parse_xml(path):
    return strip_ns(ET.parse(path).getroot())


def text(el, path, default=None):
    found = el.find(path)
    if found is None or found.text is None:
        return default
    value = found.text.strip()
    return value if value else default


def num(value):
    if value is None:
        return None
    try:
        cleaned = re.sub(r'[,$\s]', '', str(value))
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def spy_weights():
    """Ticker -> SPY weight (%) from the archived official SSGA workbook."""
    book = zipfile.ZipFile(RESEARCH / 'universe' / 'spy-holdings.xlsx')
    shared = [''.join(t.itertext()) for t in strip_ns(ET.fromstring(book.read('xl/sharedStrings.xml'))).findall('si')]
    sheet = strip_ns(ET.fromstring(book.read('xl/worksheets/sheet1.xml')))
    rows = []
    for row in sheet.iter('row'):
        cells = {}
        for c in row.findall('c'):
            col = re.match(r'[A-Z]+', c.get('r')).group(0)
            v = c.find('v')
            if v is None:
                is_ = c.find('is')
                cells[col] = ''.join(is_.itertext()) if is_ is not None else None
                continue
            cells[col] = shared[int(v.text)] if c.get('t') == 's' else v.text
        rows.append(cells)
    header = next(i for i, r in enumerate(rows) if r.get('A') == 'Name' and r.get('B') == 'Ticker')
    cols = {v: k for k, v in rows[header].items()}
    weights = {}
    for r in rows[header + 1:]:
        ticker, weight = r.get(cols['Ticker']), r.get(cols['Weight'])
        if ticker and weight not in (None, '-'):
            try:
                weights[ticker.strip()] = float(weight)
            except ValueError:
                pass
    return weights


def universe():
    data = load_json(RESEARCH / 'stock-universe.json')
    stocks = {s['ticker']: s for s in data['stocks']}
    by_cusip = {}
    for s in data['stocks']:
        ident = (s.get('identifier') or '').upper()
        if re.fullmatch(r'[0-9A-Z]{9}', ident):
            by_cusip[ident] = s['ticker']
    return stocks, by_cusip, data


_SUFFIX = re.compile(r'\b(INC|CORP|CORPORATION|CO|COMPANY|LTD|PLC|HOLDINGS?|GROUP|CLASS [A-C]|CL [A-C]|N\.?V\.?|S\.?A\.?|LP|L\.P\.|THE|SHS|REIT|TRUST|ORD|COM|NEW|DEL)\b\.?', re.I)


def short_name(name):
    """'NVIDIA CORP' -> 'Nvidia'; keeps it short for graph labels."""
    if not name:
        return ''
    cleaned = _SUFFIX.sub('', name.replace(',', ' ').replace('+', ' ').replace('&', ' ')).strip(' .&+-')
    cleaned = re.sub(r'\s+', ' ', cleaned)
    words = cleaned.split(' ')[:3]
    out = []
    for w in words:
        out.append(w if (len(w) <= 3 and w.isupper() and not w.isalpha()) or len(w) <= 2 else w.capitalize())
    return ' '.join(out) or name
