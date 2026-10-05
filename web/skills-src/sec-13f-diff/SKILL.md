---
name: sec-13f-diff
description: Compare an institutional manager's two most recent SEC 13F-HR filings (new positions, exits, adds, trims) straight from EDGAR raw XML. Use when asked what a fund/manager (e.g. Berkshire, Citadel, Bridgewater, ARK, Norges Bank) bought or sold last quarter, or to list its top 13F holdings.
---

# SEC 13F quarter-over-quarter diff

## Run

```bash
export SEC_USER_AGENT="Your Name your@email.com"   # SEC requires a contact; ask the user for one if unset
python3 scripts/f13_diff.py --name "berkshire hathaway"          # unique EDGAR name match
python3 scripts/f13_diff.py --cik 1423053 --top 25 --json out.json --csv out.csv
python3 scripts/f13_diff.py --cik 1067983 --period 2026-03-31    # compare an older pair
```

If `--name` prints several candidates, pick the CIK whose name matches the 13F filer (the management company, e.g. "CITADEL ADVISORS LLC", "DME Capital Management" for Greenlight) and rerun with `--cik`. Python 3.8+ stdlib only.

## What the script does

1. Lists the filer's 13F-HR and 13F-HR/A from `data.sec.gov/submissions`, takes the two latest report periods.
2. For each period: the original 13F-HR, replaced by the latest **restatement** amendment if any; **new holdings** amendments are appended.
3. Reads `primary_doc.xml` (report type, confidential omission) and the information table. Keeps `SH` rows; sums rows of the same CUSIP + put/call inside one filing (different discretion / other-manager lines).
4. Labels NEW / EXIT / ADD / TRIM (≥5% share change) / HOLD, flags exact-ratio share jumps with flat value as `SPLIT?`, and estimates trade value as share change × latest implied price.

## Reporting rules (keep these in the answer)

- 13F is a quarter-end snapshot of long US-listed equities/options; no shorts, cash, bonds or most foreign holdings. Never call it the manager's whole portfolio or say "bought on <filing date>".
- Changes compare **share counts** only; intraquarter trades are invisible. "No change" means no observed quarter-end change.
- If `comparable=False` (different report types such as a combination report vs holdings report, confidential omissions, missing prior period, or a table-size break) do not state new/exit conclusions.
- Options rows (`putCall`) are notional underlying shares, not option market value.
- Fund holdings are not the personal trades of the named manager.
- Cite the two information-table URLs the script prints.
