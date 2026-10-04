import { useBook } from '../state/book-context.tsx'
import { monthlyIncomeExpense, netWorthSeries } from '../lib/gnucash/reports.ts'
import { formatMonthShort } from '../lib/gnucash/dates.ts'
import { toNumber } from '../lib/gnucash/money.ts'
import { BarChart } from './charts/BarChart.tsx'
import { LineChart } from './charts/LineChart.tsx'
import { Amount } from './Amount.tsx'

export function Reports() {
  const { book } = useBook()
  if (!book) return null

  const fraction = book.commodities.get(book.defaultCurrencyId)?.fraction ?? 100
  const currency = book.defaultCurrencyId
  const flows = monthlyIncomeExpense(book, 12)
  const series = netWorthSeries(book)

  return (
    <div className="reports">
      <div className="panel">
        <div className="panel-heading">Income vs Expenses — last 12 months ({currency})</div>
        <div className="panel-body">
          <BarChart
            title={`Income vs expenses by month (${currency})`}
            series={[
              { name: 'Income', color: 'var(--chart-income)' },
              { name: 'Expenses', color: 'var(--chart-expense)' },
            ]}
            data={flows.map((f) => ({
              label: formatMonthShort(f.month),
              values: [toNumber(f.income), toNumber(f.expenses)],
            }))}
          />
          <table className="ledger-table chart-data">
            <thead>
              <tr>
                <th>Month</th>
                <th className="col-amount">Income</th>
                <th className="col-amount">Expenses</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((f) => (
                <tr key={f.month}>
                  <td>{formatMonthShort(f.month)}</td>
                  <td className="col-amount">
                    <Amount value={f.income} fraction={fraction} />
                  </td>
                  <td className="col-amount">
                    <Amount value={f.expenses} fraction={fraction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">Net Worth over time ({currency})</div>
        <div className="panel-body">
          <LineChart
            title={`Net worth by month-end (${currency})`}
            color="var(--chart-expense)"
            data={series.map((p) => ({ label: formatMonthShort(p.month), value: toNumber(p.value) }))}
            formatValue={(v) => `${v.toLocaleString('en', { maximumFractionDigits: 0 })}`}
          />
          <table className="ledger-table chart-data">
            <thead>
              <tr>
                <th>Month</th>
                <th className="col-amount">Net worth</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.month}>
                  <td>{formatMonthShort(p.month)}</td>
                  <td className="col-amount">
                    <Amount value={p.value} fraction={fraction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
