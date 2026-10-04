# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

"GnuCash Browser" — a personal, single-user, mobile-friendly (iPad/iPhone Safari) web app that lets the user upload their GnuCash file and view their finances. GnuCash has no official mobile app, so this fills that gap. **View-only** by decision: the app never modifies or exports the file.

## Hard constraint: static hosting only

The user cannot afford a server or database. The app must work as a fully static site (deployed to GitHub Pages via `.github/workflows/deploy.yml`): all file parsing and data storage happen client-side. Do not introduce a backend, server-side rendering that requires a host, or any external service with recurring cost without first flagging it to the user.

Implications:
- Input is the GnuCash native XML format (`.gnucash` = gzipped XML), decompressed and parsed in the browser (`src/lib/gnucash/`). SQLite-format files are rejected with instructions to re-export as XML.
- Persistence uses IndexedDB (`src/lib/storage/db.ts`) storing the **parsed Book** — data never leaves the device. This is also a privacy selling point; keep it that way (no analytics/tracking of file contents).
- Mobile Safari on iOS/iPadOS is the target browser: keep `<input type="file">` flows working with the Files app, respect safe-area insets and `100dvh`, and watch memory limits when parsing large files (parse on the main thread; intermediates must stay collectable).

## Commands

Node 22 lives at `~/.local/node` (user-local install, not on PATH by default): prefix shell commands with `export PATH="$HOME/.local/node/bin:$PATH"`.

- `npm run dev` — dev server (`npm run dev -- --host` to reach it from an iPad/iPhone on the LAN)
- `npm test` — Vitest, all tests
- `npm test -- src/lib/gnucash/money.test.ts` — a single test file
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + production build to `dist/`

## Architecture

- `src/lib/gnucash/` — framework-free core, fully unit-tested:
  - `money.ts` — exact rational arithmetic (`{num: bigint, den: bigint}`). **All money math goes through Rational; `toNumber` only at display edges.** GnuCash fractions like `1234/1000` must never touch floats.
  - `decompress.ts` → `parser.ts` — magic-byte gzip detection, DOMParser → typed `Book` (`types.ts`: Maps keyed by GUID, structured-clone-safe for IndexedDB). Only known tags are read, so newer GnuCash versions degrade gracefully.
  - `balances.ts` — balance index (own/rollup/running), `displayAmount()` is the **single place** where the income sign-flip display convention lives.
  - `reports.ts` — monthly income/expense buckets, net-worth series.
- `src/state/book-context.tsx` — the only state management (React context): book, parse status, error, IndexedDB restore-on-boot.
- `src/components/` — views: AccountTree (home), Register (per-account, search + running balance), Dashboard (net worth), Reports (hand-rolled SVG charts — **no chart library by design**).
- No router (view state machine in `App.tsx`), no CSS framework, no IndexedDB wrapper lib — keep dependencies minimal.

Domain rules that must stay true:
- Balances sum `split:quantity` (account commodity), not `split:value`.
- Income is stored negative in GnuCash but displayed positive; expenses are already stored positive. Stored signs are never mutated.
- Multi-currency: totals roll up per-commodity; mixed subtrees are flagged, and dashboard net worth counts default-currency accounts only (explicit footnote in UI). No pricedb conversion — deliberate.
- Dates are stored as `YYYY-MM-DD` strings; `Date` objects only at render time (`dates.ts`).
- Never commit real financial data: `*.gnucash` is gitignored; tests use the hand-written fixture in `src/lib/gnucash/__fixtures__/`.

## Look and feel (user requirement)

"Professional and old school, like legacy banking software." Beveled panels (light/dark border trick), 1px ledger rules, Georgia/serif headings, `ui-monospace` + `tabular-nums` right-aligned amounts, muted palette in `src/theme.css`. No gradients, border-radius, or animation. Chart series colors (`--chart-income`/`--chart-expense`) were validated for colorblind separation — don't darken them without re-running the dataviz skill's `validate_palette.js`.
