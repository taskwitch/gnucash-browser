import pako from 'pako'

export class NotGnuCashFileError extends Error {}

/**
 * Reads an uploaded .gnucash file to XML text. The native format is gzipped
 * XML, but GnuCash can also save plain XML (compression disabled), so detect
 * by magic bytes rather than trusting the file name.
 */
export async function readGnuCashFile(file: Blob, fileName: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return decodeGnuCashBytes(bytes, fileName)
}

export function decodeGnuCashBytes(bytes: Uint8Array, fileName = 'the selected file'): string {
  let xml: string
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      xml = pako.ungzip(bytes, { to: 'string' })
    } catch {
      throw new NotGnuCashFileError(`"${fileName}" looks gzipped but could not be decompressed.`)
    }
  } else {
    xml = new TextDecoder('utf-8').decode(bytes)
  }

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
