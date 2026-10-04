# GnuCash Browser

A personal, single-user, mobile-friendly web app for viewing your [GnuCash](https://www.gnucash.org/) finances on an iPad or iPhone. GnuCash has no official mobile app; this fills that gap.

**View-only by design** — the app never modifies or exports your file.

## How it works

You upload your GnuCash XML file (`.gnucash`), it's decompressed and parsed entirely in your browser, and the result is stored locally. Your financial data never leaves the device.

- **Input** — GnuCash native XML (gzip-compressed `.gnucash`). SQLite-format files are rejected with instructions to re-export as XML.
- **Storage** — IndexedDB holds the parsed book. No server, no database, no account.
- **Privacy** — fully static site, no analytics or tracking of file contents.

## Features

- **Account tree** — balances with per-commodity rollups, running balances, and mixed-currency flags.
- **Register** — per-account transaction list with search and a running balance.
- **Dashboard** — net-worth series.
- **Reports** — monthly income/expense buckets and net-worth chart (hand-rolled SVG, no chart library).

## Development

Requires Node 22.

```bash
npm install
npm run dev            # dev server (-- --host to reach it from an iPad/iPhone on the LAN)
npm test               # Vitest, all tests
npm run typecheck      # tsc --noEmit
npm run build          # typecheck + production build to dist/
```

## Deployment

Static-only: deployed to GitHub Pages via `.github/workflows/deploy.yml`. Any push to `main` (or `master`) builds and deploys. The Vite `base` is set to `/gnucash-browser/` to match the repo name.

## Technical notes

- **Exact money math** — all amounts use exact rational arithmetic (`bigint` numerator/denominator); floats are touched only at display edges.
- **Multi-currency** — totals roll up per commodity. There's no pricedb conversion; the dashboard's net worth counts default-currency accounts only (noted in the UI).
- **Framework-free core** — `src/lib/gnucash/` is dependency-free and fully unit-tested; React lives only in the state/UI layer.
