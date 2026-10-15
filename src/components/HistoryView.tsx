import { useMemo, useState } from 'react'
import { formatMonthLong, monthKey } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { sortByDateDesc, totals } from '../lib/stats'
import type { Category, Transaction, TxType } from '../types'
import { TransactionList } from './TransactionList'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  onSelect: (t: Transaction) => void
}

export function HistoryView({ transactions, categories, onSelect }: Props) {
  const [month, setMonth] = useState('todos')
  const [type, setType] = useState<'todos' | TxType>('todos')
  const [categoryId, setCategoryId] = useState('todas')
  const [query, setQuery] = useState('')

  const months = useMemo(
    () => [...new Set(transactions.map((t) => monthKey(t.date)))].sort().reverse(),
    [transactions],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es')
    const names = new Map(categories.map((c) => [c.id, c.name]))
    return sortByDateDesc(
      transactions.filter(
        (t) =>
          (month === 'todos' || monthKey(t.date) === month) &&
          (type === 'todos' || t.type === type) &&
          (categoryId === 'todas' || t.categoryId === categoryId) &&
          (!q || `${t.description} ${names.get(t.categoryId) ?? ''}`.toLocaleLowerCase('es').includes(q)),
      ),
    )
  }, [transactions, categories, month, type, categoryId, query])

  const sum = totals(filtered)
  const catOptions = categories.filter((c) => type === 'todos' || c.type === type)

  return (
    <div className="view">
      <h1 className="view__title">Historial</h1>

      <div className="filters">
        <div className="chips" role="group" aria-label="Tipo de movimiento">
          {(['todos', 'gasto', 'ingreso'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={type === t}
              onClick={() => {
                setType(t)
                setCategoryId('todas')
              }}
            >
              {t === 'todos' ? 'Todos' : t === 'gasto' ? 'Gastos' : 'Ingresos'}
            </button>
          ))}
        </div>
        <div className="filters__row">
          <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes">
            <option value="todos">Todos los meses</option>
            {months.map((m) => (
              <option key={m} value={m}>{formatMonthLong(m)}</option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoría">
            <option value="todas">Todas las categorías</option>
            {catOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <input type="search" placeholder="Buscar descripción" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
        </div>
      </div>

      <p className="history-sum">
        {filtered.length} movimiento{filtered.length === 1 ? '' : 's'}.
        {type !== 'gasto' && <> Ingresos <b>{formatMoney(sum.ingresos)}</b>.</>}
        {type !== 'ingreso' && <> Gastos <b>{formatMoney(sum.gastos)}</b>.</>}
      </p>

      {filtered.length ? (
        <TransactionList transactions={filtered} categories={categories} onSelect={onSelect} />
      ) : (
        <p className="empty-inline">No hay movimientos con estos filtros.</p>
      )}
    </div>
  )
}
