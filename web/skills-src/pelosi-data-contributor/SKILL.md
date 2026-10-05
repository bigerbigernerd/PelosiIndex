---
name: pelosi-data-contributor
description: Add or correct source-backed people and financial disclosures in a Pelosi Index checkout, or prepare a reviewable data contribution. Use for new profiles, original-filing collection, identity verification, parser integration and evidence review; not investment advice or direct production editing.
---

# Contribute public disclosure data

Work in the [Pelosi Index repository](https://github.com/xiehuanyi/pelosi-index), or produce an evidence bundle for its maintainers. Read the checkout's `AGENTS.md`, `CONTRIBUTING.md` and `docs/DATA.md` (or `research/v2/README.md`) before choosing paths. Maintained workspaces and public checkouts can use different source directories; inspect the actual parser rather than assuming a path.

Check the existing graph first. Musk, Bezos, Zuckerberg and Buffett may already be present. Reuse stable subject IDs and verify the official identity: reporting-owner CIK is different from issuer CIK, and Donald J. Trump is different from Donald Trump Jr. A subject's category and its filing source are separate: a public official can have SEC Form 4 evidence without being a House PTR filer.

## Collect and validate

Use official original SEC, House or other supported disclosure documents. News, search results and model output can locate documents, but cannot create financial relationships. Record the original URL, filing/accession ID, filing date, report/transaction date, owner/issuer identity, raw-file path, bytes and SHA-256. Preserve originals unchanged. Keep inaccessible or scanned documents as links; do not guess rows or bypass access restrictions.

SEC automation needs a descriptive User-Agent with a real contact supplied by the contributor. Fetch sequentially at a conservative rate and stop/back off on access denial or rate limiting. Follow the [SEC access policy](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data). Do not invent a contact address or put credentials in a contribution.

For Form 4 contributions, use the exact schema and commands in [references/form4.md](references/form4.md). Validate locally before integrating:

```sh
python3 scripts/validate_form4.py candidate.json --source-root /path/to/raw-file-root
```

The checker verifies original bytes, URL/accession identity, reporting-owner CIK, XML form/report date and issuer ticker. It does not prove that collection is complete or that a person still owns an asset today. Review XML footnotes and holdings separately.
When a checkout has normalized `research/v2/out/form4.json`, also pass `--existing-form4` with that path: already-present originals are reported separately and conflicting identity/bytes are rejected. An `ok` result means the source checks passed, not that every filing is new; do not resubmit unchanged originals as new data.

## Integrate without changing meaning

- Add the reviewed source manifest/roster and run the deterministic parser. Never edit `graph.json`, `holders.json` or subject shards to invent an edge. If a source adapter is missing, submit its manifest and a parser change rather than pretending another source supports it.
- Form 4: only P/S are open-market buying/selling. Gifts, awards, option exercises, tax withholding and trust transfers retain their codes. A zero-price gift is not a sale. Preserve acquired/disposed direction, transaction-after shares, direct/indirect ownership, non-derivative holdings, derivative tables, footnotes and 10b5-1. A transfer from direct to trust ownership does not by itself prove exit from beneficial ownership.
- House PTR: preserve SP/JT/DC, interval amounts, asset type, transaction date and filing date. A spouse's transaction is not proof the member placed it. Options and bonds are not common-stock positions.
- 13F: preserve quarter ends, amendments, omissions and reporting scope. Compare shares only when periods are comparable. A manager's institutional filing is not their personal portfolio.
- OGE annual assets, OGE periodic transactions, Senate filings and 13D ownership require their own supported adapters and labels. An OGE corporate bond cannot create an equity edge based only on issuer name. Do not fold annual assets into a trade stream.
- Supply accurate Chinese/English names and role labels. Give images a verified identity and license; otherwise use the site's initials fallback. A profile without financial evidence may be proposed for review, but must not acquire holdings edges.
- For a named public figure, search for a suitable real portrait and connect it to the atlas manifest. Verify the subject's `img` points to `avatar:<stable-id>` and inspect the actual graph, directory, search and drawer image. Downloading a portrait without connecting it, or leaving a readily available public portrait as initials, is incomplete. Keep the source and license; use initials only when suitable verified imagery is unavailable.

## Verify and submit

Rebuild the parsed data, graph and static site using the checkout's declared commands. In the public repository these are `npm run data:parse`, `npm run data`, `npm test` and `npm run build`; in a maintained `web/` workspace inspect `package.json` and run the corresponding Python parsers plus `npm run build`. Run only test commands actually declared by that checkout.

Inspect the added subject and its reverse ticker view in both languages on desktop and mobile. Verify source links, dates, transaction codes, indirect holdings and unsupported/empty states. Compare before/after counts and confirm existing subjects were not silently removed. Report the latest **included filing date**, collection window, missing documents and any inference limitations; a rebuild date is not a source date.

Prepare a PR or evidence submission containing the stable ID, original sources and hashes, parsing changes, source-specific caveats and validation results. Never include production configuration, keys, collection chats or user data. A contribution does not authorize publishing or deploying; use the maintainer's requested scope.

中文贡献者：按同一流程核实身份与原件，保留日期、Owner、金额区间、交易代码、信托间接持有和脚注。新增人物不等于新增持仓；提交证据与解析变更供维护者审核。
