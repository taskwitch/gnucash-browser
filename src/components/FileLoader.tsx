import { useState, type ChangeEvent } from 'react'
import { useBook } from '../state/book-context.tsx'

const LARGE_FILE_BYTES = 15 * 1024 * 1024

export const FILE_ACCEPT = '.gnucash,.xml,.gz,application/gzip,application/x-gnucash,text/xml'

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
            Open .gnucash file
            <input type="file" accept={FILE_ACCEPT} onChange={onChange} hidden />
          </label>
        )}

        {error && <p className="error-box">{error}</p>}

        <p className="privacy-note">
          Your file is processed entirely on this device. Nothing is uploaded anywhere.
        </p>
      </div>
    </div>
  )
}
