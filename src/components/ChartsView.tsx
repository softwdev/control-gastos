import { useState } from 'react'
import { fetchCategoryTotals, fetchMonthlySeries } from '../data/gastos'
import { useRemoteQuery } from '../hooks/useRemoteQuery'
import { currentMonth, formatMonthLong, lastMonths } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { byCategory, inMonth, monthlySeries } from '../lib/stats'
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
  const months = lastMonths(end, range)
  const monthList = inMonth(transactions, month)

  // Datos de las gráficas consultados en las vistas de Supabase; sin conexión se calculan en el dispositivo.
  const remoteSeries = useRemoteQuery(`serie:${months.join(',')}`, () => fetchMonthlySeries(months))
  const remoteCategories = useRemoteQuery(`categorias:${month}:${type}`, () => fetchCategoryTotals(month, type))
  const series = remoteSeries ?? monthlySeries(transactions, months)
  const categoryItems = remoteCategories ?? byCategory(monthList, categories, type)
  const categoryTotal = categoryItems.reduce((s, c) => s + c.amount, 0)
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
        <DataSource remote={remoteSeries !== null} view="cg_resumen_mensual" />
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
            Total: {formatMoney(categoryTotal)}
          </span>
        </div>
        <CategoryBreakdown
          items={categoryItems}
          type={type}
          emptyText={`Sin ${type === 'gasto' ? 'gastos' : 'ingresos'} en ${formatMonthLong(month).toLowerCase()}.`}
        />
        <DataSource remote={remoteCategories !== null} view="cg_totales_por_categoria" />
      </section>
    </div>
  )
}

/** Indica de dónde salieron los datos de la gráfica. */
function DataSource({ remote, view }: { remote: boolean; view: string }) {
  return (
    <p className="data-source">
      <span className={`data-source__dot ${remote ? 'is-remote' : ''}`} aria-hidden="true" />
      {remote ? (
        <>Datos consultados en Supabase (vista <code>{view}</code>).</>
      ) : (
        'Calculado con los datos guardados en este dispositivo.'
      )}
    </p>
  )
}
