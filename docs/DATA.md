# Data provenance, rebuilding and review

## Included snapshot

The public snapshot was curated on **2026-10-05**. 13F positions compare 2026-06-30 with 2026-03-31. PTR and Form 4 data cover the fetched reports recorded in the rosters; this is a selected historical dataset, not all filings or live market activity. The graph's `generated` date is a build date; source dates in `asOf`, filings and transactions remain the evidence dates.

The three committed normalized files in `research/v2/out/` are reproducible parser outputs. The repository excludes AI collection sessions and candidate analysis. Display names in `sources/names/output.json` are curated labels, not financial evidence.

## Rebuild the graph offline

```sh
npm ci
npm run data
npm test
npm run build
```

## Rebuild from original filings

Python's standard library is sufficient for fetching and XML parsing. House PTR text extraction also requires Poppler's `pdftotext` to be installed separately.

```sh
export SEC_USER_AGENT="Your project name your-contact@example.org"
python3 scripts/fetch_sources.py --kind all
npm run data:parse
npm run data
npm test
```

`research/sources.json` records 566 exact official report files (about 157 MiB), each with URL, SHA-256, byte size, kind and repository-relative cache path. The fetcher is sequential, waits between requests, validates hosts and paths, rejects hash mismatches, and never overwrites a mismatched cache silently. It does not bypass access restrictions. A source may stop serving the archived bytes; obtain the original document through the source's normal access process and verify its hash before rebuilding.

You can fetch a subset with `--kind ptr`, `--kind form4` or `--kind 13f`, or inspect missing files with `--verify-only`. The raw cache is ignored by Git. Parsing all three sources requires the complete cache.

## Source rules

### House PTR

Preserve raw Owner codes (SP/JT/DC), transaction and notification dates, filing dates, interval amounts, asset types and comments. Stocks, options and non-stock assets are distinct. Scanned filings remain linked without automatic transaction extraction. The graph currently links ST/OP rows with confirmed tickers; that relationship describes a reported trade, not an inferred current holding.

Official access: <https://disclosures-clerk.house.gov/>. Respect the restrictions printed on financial disclosure records, including limits on commercial solicitation and credit-rating use.

### SEC Form 4

Only P/S represent public-market buy/sell activity. Grants, exercises, tax withholding and gifts have different codes and must retain those meanings. Keep derivative/non-derivative tables, direct/indirect ownership, footnotes and the 10b5-1 flag.

### SEC 13F

Compare share counts only when reporting periods, report types and disclosure scopes are comparable. Preserve restatements and new-holdings amendments. Combination reports, confidential omissions, missing periods or structural breaks disable change inference. Multiple managers within a single filing may be summed at the reporting-entity level; unrelated filers are never merged. The parsed coverage is limited to the maintained S&P 500 / Nasdaq-100 universe; S&P coverage uses the documented SPY-holdings proxy.

SEC access: <https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data>. Set a descriptive `SEC_USER_AGENT`; do not exceed source access limits.

## Public schema

- `graph.json`: `S` subjects, `T` hero securities, `E` hero edges, `cats`, `kinds`, `asOf`, `stats`, feed and layout positions. An edge is `[subjectIndex, tickerIndex, kindIndex, displayValue]`.
- `holders.json`: `tickers[ticker].h` contains full relationships `[subjectIndex, kindIndex, valueOrInterval, delta]`.
- `s/<id>.json`: source-specific evidence for one subject (`ptr`, `form4`, `13f`).
- `atlas.json` and `credits.json`: image positions and third-party attribution.

Hero edges are a selected display subset. Category membership never creates a holding edge. Source values have different meanings across forms and cannot be added into an invented total.

## New data sources

Trump is currently included from two historical SEC Form 4 filings (2024), not OGE. Gifts to a revocable trust and earnout transactions retain their original codes and ownership notes. OGE 278e / 278-T and Senate disclosures are not currently implemented. New adapters require distinct IDs, source manifests, tested parsers, source-specific UI labels and asset typing. In particular, a bond issued by a listed company is not a holding in that company's stock. Annual assets are snapshots and must remain separate from periodic transactions. Discuss an adapter in an Issue before changing the public schema.

## Immutable revisions

Current clients pin `graph`, `holders`, shards and the atlas to one `data/revisions/<hash>/` dataset. `data/version.json` identifies that dataset. Public `data/v2/` remains the 2026-10-04 compatibility snapshot after production builds; the build input under `web/public/data/v2/` is the current snapshot. Older atlases remain available for older revisions.
