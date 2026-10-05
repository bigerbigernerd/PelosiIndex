"""Offline evidence validation; no network calls and no generated financial relationships."""
import argparse, hashlib, json, re
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET


def validate(document, source_root, existing=None):
    root = Path(source_root).resolve()
    if document.get('schema') != 'pelosi-form4-contributions-v1' or not document.get('people'):
        raise ValueError('Expected a nonempty Form 4 contribution manifest')
    subjects, checked = set(), []
    known = {p['id']: p for p in (existing or {}).get('people', [])}
    for p in document['people']:
        sid = p['id']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', sid) or sid in subjects:
            raise ValueError('Invalid/duplicate subject ID')
        subjects.add(sid)
        prior = known.get(sid)
        if prior and int(prior['cik']) != int(p['owner_cik']):
            raise ValueError('Existing subject has another reporting-owner CIK')
        prior_filings = {f['accession']: f for f in (prior or {}).get('filings', [])}
        if p['category'] not in ('pol', 'ins', 'star', 'quant', 'sov') or not p['name_en'] or not p['name_zh']:
            raise ValueError('Missing category/name')
        if not re.fullmatch(r'\d{1,10}', p['owner_cik']):
            raise ValueError('Invalid reporting-owner CIK')
        filings = set()
        for f in p['filings']:
            acc = f['accession']
            if not re.fullmatch(r'\d{10}-\d{2}-\d{6}', acc) or acc in filings:
                raise ValueError('Invalid/duplicate accession')
            filings.add(acc)
            url = urlparse(f['xml_url'])
            if url.scheme != 'https' or url.hostname != 'www.sec.gov' or url.username or url.query or url.fragment:
                raise ValueError('Original SEC HTTPS XML URL required')
            if not url.path.startswith('/Archives/edgar/data/') or ('/' + acc.replace('-', '') + '/') not in url.path:
                raise ValueError('URL/accession mismatch')
            path = root / f['local_path']
            if Path(f['local_path']).is_absolute() or not path.resolve().is_relative_to(root):
                raise ValueError('Raw file escapes source root')
            raw = path.read_bytes()
            if len(raw) != f['bytes'] or hashlib.sha256(raw).hexdigest() != f['sha256']:
                raise ValueError('Original file size/hash mismatch')
            old = prior_filings.get(acc)
            if old and old['sha256'] != f['sha256']:
                raise ValueError('Existing accession has different original bytes')
            xml = ET.fromstring(raw)
            for el in xml.iter():
                if isinstance(el.tag, str):
                    el.tag = el.tag.split('}')[-1]
            def text(xpath):
                return (xml.findtext(xpath) or '').strip()
            if xml.tag != 'ownershipDocument' or text('documentType') not in ('4', '4/A') or text('documentType') != f['form']:
                raise ValueError('XML is not the declared Form 4')
            owners = [o.findtext('reportingOwnerId/rptOwnerCik') for o in xml.findall('reportingOwner')]
            if int(p['owner_cik']) not in [int(x) for x in owners if x and x.isdigit()]:
                raise ValueError('Reporting-owner CIK mismatch')
            if text('issuer/issuerTradingSymbol').upper().replace('-', '.') != p['ticker'].upper().replace('-', '.'):
                raise ValueError('Issuer ticker mismatch')
            if text('periodOfReport') != f['reportDate']:
                raise ValueError('Report date mismatch')
            filed, report = date.fromisoformat(f['filingDate']), date.fromisoformat(f['reportDate'])
            if report > filed:
                raise ValueError('Report date after filing date')
            checked.append({'id': sid, 'accession': acc, 'owner_cik': p['owner_cik'], 'ticker': p['ticker'],
                            'status': 'already_present' if old else 'new' if existing is not None else 'original_validated',
                            'transactions': len(xml.findall('nonDerivativeTable/nonDerivativeTransaction')) + len(xml.findall('derivativeTable/derivativeTransaction')),
                            'holdings': len(xml.findall('nonDerivativeTable/nonDerivativeHolding')) + len(xml.findall('derivativeTable/derivativeHolding'))})
        if not filings:
            raise ValueError('No original filings for ' + sid)
    return checked


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--source-root', type=Path, required=True)
    parser.add_argument('--existing-form4', type=Path, help='Optional normalized form4.json to detect already-present filings and conflicts')
    args = parser.parse_args()
    try:
        existing = json.loads(args.existing_form4.read_text()) if args.existing_form4 else None
        print(json.dumps({'ok': True, 'filings': validate(json.loads(args.manifest.read_text()), args.source_root, existing)}, indent=2))
    except (ValueError, KeyError, OSError, ET.ParseError) as e:
        parser.exit(1, 'Evidence rejected: ' + str(e) + '\n')
