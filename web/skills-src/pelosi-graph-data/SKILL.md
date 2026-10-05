---
name: pelosi-graph-data
description: Query the public 佩洛西指数 (pelosi.pocketplay.win) disclosure graph — US House members' PTR trades, corporate insiders' Form 4, and 13F holdings/changes of superinvestors, hedge/quant funds and sovereign/pension/endowment investors — as JSON. Use to answer "who holds/trades ticker X", "which tickers are shared across politicians, insiders and funds", or to pull one subject's disclosures.
---

# 佩洛西指数 graph data

Use `/data/version.json` to discover the current immutable dataset. The bundled script pins its graph, holders and shards to that revision. `/data/v2/` is the compatible 2026-10-04 snapshot for older clients; do not combine its integer indexes with a newer revision or treat it as the current profile catalog. Source filing dates, not snapshot/build dates, determine evidence recency.

```bash
python3 scripts/query.py subjects --cat pol          # pol | ins | star | quant | sov
python3 scripts/query.py subject berkshire           # id or name fragment (中文/English)
python3 scripts/query.py ticker NVDA
python3 scripts/query.py overlap --min-cats 3
python3 scripts/query.py feed --n 40
```

Set `PELOSI_BASE` to use a local copy. Python 3.8+ stdlib only.

## Files (`https://pelosi.pocketplay.win/data/v2/`)

- `graph.json` — `cats` (5 categories), `kinds` (`hold add trim new exit buy sell mixed other`), `S` subjects `{id, c, n, zh, en, r, k: 13f|ptr|form4}`, `T` hero tickers `{t, n, w: SPY weight %, ndx, spx}`, `E` hero edges `[subject, ticker, kind, value]` (top holdings/moves only), `feed` `[date, subject, tickerIdx, ticker, kind, value|range, source, mergedCount]`, `stats`, `asOf`.
- `holders.json` — `tickers[T] = {n, h: [[subject, kind, value, deltaValue]...]}` for **every** link (not only the hero subset).
- `s/<subject id>.json` — full shard: `13f` (periods with accession/URL, `positions` with `sh2/v2` (2026-06-30) and `sh1/v1` (2026-03-31), `chg`, `pct`, `dv`), `ptr` (House PTR filings and parsed rows with amount ranges and owner codes), or `form4` (raw-parsed transactions with codes, prices, 10b5-1 flag).

## Rules when answering

- 13F values: quarter-end snapshot, summed across manager lines inside one filing, limited to S&P 500 / Nasdaq-100 securities; changes are share-count based (`comparable=false` → no change labels).
- PTR values are ranges with owner codes (SP spouse, JT joint, DC child). Form 4 `P`/`S` only are open-market trades.
- The three sources have different timing and meaning; never add them together or call a 13F change a dated trade. Always cite the source URLs in the shard.
