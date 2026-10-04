import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { TextEncoder } from 'node:util'
import { zipSync } from 'fflate'
import { decodeGnuCashBytes, NotGnuCashFileError } from './decompress.ts'
import sampleXml from './__fixtures__/sample.gnucash.xml?raw'

const encode = (s: string) => new TextEncoder().encode(s)
// A .gnucash file is gzipped XML; a .xml file is plain XML.
const gzippedBook = gzipSync(encode(sampleXml))

describe('decodeGnuCashBytes: ZIP containers', () => {
  it('unwraps a zip of the native gzipped .gnucash', () => {
    const zip = zipSync({ 'book.gnucash': gzippedBook })
    expect(decodeGnuCashBytes(zip, 'book.zip')).toBe(sampleXml)
  })

  it('unwraps a zip of a plain-XML book', () => {
    const zip = zipSync({ 'book.xml': encode(sampleXml) })
    expect(decodeGnuCashBytes(zip, 'book.zip')).toBe(sampleXml)
  })

  it('falls back to the only entry when its name is unhelpful', () => {
    const zip = zipSync({ 'renamed.txt': gzippedBook })
    expect(decodeGnuCashBytes(zip, 'book.zip')).toBe(sampleXml)
  })

  it('picks the GnuCash entry out of macOS-style cruft', () => {
    const zip = zipSync({
      '__MACOSX/._book.gnucash': encode('junk'),
      '.DS_Store': encode('junk'),
      'book.gnucash': gzippedBook,
    })
    expect(decodeGnuCashBytes(zip, 'book.zip')).toBe(sampleXml)
  })

  it('rejects a zip with no GnuCash file inside', () => {
    const zip = zipSync({ 'notes.txt': encode('hello there') })
    expect(() => decodeGnuCashBytes(zip, 'book.zip')).toThrowError(NotGnuCashFileError)
  })

  it('rejects an empty zip', () => {
    const empty = new Uint8Array(22) // end-of-central-directory record only
    empty[0] = 0x50
    empty[1] = 0x4b
    empty[2] = 0x05
    empty[3] = 0x06
    expect(() => decodeGnuCashBytes(empty, 'book.zip')).toThrowError(/empty ZIP/)
  })
})

describe('decodeGnuCashBytes: renamed files', () => {
  it('reads a gzipped book renamed to .txt', () => {
    expect(decodeGnuCashBytes(gzippedBook, 'book.txt')).toBe(sampleXml)
  })

  it('reads a plain-XML book renamed to .txt', () => {
    expect(decodeGnuCashBytes(encode(sampleXml), 'book.txt')).toBe(sampleXml)
  })
})
