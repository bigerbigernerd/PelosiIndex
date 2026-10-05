# Form 4 evidence manifest

Use `schema: pelosi-form4-contributions-v1` and a `people` array. Each person needs `id`, `name_zh`, `name_en`, `owner_cik`, `category` (`pol`, `ins`, `star`, `quant`, `sov`), `ticker` and `filings`. A filing needs `accession`, `form` (`4` or `4/A`), `filingDate`, `reportDate`, `xml_url`, `local_path`, `sha256` and `bytes`.

Optional `role_zh`, `role_en`, `coverage_note_zh`, `coverage_note_en` preserve researched display context. They must not claim a current position or complete portfolio unsupported by the source. Paths are relative to `--source-root`; files outside it are rejected. Do not include an actual candidate until the original file and its real hash exist.

The maintained workspace accepts reviewed additions at `research/v2/sources/form4-additions.json`, with paths relative to `research/v2/`. Its Form 4 parser merges by stable subject ID and accession, verifies original XML and fails on identity/hash conflicts. Existing filings remain present. Public checkouts may place rosters under `research/v2/sources/`; inspect their `parse_form4.py` and source-fetch manifest before adapting these fields. When an additions adapter is absent, include the parser and regression evidence in the contribution.
Use `--existing-form4 /path/to/research/v2/out/form4.json` to distinguish new originals from `already_present` ones. Source validation alone is not a request to append duplicate transactions; the importer merges accessions rather than counting them twice.

After validation in a maintained workspace:

```sh
python3 research/v2/pipeline/parse_form4.py
python3 research/v2/pipeline/build_graph.py
cd web
python3 scripts/build-skills.py
npm run build
```

Use the original issuer's trading symbol; never derive it from an unrelated person's name. An accession prefix may belong to a filing agent, so validate reporting identity inside the XML. Preserve `nonDerivativeHolding` and `derivativeHolding` independently from transactions. For historical sources, make the included dates visible.
