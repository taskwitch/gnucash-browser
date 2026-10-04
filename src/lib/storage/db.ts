import type { Book } from '../gnucash/types.ts'

/**
 * Stores the parsed Book (not the raw file) so cold starts skip
 * decompression and parsing entirely. Maps and BigInts structured-clone
 * into IndexedDB natively (Safari 15+).
 */

const DB_NAME = 'gnucash-browser'
const STORE = 'book'
const KEY = 'current'
const SCHEMA_VERSION = 1

interface StoredRecord {
  schemaVersion: number
  book: Book
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

/** Returns the stored book, or null if absent or from an older schema. */
export async function loadStored(): Promise<Book | null> {
  try {
    const db = await openDb()
    const record = await request<StoredRecord | undefined>(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY),
    )
    db.close()
    if (!record) return null
    if (record.schemaVersion !== SCHEMA_VERSION) {
      await clearStored()
      return null
    }
    return record.book
  } catch {
    return null
  }
}

export async function saveStored(book: Book): Promise<void> {
  try {
    const db = await openDb()
    const record: StoredRecord = { schemaVersion: SCHEMA_VERSION, book }
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record, KEY))
    db.close()
  } catch {
    // Persistence is best-effort; the app still works without it.
  }
}

export async function clearStored(): Promise<void> {
  try {
    const db = await openDb()
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY))
    db.close()
  } catch {
    // ignore
  }
}

/** Ask the browser not to evict storage under pressure. Graceful no-op. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {})
}
