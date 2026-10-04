/** Render-time date formatting. The model stores 'YYYY-MM-DD' strings only. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2024-03-05' → '05 Mar 2024' */
export function formatDate(datePosted: string): string {
  const [y, m, d] = datePosted.split('-')
  const month = MONTHS[Number(m) - 1] ?? m
  return `${d} ${month} ${y}`
}

/** '2024-03' → 'Mar 24' */
export function formatMonthShort(month: string): string {
  const [y, m] = month.split('-')
  const name = MONTHS[Number(m) - 1] ?? m
  return `${name} ${(y ?? '').slice(2)}`
}

/** '2024-03-16T00:00:00.000Z' → '16 Mar 2024' */
export function formatLoadedAt(iso: string): string {
  return formatDate(iso.slice(0, 10))
}
