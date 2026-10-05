#!/usr/bin/env python3
"""Fetch exact public filing bytes using curated URLs and SHA-256; no scraping or LLM."""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOSTS = {'www.sec.gov', 'data.sec.gov', 'disclosures-clerk.house.gov'}


def validated_entry(entry):
    relative = Path(entry['path'])
    target = (ROOT / relative).resolve()
    if relative.is_absolute() or not target.is_relative_to(ROOT / 'research'):
        raise ValueError('source cache path must stay within research/')
    url = urllib.parse.urlsplit(entry['url'])
    if url.scheme != 'https' or url.hostname not in HOSTS or url.username or url.password:
        raise ValueError('only official HTTPS filing hosts are allowed')
    if not re.fullmatch(r'[0-9a-f]{64}', entry['sha256']):
        raise ValueError('invalid SHA-256')
    if not isinstance(entry['bytes'], int) or entry['bytes'] <= 0:
        raise ValueError('invalid expected byte size')
    return target


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(handle.read()).hexdigest()


def matches(path, entry):
    return path.is_file() and path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind', choices=['all', 'ptr', 'form4', '13f'], default='all')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'research/sources.json').read_text())
    files = [f for f in manifest['files'] if args.kind == 'all' or f['kind'] == args.kind]
    missing = []
    for entry in files:
        path = validated_entry(entry)
        if matches(path, entry):
            continue
        if path.exists():
            raise SystemExit(f'Hash/size mismatch; inspect the cached original before replacing: {entry["path"]}')
        missing.append((entry, path))
    if args.verify_only:
        if missing:
            for entry, _ in missing[:12]:
                print('missing:', entry['path'])
            raise SystemExit(f'{len(missing)}/{len(files)} source files missing. Fetch them before parsing.')
        print(f'Verified {len(files)} official source files by SHA-256 and size.')
        return
    if not missing:
        print(f'All {len(files)} cached source files verified.')
        return
    ua = os.environ.get('SEC_USER_AGENT', '').strip()
    if not ua:
        raise SystemExit('Set SEC_USER_AGENT to your project name and contact before fetching official reports.')
    for index, (entry, path) in enumerate(missing, 1):
        time.sleep(.5)
        request = urllib.request.Request(entry['url'], headers={'User-Agent': ua, 'Accept-Encoding': 'identity'})
        with urllib.request.urlopen(request, timeout=90) as response:
            if urllib.parse.urlsplit(response.url).hostname not in HOSTS:
                raise SystemExit('Unexpected source redirect; inspect it manually.')
            data = response.read()
        if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise SystemExit(f'Original bytes changed or access response returned; not saved: {entry["path"]}')
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + '.part')
        temporary.write_bytes(data)
        temporary.replace(path)
        print(f'{index}/{len(missing)} verified: {entry["path"]}')


if __name__ == '__main__':
    main()
