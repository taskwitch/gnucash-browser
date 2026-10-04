import { useState, type ChangeEvent } from 'react'
import { useBook } from '../state/book-context.tsx'

const LARGE_FILE_BYTES = 15 * 1024 * 1024

// iPadOS 27 won't let Safari pick a raw `.gnucash` (unrecognized type), so we
// also accept the workarounds: zipped/gzipped copies, renamed `.txt`, or the
// raw bytes under a generic MIME type. The decompressor re-detects by content.
export const FILE_ACCEPT = [
  '.gnucash',
  '.xml',
  '.gz',
  '.gzip',
  '.zip',
  '.txt',
  'application/gzip',
  'application/x-gzip',
  'application/zip',
  'application/x-gnucash',
  'text/xml',
  'text/plain',
  'application/octet-stream',
].join(',')

/** Full-screen upload gate shown when no book is loaded. */
export function FileLoader() {
  const { status, error, loadFile } = useBook()
  const [largeFileWarning, setLargeFileWarning] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLargeFileWarning(file.size > LARGE_FILE_BYTES)
    void loadFile(file)
  }

  return (
    <div className="file-loader">
      <div className="panel file-loader-panel">
        <h1 className="app-title">GnuCash Browser</h1>
        <p className="file-loader-lead">View your GnuCash book on this device.</p>

        {status === 'parsing' ? (
          <p className="file-loader-status" role="status">
            Reading file…
            {largeFileWarning && (
              <>
                <br />
                <small>Large file — this may take a moment on this device.</small>
              </>
            )}
          </p>
        ) : (
          <label className="button button-primary file-loader-button">
            Open GnuCash file
            <input type="file" accept={FILE_ACCEPT} onChange={onChange} hidden />
          </label>
        )}

        {error && <p className="error-box">{error}</p>}

        <p className="privacy-note">
          On iPad, zip or rename the file to <code>.txt</code> if it can't be picked directly — the
          app detects it either way.
        </p>
        <p className="privacy-note">
          Your file is processed entirely on this device. Nothing is uploaded anywhere.
        </p>
      </div>
    </div>
  )
}
