import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Book } from '../lib/gnucash/types.ts'
import { buildBalanceIndex, type BalanceIndex } from '../lib/gnucash/balances.ts'
import { readGnuCashFile } from '../lib/gnucash/decompress.ts'
import { parseBook } from '../lib/gnucash/parser.ts'
import { clearStored, loadStored, requestPersistentStorage, saveStored } from '../lib/storage/db.ts'

export type BookStatus = 'loading' | 'empty' | 'parsing' | 'ready'

interface BookContextValue {
  status: BookStatus
  book: Book | null
  index: BalanceIndex | null
  error: string | null
  /** true when the current book came from IndexedDB rather than a fresh upload */
  restoredFromStorage: boolean
  loadFile: (file: File) => Promise<void>
  forget: () => Promise<void>
  dismissError: () => void
}

const BookContext = createContext<BookContextValue | null>(null)

export function BookProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BookStatus>('loading')
  const [book, setBook] = useState<Book | null>(null)
  const bookRef = useRef<Book | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoredFromStorage, setRestoredFromStorage] = useState(false)

  const setBookState = (next: Book | null) => {
    bookRef.current = next
    setBook(next)
  }

  useEffect(() => {
    let cancelled = false
    loadStored().then((stored) => {
      if (cancelled) return
      if (stored) {
        setBookState(stored)
        setRestoredFromStorage(true)
        setStatus('ready')
      } else {
        setStatus('empty')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadFile = useCallback(async (file: File) => {
    setStatus('parsing')
    setError(null)
    // Let the "Parsing…" state paint before the main-thread parse blocks.
    await new Promise((resolve) => setTimeout(resolve, 30))
    try {
      const xml = await readGnuCashFile(file, file.name)
      const parsed = parseBook(xml, file.name)
      setBookState(parsed)
      setRestoredFromStorage(false)
      setStatus('ready')
      requestPersistentStorage()
      void saveStored(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
      // Keep the previous book if there was one — never strand the user.
      setStatus(bookRef.current ? 'ready' : 'empty')
    }
  }, [])

  const forget = useCallback(async () => {
    await clearStored()
    setBookState(null)
    setError(null)
    setRestoredFromStorage(false)
    setStatus('empty')
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  const index = useMemo(() => (book ? buildBalanceIndex(book) : null), [book])

  const value: BookContextValue = {
    status,
    book,
    index,
    error,
    restoredFromStorage,
    loadFile,
    forget,
    dismissError,
  }
  return <BookContext.Provider value={value}>{children}</BookContext.Provider>
}

export function useBook(): BookContextValue {
  const ctx = useContext(BookContext)
  if (!ctx) throw new Error('useBook must be used inside BookProvider')
  return ctx
}
