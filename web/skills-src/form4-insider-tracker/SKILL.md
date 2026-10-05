---
name: form4-insider-tracker
description: Pull and parse recent SEC Form 4 insider filings for a corporate officer/director (e.g. Jensen Huang, Lisa Su, Satya Nadella) from raw EDGAR XML — transaction codes, shares, prices, holdings after, direct/indirect, and the 10b5-1 plan flag. Use when asked whether an insider bought or sold their company's stock.
---

# Form 4 insider tracker

## Run

```bash
export SEC_USER_AGENT="Your Name your@email.com"
python3 scripts/form4.py --name "huang jen"          # EDGAR owner names are usually "LAST FIRST"
python3 scripts/form4.py --cik 1197649 --since 2026-01-01 --max 20 --json huang.json
```

When several owners match, the script lists CIKs with mailing address and last filing date; choose the one at the company's address (e.g. "C/O ADVANCED MICRO DEVICES") and rerun with `--cik`. Python 3.8+ stdlib only.

## Codes

`P` open-market purchase · `S` open-market sale · `A` grant/award · `M`/`X` option exercise · `C` conversion · `F` shares withheld for tax · `G` gift · `D` disposition to issuer · `J` other.

## Reporting rules

- Only `P` and `S` are open-market trades. Do not call `A`, `M`, `F`, `G` buying or selling.
- The `aff10b5One` box means the filing reports at least one transaction under a pre-arranged Rule 10b5-1 plan; a planned sale is weak evidence of the insider's view. An unchecked box does not prove a discretionary trade.
- Distinguish direct (`D`) and indirect (`I` + nature, e.g. a trust) holdings; "owned after" is per line and ownership form, do not add across lines blindly.
- Weighted-average prices are common: the footnote states the price range.
- Option exercise followed by same-day sale should not be double counted.
- Cite the filing index links the script prints.
