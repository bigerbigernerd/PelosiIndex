# PI// Pelosi Index

A visual explorer for public financial disclosures across politicians, company insiders, institutional investors, hedge/quant funds and sovereign/pension/endowment funds.

[Live site](https://pelosi.pocketplay.win/) · [Contribute](../CONTRIBUTING.md) · [Data rules](DATA.md)

The included snapshot is dated **2026-10-05**: 121 subjects, 797 securities, 11,877 full relationships and 21,673 parsed disclosure records. The animated landing graph displays a curated subset of 852 relationships; detail views use the fuller dataset. This is historical disclosure evidence, not live prices, a complete portfolio, or a performance index.

## Run locally

Node.js 20.19+ and Python 3.10+ are required. No API key is needed to run the included snapshot.

```sh
git clone https://github.com/bigerbigernerd/PelosiIndex.git
cd PelosiIndex
npm ci
npm run dev
```

Open `http://127.0.0.1:5190`.

```sh
npm test
npm run build
npm run preview
```

The production output is `web/dist/`. The UI combines React, Vite, Canvas and d3-force. Python parsers rebuild normalized data from original House PTR PDFs and SEC Form 4 / 13F XML. The repository includes curated manifests and source hashes; archived raw reports are downloaded separately.

Six downloadable research Skills support compatible coding agents. No online AI-analysis service is included. Trump is included through two historical SEC Form 4 filings from 2024, with gifts and earnout activity distinguished from market trades. OGE and Senate adapters have not been implemented.

Contributions welcome: verified data corrections, new source adapters, graph performance, accessibility, mobile improvements and documentation. Fork, open an issue or submit a pull request. See [CONTRIBUTING.md](../CONTRIBUTING.md) for evidence requirements and review policy.

Original code and documentation are MIT-licensed. Third-party reports, data and imagery retain their own terms; see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Remotion promo

An editable 40-second English promo, original instrumental score and English voice stems are included in [`video/pelosi-promo`](../video/pelosi-promo/README.md). Install its dependencies separately, then run `npm run dev -- --port 5198` from that directory. Subtitles are disabled by default.
