"""Minimal SEC EDGAR client (stdlib only). Declares a User-Agent and stays under SEC's fair-access rate."""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from xml.etree import ElementTree as ET

_last = [0.0]


def user_agent():
    ua = os.environ.get('SEC_USER_AGENT', '').strip()
    if not ua:
        sys.exit('SEC requires a descriptive User-Agent with contact info. Set it first, e.g.\n'
                 '  export SEC_USER_AGENT="YourName your@email.com"')
    return ua


def get(url, binary=False):
    wait = 0.15 - (time.time() - _last[0])            # <= ~7 requests/second
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={'User-Agent': user_agent(), 'Accept-Encoding': 'identity'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                _last[0] = time.time()
                data = r.read()
                return data if binary else data.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 3:
                time.sleep(2 ** attempt * 2)
                continue
            raise


def get_json(url):
    return json.loads(get(url))


def submissions(cik):
    return get_json(f'https://data.sec.gov/submissions/CIK{int(cik):010d}.json')


def recent_filings(cik, forms):
    """Yield dicts for filings of the given form types, newest first (recent block + older pages)."""
    sub = submissions(cik)
    blocks = [sub['filings']['recent']] + [get_json('https://data.sec.gov/submissions/' + f['name']) for f in sub['filings'].get('files', [])[:2]]
    for b in blocks:
        for i, form in enumerate(b['form']):
            if form in forms:
                yield {'form': form, 'accession': b['accessionNumber'][i], 'filed': b['filingDate'][i],
                       'period': b.get('reportDate', [''] * len(b['form']))[i], 'primary': b['primaryDocument'][i]}


def filing_files(cik, accession):
    base = f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession.replace("-", "")}/'
    items = get_json(base + 'index.json')['directory']['item']
    return base, [i['name'] for i in items]


def search_cik(name, form_type='', owner='include'):
    """EDGAR company/owner name search -> list of (cik, hint), most recently active first.
    EDGAR's multi-match feed omits names, so the hint is the mailing address and last filing date."""
    q = urllib.parse.urlencode({'action': 'getcompany', 'company': name, 'type': form_type, 'dateb': '', 'owner': owner, 'count': 40, 'output': 'atom'})
    root = strip_ns(ET.fromstring(get('https://www.sec.gov/cgi-bin/browse-edgar?' + q).encode('latin-1', 'replace')))
    out = []
    for info in root.iter('company-info'):
        cik = info.findtext('cik')
        if not cik:
            continue
        addr = info.find("addresses/address[@type='mailing']")
        where = ' '.join(filter(None, [(addr.findtext(k) or '').strip() for k in ('street1', 'street2', 'city', 'state')])) if addr is not None else ''
        name_ = (info.findtext('conformed-name') or '').strip()
        last = info.findtext('last-date') or ''
        out.append((cik.strip(), ' | '.join(filter(None, [name_, where, f'last filing {last}' if last else '']))))
    out.sort(key=lambda x: x[1].rsplit('last filing ', 1)[-1] if 'last filing' in x[1] else '', reverse=True)
    return out


def strip_ns(root):
    for el in root.iter():
        if isinstance(el.tag, str) and '}' in el.tag:
            el.tag = el.tag.split('}', 1)[1]
    return root


def num(v):
    try:
        return float(re.sub(r'[,$\s]', '', v)) if v not in (None, '') else None
    except ValueError:
        return None
