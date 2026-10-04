import { parseFraction } from './money.ts'
import { NotGnuCashFileError } from './decompress.ts'
import type {
  Account,
  AccountType,
  Book,
  Commodity,
  ReconciledState,
  Split,
  Transaction,
} from './types.ts'

/**
 * Parses GnuCash XML (format v2) into a Book. Only known tags are read, so
 * unknown elements from newer GnuCash versions are ignored rather than fatal.
 *
 * Namespace handling: GnuCash writes consistent prefixes (gnc:, act:, trn:,
 * …), but to be safe every lookup goes through children()/descendants(),
 * which match on the prefixed tagName and fall back to localName.
 */

function matches(el: Element, prefixed: string): boolean {
  if (el.tagName === prefixed) return true
  const colon = prefixed.indexOf(':')
  return colon !== -1 && el.localName === prefixed.slice(colon + 1)
}

/** Direct children of el with the given tag. */
function children(el: Element, prefixed: string): Element[] {
  const out: Element[] = []
  for (const c of Array.from(el.children)) {
    if (matches(c, prefixed)) out.push(c)
  }
  return out
}

function child(el: Element, prefixed: string): Element | undefined {
  return children(el, prefixed)[0]
}

/** All descendants with the given tag (document order). */
function descendants(el: Element | Document, prefixed: string): Element[] {
  const root = 'documentElement' in el ? el.documentElement : el
  if (!root) return []
  const out: Element[] = []
  const walk = (node: Element) => {
    for (const c of Array.from(node.children)) {
      if (matches(c, prefixed)) out.push(c)
      walk(c)
    }
  }
  walk(root)
  return out
}

function childText(el: Element, prefixed: string): string {
  return child(el, prefixed)?.textContent?.trim() ?? ''
}

/** A commodity reference element (<act:commodity> / <trn:currency>). */
function commodityRef(el: Element | undefined): string {
  if (!el) return ''
  return childText(el, 'cmdty:id')
}

const KNOWN_ACCOUNT_TYPES: ReadonlySet<string> = new Set([
  'ROOT',
  'ASSET',
  'BANK',
  'CASH',
  'RECEIVABLE',
  'LIABILITY',
  'CREDIT',
  'PAYABLE',
  'INCOME',
  'EXPENSE',
  'EQUITY',
  'STOCK',
  'MUTUAL',
  'TRADING',
])

function parseAccountType(text: string): AccountType {
  return KNOWN_ACCOUNT_TYPES.has(text) ? (text as AccountType) : 'OTHER'
}

function parseReconciled(text: string): ReconciledState {
  return text === 'c' || text === 'y' ? text : 'n'
}

function parseCommodity(el: Element): Commodity {
  const id = childText(el, 'cmdty:id')
  const fractionText = childText(el, 'cmdty:fraction')
  const fraction = Number.parseInt(fractionText, 10)
  return {
    id,
    space: childText(el, 'cmdty:space'),
    fullname: childText(el, 'cmdty:name') || id,
    fraction: Number.isFinite(fraction) && fraction > 0 ? fraction : 100,
  }
}

function parsePlaceholder(accountEl: Element): boolean {
  const slots = child(accountEl, 'act:slots')
  if (!slots) return false
  for (const slot of children(slots, 'slot')) {
    if (childText(slot, 'slot:key') === 'placeholder') {
      return childText(slot, 'slot:value') === 'true'
    }
  }
  return false
}

function parseSplit(el: Element): Split {
  return {
    accountId: childText(el, 'split:account'),
    memo: childText(el, 'split:memo'),
    reconciledState: parseReconciled(childText(el, 'split:reconciled-state')),
    value: parseFraction(childText(el, 'split:value') || '0'),
    quantity: parseFraction(childText(el, 'split:quantity') || '0'),
  }
}

function parseTransaction(el: Element): Transaction {
  const datePosted = childText(child(el, 'trn:date-posted') ?? el, 'ts:date').slice(0, 10)
  const splitsEl = child(el, 'trn:splits')
  return {
    id: childText(el, 'trn:id'),
    datePosted,
    description: childText(el, 'trn:description'),
    splits: splitsEl ? children(splitsEl, 'trn:split').map(parseSplit) : [],
  }
}

export function parseBook(xml: string, fileName: string, loadedAt = new Date().toISOString()): Book {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new NotGnuCashFileError(`"${fileName}" contains XML that could not be parsed.`)
  }

  const bookEl = descendants(doc, 'gnc:book')[0]
  if (!bookEl) {
    throw new NotGnuCashFileError(
      `"${fileName}" is XML but not a GnuCash book (no <gnc:book> found).`,
    )
  }

  const commodities = new Map<string, Commodity>()
  for (const el of children(bookEl, 'gnc:commodity')) {
    const c = parseCommodity(el)
    if (c.id) commodities.set(c.id, c)
  }

  const accounts = new Map<string, Account>()
  for (const el of children(bookEl, 'gnc:account')) {
    const id = childText(el, 'act:id')
    if (!id) continue
    accounts.set(id, {
      id,
      name: childText(el, 'act:name'),
      type: parseAccountType(childText(el, 'act:type')),
      description: childText(el, 'act:description'),
      commodityId: commodityRef(child(el, 'act:commodity')),
      parentId: childText(el, 'act:parent') || null,
      children: [],
      placeholder: parsePlaceholder(el),
    })
  }
  // Second pass: wire the tree, ignoring dangling parent refs.
  for (const account of accounts.values()) {
    if (account.parentId) {
      const parent = accounts.get(account.parentId)
      if (parent) parent.children.push(account.id)
      else account.parentId = null
    }
  }

  // Direct children only: <gnc:template-transactions> also contains
  // <gnc:transaction> elements (scheduled-transaction templates) which must
  // not leak into the register.
  const transactions = children(bookEl, 'gnc:transaction').map(parseTransaction)
  transactions.sort((a, b) => (a.datePosted < b.datePosted ? -1 : a.datePosted > b.datePosted ? 1 : 0))

  const root = [...accounts.values()].find((a) => a.type === 'ROOT')
  const firstTopLevel = root?.children.map((id) => accounts.get(id)).find((a) => a !== undefined)
  const defaultCurrencyId = firstTopLevel?.commodityId || [...commodities.keys()][0] || 'EUR'

  return { commodities, accounts, transactions, defaultCurrencyId, loadedAt, fileName }
}

/** The single hidden ROOT account, if present. */
export function rootAccount(book: Book): Account | undefined {
  return [...book.accounts.values()].find((a) => a.type === 'ROOT')
}

/** Top-level visible accounts (children of ROOT). */
export function topLevelAccounts(book: Book): Account[] {
  const root = rootAccount(book)
  if (root) {
    return root.children
      .map((id) => book.accounts.get(id))
      .filter((a): a is Account => a !== undefined)
  }
  // Files without a ROOT account: show parentless accounts.
  return [...book.accounts.values()].filter((a) => a.parentId === null)
}
