# Architecture and self-hosting

## Frontend

`web/src/graph/engine.js` owns the Canvas renderer and d3-force simulation. `LiveGraph.jsx` supplies filters, search, selection and the disclosure feed. `Drawer.jsx` loads evidence on demand. `/people/`, `/stocks/` and `/skills/` and their `/en/` equivalents are static frontend routes.

The initial page pins `data/revisions/<hash>/graph.json` and its low-resolution atlas using the build revision; the graph-data Skill discovers the current revision through `data/version.json`. `holders.json` and `s/<subject-id>.json` are loaded only when needed. A full graph is not sent in the initial hero payload.

## Data

```text
Official originals + curated rosters / hashes
  -> parse_ptr.py / parse_form4.py / parse_13f.py
  -> research/v2/out/{ptr,form4,13f}.json
  -> build_graph.py + layout.mjs
  -> web/public/data/v2/{graph,holders,s/*}.json
```

`npm run data` regenerates graph output and Skills from committed normalized inputs. `npm run data:parse` verifies cached originals and reruns the three source parsers. Image-atlas rebuilding is optional and needs original images, Pillow and Playwright Chromium; the checked-in atlas lets normal builds work without that toolchain.

## Static deployment

`npm run build` produces `web/dist/` with route-specific HTML, canonical metadata, a sitemap, robots rules and an explicit public-file allowlist. Serve this directory at the domain root. Use the route-specific index files for Chinese and English routes.

The included public metadata and Skill links target `https://pelosi.pocketplay.win`. For a fork on another domain, update `web/index.html`, `web/scripts/prepare-public.mjs`, `web/src/pages/Skills.jsx`, `web/public/robots.txt`, `web/public/sitemap.xml`, and the graph-data Skill's default origin. Search all public references before publishing the fork.

The source contains an optional no-op analytics bridge: events are emitted only if a host supplies `window.PPAnalytics`. No account, private API, production server, deployment credential or hosted analysis service is required to self-host.

Pull requests build and validate on GitHub Actions. They do not automatically deploy to the live PocketPlay site.
