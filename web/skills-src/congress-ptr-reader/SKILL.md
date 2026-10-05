---
name: congress-ptr-reader
description: Find and extract a US House member's Periodic Transaction Reports (stock trades) from the House Clerk's official annual index and PTR PDFs. Use when asked what a congressperson (e.g. Nancy Pelosi, Josh Gottheimer) bought or sold, or for their recent disclosed trades.
---

# House PTR reader

## Run

```bash
python3 scripts/ptr.py --last Pelosi --first Nancy --years 2025,2026 --max 6
python3 scripts/ptr.py --last Gottheimer --max 10 --csv gottheimer.csv --json gottheimer.json
```

Requires `pdftotext` (poppler-utils: `brew install poppler` / `apt install poppler-utils`). Files are cached in `~/.cache/ptr-reader`. Python 3.8+ stdlib only.

## How it works

- Downloads `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/<YEAR>FD.zip`, filters `FilingType = P` (PTR) by last/first name, newest first.
- Downloads each PDF from `public_disc/ptr-pdfs/<YEAR>/<DocID>.pdf` and parses `pdftotext -layout` text: owner, asset, ticker (only when printed in parentheses), asset type code (`[ST]` stock, `[OP]` option, `[GS]` government security…), type (P / S / S (partial) / E), transaction and notification dates, amount range, comments. Rows broken across pages are stitched.
- Scanned (image) PDFs are reported as `[SCANNED]` — read them manually; never guess their contents.

## Reporting rules

- Amounts are **ranges** (e.g. `$1,001 - $15,000`); never present a midpoint as the trade size.
- Owner codes: `SP` spouse, `JT` joint, `DC` dependent child, blank = filer/unspecified. A spouse trade is not proof the member placed it.
- Lag = notification/filing date minus transaction date; PTRs are due within 30 days of notification and 45 days of the trade.
- `[OP]` rows describe options; the asset text usually holds strike/expiry in the comment line.
- Use: 5 U.S.C. §13107 prohibits using these reports for commercial purposes (other than news/communications media), credit ratings or solicitation. Keep the output for research/journalism.
- Senate reports live at efdsearch.senate.gov behind a terms prompt and are not covered by this script.
