# Third-party material

The MIT license in `LICENSE` applies to this project's original software and documentation. It does not grant rights to third-party reports, data, portraits, company marks or fonts.

- **SEC EDGAR and House Clerk reports:** the repository records their official source URLs and SHA-256 hashes in `research/sources.json`. Original documents are fetched separately. The normalized datasets retain provenance and source-specific reporting limits. House financial disclosure use remains subject to the restrictions printed on the reports, including restrictions on commercial solicitation and credit-rating use.
- **Portraits and marks:** `web/public/data/v2/credits.json` records sources, authors and available licenses for the atlas. Congressional portraits are sourced from the public-domain `unitedstates/images` collection. Other portraits retain their recorded Wikimedia Commons licenses. Low-resolution company/fund marks identify their owners; no affiliation or endorsement is implied. Unclear contributions should use text placeholders.
- **Fonts:** the frontend imports JetBrains Mono from `@fontsource/jetbrains-mono`, which carries its upstream font license in that package. CJK and other sans-serif faces are supplied by the viewer's system.
- **Index coverage and SPY holdings:** `research/stock-universe.json` and the archived SSGA workbook describe source coverage at a point in time. S&P 500 coverage is explicitly a SPY-holdings proxy. Related names and marks belong to their owners; source data is not relicensed as MIT.
- **Dependencies:** React, d3-force, Vite, Playwright and other installed packages retain their own licenses. Install from the lockfile and consult each package's license.

Data and graphical assets can be corrected or removed through a source-backed pull request. See `CONTRIBUTING.md`.
