import { fetchBalance } from '../data/gastos'
import { useRemoteQuery } from '../hooks/useRemoteQuery'
import { formatMonthLong } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { byCategory, inMonth, sortByDateDesc, totals } from '../lib/stats'
import type { Category, Transaction } from '../types'
import { CategoryBreakdown } from './CategoryBreakdown'
import { MonthSwitcher } from './MonthSwitcher'
import { TransactionList } from './TransactionList'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string
  onMonth: (key: string) => void
  onSelect: (t: Transaction) => void
  onGo: (view: 'historial' | 'graficas') => void
}

export function SummaryView({ transactions, categories, month, onMonth, onSelect, onGo }: Props) {
  // Saldo disponible: se consulta en la vista cg_saldo; sin conexión se calcula en el dispositivo.
  const remoteBalance = useRemoteQuery('saldo', fetchBalance)
  const all = { saldo: remoteBalance ?? totals(transactions).saldo }
  const monthList = inMonth(transactions, month)
  const m = totals(monthList)
  const recent = sortByDateDesc(transactions).slice(0, 5)
  const spentShare = m.ingresos > 0 ? Math.min(1, m.gastos / m.ingresos) : m.gastos > 0 ? 1 : 0

  return (
    <div className="view">
      <section className="balance" aria-labelledby="saldo-title">
        <p id="saldo-title" className="balance__label">Saldo disponible</p>
        <p className={`balance__amount ${all.saldo < 0 ? 'is-negative' : ''}`}>
          {all.saldo < 0 && '−'}
          {formatMoney(Math.abs(all.saldo))}
        </p>
        <p className="balance__hint">
          {all.saldo < 0
            ? 'Has gastado más de lo que has registrado como ingresos.'
            : remoteBalance !== null
              ? 'Total de ingresos menos gastos, calculado en Supabase.'
              : 'Total de ingresos menos gastos registrados en este dispositivo.'}
        </p>
      </section>

      <div className="section-head">
        <MonthSwitcher value={month} onChange={onMonth} />
      </div>

      <section className="stats" aria-label={`Resumen de ${formatMonthLong(month)}`}>
        <div className="stat">
          <span className="stat__label"><span className="swatch swatch--ingreso" />Ingresos del mes</span>
          <span className="stat__value">{formatMoney(m.ingresos)}</span>
        </div>
        <div className="stat">
          <span className="stat__label"><span className="swatch swatch--gasto" />Gastos del mes</span>
          <span className="stat__value">{formatMoney(m.gastos)}</span>
        </div>
        <div className="stat stat--wide">
          <span className="stat__label">Balance del mes</span>
          <span className="stat__value">{m.saldo < 0 ? '−' : '+'}{formatMoney(Math.abs(m.saldo))}</span>
          <div className="meter" aria-hidden="true"><span style={{ width: `${spentShare * 100}%` }} /></div>
          <span className="stat__note">
            {m.ingresos > 0
              ? `Has gastado el ${Math.round((m.gastos / m.ingresos) * 100)}% de lo que ingresó este mes.`
              : m.gastos > 0
                ? 'Este mes no hay ingresos registrados.'
                : 'Sin movimientos este mes.'}
          </span>
        </div>
      </section>

      <section className="card">
        <header className="card__head">
          <h2>Gastos por categoría</h2>
          <button type="button" className="link-btn" onClick={() => onGo('graficas')}>Ver gráficas</button>
        </header>
        <CategoryBreakdown
          items={byCategory(monthList, categories, 'gasto')}
          type="gasto"
          limit={5}
          emptyText="Sin gastos registrados en este mes."
        />
      </section>

      <section className="card">
        <header className="card__head">
          <h2>Últimos movimientos</h2>
          <button type="button" className="link-btn" onClick={() => onGo('historial')}>Ver historial</button>
        </header>
        {recent.length ? (
          <TransactionList transactions={recent} categories={categories} onSelect={onSelect} groupByDay={false} />
        ) : (
          <p className="muted">Todavía no hay movimientos.</p>
        )}
      </section>
    </div>
  )
}
