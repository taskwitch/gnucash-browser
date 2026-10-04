# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

A mobile-friendly web app (primary targets: iPad and iPhone browsers) that lets a user upload a GnuCash file and view their finances. GnuCash has no official mobile app, so this fills that gap.

## Hard constraint: static hosting only

The user cannot afford a server or database. The app must work as a fully static site (e.g. GitHub Pages / Cloudflare Pages): all file parsing and data storage happen client-side. Do not introduce a backend, server-side rendering that requires a host, or any external service with recurring cost without first flagging it to the user.

Implications:
- GnuCash's native format (`.gnucash`) is gzipped XML and can be decompressed and parsed entirely in the browser (e.g. `DecompressionStream`/`pako` + `DOMParser`). GnuCash SQLite files can be read client-side via sql.js (WASM). Prefer the XML format unless the user says otherwise.
- Persistence, if needed, must use browser storage (IndexedDB/localStorage) — data never leaves the device. This is also a privacy selling point; keep it that way (no analytics/tracking of file contents).
- Mobile Safari on iOS/iPadOS is the target browser: test `<input type="file">` flows against the Files app, and be careful with memory limits when parsing large files.

## Status

The repository is empty (no commits yet). No framework, build tooling, or test setup has been chosen — establish these with the user before scaffolding. When a stack is chosen, record the build/lint/test commands here.
