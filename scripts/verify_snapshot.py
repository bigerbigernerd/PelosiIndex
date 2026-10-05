#!/usr/bin/env python3
"""Cross-check the public graph, complete holders, evidence shards and source manifest."""
import collections
import datetime
import json
import math
from pathlib import Path

from fetch_sources import validated_entry

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'web/public/data/v2'


def load(path):
    return json.loads(path.read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify():
    graph = load(PUBLIC / 'graph.json')
    holders = load(PUBLIC / 'holders.json')['tickers']
    atlas = load(PUBLIC / 'atlas.json')
    subjects, stocks = graph['S'], graph['T']
    ids = [s['id'] for s in subjects]
    require(len(ids) == len(set(ids)), 'duplicate subject IDs')
    require(len({t['t'] for t in stocks}) == len(stocks), 'duplicate hero tickers')
    require(len(graph['cats']) == 5, 'expected five disclosure categories')
    require(graph['stats']['subjects'] == len(subjects), 'subject count mismatch')
    require(graph['stats']['stocks'] == len(holders), 'full ticker count mismatch')
    require(graph['stats']['edges'] == sum(len(v['h']) for v in holders.values()), 'full relationship count mismatch')
    require(graph['stats']['heroEdges'] == len(graph['E']), 'hero edge count mismatch')
    counts = collections.Counter(s['c'] for s in subjects)
    require(graph['stats']['byCat'] == [counts[i] for i in range(5)], 'category totals mismatch')
    all_links = set()
    subject_degree = collections.Counter()
    for ticker, data in holders.items():
        require(bool(ticker), 'empty ticker')
        seen = set()
        for row in data['h']:
            si, ki = row[:2]
            require(isinstance(si, int) and 0 <= si < len(subjects), f'{ticker}: bad subject index')
            require(isinstance(ki, int) and 0 <= ki < len(graph['kinds']), f'{ticker}: bad kind index')
            require(si not in seen, f'{ticker}: duplicate holder')
            seen.add(si)
            all_links.add((si, ticker, ki))
            subject_degree[si] += 1
    for si, ti, ki, *_ in graph['E']:
        require(isinstance(ti, int) and 0 <= ti < len(stocks), 'bad hero ticker index')
        require((si, stocks[ti]['t'], ki) in all_links, 'hero relationship has no full-data evidence')
    ptr_rows = form4_tx = positions = 0
    for si, subject in enumerate(subjects):
        require(subject['nT'] == subject_degree[si], f'{subject["id"]}: relationship total mismatch')
        for coord in ('x', 'y'):
            require(isinstance(subject[coord], (int, float)) and math.isfinite(subject[coord]), 'invalid subject layout')
        require(-1 <= subject['img'] < atlas['count'], 'invalid subject image index')
        shard = load(PUBLIC / 's' / f'{subject["id"]}.json')
        require(shard['id'] == subject['id'] and shard['type'] == subject['k'], 'evidence shard identity mismatch')
        if shard['type'] == 'ptr':
            for filing in shard['filings']:
                require(filing['url'].startswith('https://disclosures-clerk.house.gov/'), 'PTR missing official source')
                require(filing['sha256'] and len(filing['sha256']) == 64, 'PTR source hash missing')
                if filing['pdf_kind'] != 'electronic_text':
                    require(not filing['rows'], 'scanned filing has unreviewed auto-extracted rows')
                for row in filing['rows']:
                    datetime.date.fromisoformat(row['transaction_date'])
                    require(row['owner'] in (None, 'SP', 'JT', 'DC'), 'unknown PTR owner code')
                    lo, hi = row['amount_min'], row['amount_max']
                    require(lo is None or lo >= 0, 'negative PTR interval')
                    require(lo is None or hi is None or hi >= lo, 'reversed PTR interval')
                    require(bool(row['amount_raw']), 'missing raw PTR interval')
                    ptr_rows += 1
        elif shard['type'] == 'form4':
            for filing in shard['filings']:
                require(filing['xml_url'].startswith('https://www.sec.gov/'), 'Form 4 missing official source')
                form4_tx += len(filing['tx'])
        elif shard['type'] == '13f':
            positions += len(shard['positions'])
            if shard['comparable']:
                require(len(shard['periods']) >= 2, '13F change without two periods')
    # The hero intentionally excludes stale directory-only 13F subjects, but source counters include them.
    normalized = ROOT / 'research/v2/out'
    expected_positions = sum(len(s['positions']) for s in load(normalized / '13f.json')['subjects'].values())
    require(graph['stats']['ptrRows'] == ptr_rows, 'PTR row count mismatch')
    require(graph['stats']['form4Tx'] == form4_tx, 'Form 4 transaction count mismatch')
    require(graph['stats']['f13Positions'] == expected_positions, '13F source position count mismatch')
    require(positions <= expected_positions, 'more graph positions than source positions')
    require((ROOT / 'web/public' / atlas['src'].lstrip('/')).is_file(), 'atlas image missing')
    for stock in stocks:
        require(stock['t'] in holders, 'hero ticker missing from complete holders')
        require(-1 <= stock['img'] < atlas['count'], 'invalid stock image index')
    source_files = load(ROOT / 'research/sources.json')['files']
    require(len({f['path'] for f in source_files}) == len(source_files), 'duplicate source cache paths')
    for entry in source_files:
        validated_entry(entry)
    print(f'Validated {len(subjects)} subjects, {len(holders)} securities, {len(all_links)} full relationships and {len(source_files)} source references.')


if __name__ == '__main__':
    verify()
