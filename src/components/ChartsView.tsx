import { useState } from 'react'
import { currentMonth, formatMonthLong, lastMonths } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { byCategory, inMonth, monthlySeries, totals } from '../lib/stats'
import type { Category, Transaction, TxType } from '../types'
import { CategoryBreakdown } from './CategoryBreakdown'
import { MonthlyChart } from './MonthlyChart'
import { MonthSwitcher } from './MonthSwitcher'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string
  onMonth: (key: string) => void
}

export function ChartsView({ transactions, categories, month, onMonth }: Props) {
  const [range, setRange] = useState<6 | 12>(6)
  const [type, setType] = useState<TxType>('gasto')
  const end = month > currentMonth() ? currentMonth() : month
  const series = monthlySeries(transactions, lastMonths(end, range))
  const monthList = inMonth(transactions, month)
  const avgGasto = series.reduce((s, d) => s + d.gastos, 0) / series.length

  return (
    <div className="view">
      <h1 className="view__title">Gráficas</h1>

      <section className="card">
        <header className="card__head">
          <div>
            <h2>Ingresos y gastos por mes</h2>
            <p className="muted small">Gasto promedio: {formatMoney(Math.round(avgGasto))} al mes. Toca un mes para ver su detalle.</p>
          </div>
          <div className="chips" role="group" aria-label="Periodo">
            {([6, 12] as const).map((r) => (
              <button key={r} type="button" className="chip chip--small" aria-pressed={range === r} onClick={() => setRange(r)}>
                {r} meses
              </button>
            ))}
          </div>
        </header>
        <MonthlyChart data={series} selected={month} onSelect={onMonth} />
      </section>

      <section className="card">
        <header className="card__head">
          <h2>{type === 'gasto' ? 'Gastos' : 'Ingresos'} por categoría</h2>
          <div className="chips" role="group" aria-label="Tipo">
            {(['gasto', 'ingreso'] as const).map((t) => (
              <button key={t} type="button" className="chip chip--small" aria-pressed={type === t} onClick={() => setType(t)}>
                {t === 'gasto' ? 'Gastos' : 'Ingresos'}
              </button>
            ))}
          </div>
        </header>
        <div className="section-head section-head--inline">
          <MonthSwitcher value={month} onChange={onMonth} />
          <span className="muted small">
            Total: {formatMoney(type === 'gasto' ? totals(monthList).gastos : totals(monthList).ingresos)}
          </span>
        </div>
        <CategoryBreakdown
          items={byCategory(monthList, categories, type)}
          type={type}
          emptyText={`Sin ${type === 'gasto' ? 'gastos' : 'ingresos'} en ${formatMonthLong(month).toLowerCase()}.`}
        />
      </section>
    </div>
  )
}
