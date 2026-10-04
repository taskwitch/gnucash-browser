import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App.tsx'
import { BookProvider } from './state/book-context.tsx'
import sampleXml from './lib/gnucash/__fixtures__/sample.gnucash.xml?raw'

// Let React know tests wrap renders/events in act().
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderApp(): Promise<HTMLDivElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <BookProvider>
        <App />
      </BookProvider>,
    )
  })
  return container
}

async function uploadFixture(el: HTMLElement) {
  const input = el.querySelector<HTMLInputElement>('.file-loader input[type=file]')!
  const file = new File([sampleXml], 'sample.gnucash')
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  // loadFile is fired without awaiting from the event handler; let it settle.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
  })
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function tab(el: HTMLElement, label: string): Element {
  const button = [...el.querySelectorAll('.tab-bar .tab')].find((t) => t.textContent === label)
  if (!button) throw new Error(`tab not found: ${label}`)
  return button
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  container?.remove()
  root = null
  container = null
})

describe('App smoke test', () => {
  it('shows the upload gate when no book is stored', async () => {
    const el = await renderApp()
    expect(el.textContent).toContain('GnuCash Browser')
    expect(el.textContent).toContain('Open .gnucash file')
  })

  it('parses an uploaded file and shows the account tree', async () => {
    const el = await renderApp()
    await uploadFixture(el)
    expect(el.textContent).toContain('Checking')
    expect(el.textContent).toContain('Wallet USD')
    expect(el.textContent).toContain('8,236.66')
    // income shown as positive per display convention
    expect(el.textContent).toContain('7,500.00')
  })

  it('opens a register with running balances and memos', async () => {
    const el = await renderApp()
    await uploadFixture(el)
    const checking = [...el.querySelectorAll('.account-name')].find(
      (b) => b.textContent === 'Checking',
    )!
    await click(checking)
    expect(el.textContent).toContain('Salary January')
    expect(el.textContent).toContain('3,447.66')

    await click([...el.querySelectorAll('.back-button')][0]!)
    const groceries = [...el.querySelectorAll('.account-name')].find(
      (b) => b.textContent === 'Groceries',
    )!
    await click(groceries)
    expect(el.textContent).toContain('weekly shop')
  })

  it('shows net worth on the dashboard', async () => {
    const el = await renderApp()
    await uploadFixture(el)
    await click(tab(el, 'Dashboard'))
    expect(el.textContent).toContain('Net Worth')
    expect(el.textContent).toContain('8,206.66')
    expect(el.textContent).toContain('exclude accounts in USD')
  })

  it('renders the reports charts', async () => {
    const el = await renderApp()
    await uploadFixture(el)
    await click(tab(el, 'Reports'))
    expect(el.textContent).toContain('Income vs Expenses')
    expect(el.textContent).toContain('Net Worth over time')
    expect(el.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2)
  })
})
