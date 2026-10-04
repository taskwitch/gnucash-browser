import pako from 'pako'
import { unzipSync } from 'fflate'

export class NotGnuCashFileError extends Error {}

/**
 * Reads an uploaded GnuCash file to XML text. The native format is gzipped
 * XML, but GnuCash can also save plain XML (compression disabled), and on
 * iPadOS the Files app may not let you pick a `.gnucash` at all — so people
 * zip it, gzip it, or rename it to `.txt`. We therefore detect the container
 * by magic bytes rather than trusting the file name, and support `.zip`.
 */
export async function readGnuCashFile(file: Blob, fileName: string): Promise<string> {
  const bytes = await blobToBytes(file)
  return decodeGnuCashBytes(bytes, fileName)
}

/** Blob.arrayBuffer with a FileReader fallback for older WebKit. */
function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer().then((buf) => new Uint8Array(buf))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsArrayBuffer(blob)
  })
}

export function decodeGnuCashBytes(bytes: Uint8Array, fileName = 'the selected file'): string {
  if (isZip(bytes)) {
    // A .zip usually wraps the native gzipped .gnucash, so recurse to unwrap it.
    return decodeGnuCashBytes(extractGnuCashFromZip(bytes, fileName), fileName)
  }

  let xml: string
  if (isGzip(bytes)) {
    try {
      xml = pako.ungzip(bytes, { to: 'string' })
    } catch {
      throw new NotGnuCashFileError(`"${fileName}" looks gzipped but could not be decompressed.`)
    }
  } else {
    xml = new TextDecoder('utf-8').decode(bytes)
  }

  return assertGnuCashXml(xml, fileName)
}

function assertGnuCashXml(xml: string, fileName: string): string {
  const head = xml.slice(0, 256).replace(/^﻿/, '').trimStart()
  if (head.startsWith('SQLite format 3')) {
    throw new NotGnuCashFileError(
      `"${fileName}" is a GnuCash SQLite file. In desktop GnuCash use File → Save As… and choose the XML format, then upload that file.`,
    )
  }
  if (!head.startsWith('<')) {
    throw new NotGnuCashFileError(
      `"${fileName}" doesn't look like a GnuCash XML file. Export one from desktop GnuCash with File → Save As…`,
    )
  }
  return xml
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    // local file header, or end-of-central-directory (an empty archive)
    ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06))
  )
}

/** Picks the GnuCash entry out of a ZIP and returns its raw (still-encoded) bytes. */
function extractGnuCashFromZip(bytes: Uint8Array, fileName: string): Uint8Array {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch {
    throw new NotGnuCashFileError(`"${fileName}" is a ZIP archive but could not be opened.`)
  }

  const names = Object.keys(entries)
  if (names.length === 0) {
    throw new NotGnuCashFileError(`"${fileName}" is an empty ZIP archive with no GnuCash file inside.`)
  }

  // macOS/iPad zips carry `__MACOSX/…` AppleDouble files (named `._<real name>`)
  // and `.DS_Store` alongside the real entry. Skip those before matching, or a
  // resource fork like `__MACOSX/._book.gnucash` would match the `.gnucash` test.
  const useful = names.filter((n) => !isJunkZipPath(n))

  // Prefer a name that advertises GnuCash, then the only entry, then any entry
  // whose contents look like a GnuCash book.
  const lower = (n: string) => n.toLowerCase()
  const chosen =
    useful.find((n) => lower(n).endsWith('.gnucash')) ??
    useful.find((n) => lower(n).endsWith('.xml')) ??
    (useful.length === 1 ? useful[0] : undefined) ??
    useful.find((n) => looksLikeGnuCash(entries[n]!))

  if (!chosen) {
    throw new NotGnuCashFileError(
      `"${fileName}" is a ZIP archive but none of its files look like a GnuCash XML book.`,
    )
  }
  return entries[chosen]!
}

function isJunkZipPath(name: string): boolean {
  const base = name.split('/').pop() ?? name
  return name.startsWith('__MACOSX/') || base.startsWith('._') || base === '.DS_Store'
}

function looksLikeGnuCash(bytes: Uint8Array): boolean {
  if (isGzip(bytes)) return true
  const head = new TextDecoder('utf-8').decode(bytes.slice(0, 256)).replace(/^﻿/, '').trimStart()
  return head.startsWith('<')
}
