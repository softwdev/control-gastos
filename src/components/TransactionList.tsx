import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Category, Transaction } from '../types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  onSelect: (t: Transaction) => void
  groupByDay?: boolean
}

export function TransactionList({ transactions, categories, onSelect, groupByDay = true }: Props) {
  const lookup = new Map(categories.map((c) => [c.id, c]))

  const groups: { date: string; items: Transaction[] }[] = []
  for (const t of transactions) {
    const last = groups[groups.length - 1]
    if (groupByDay && last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }

  const row = (t: Transaction) => {
    const cat = lookup.get(t.categoryId)
    return (
      <li key={t.id}>
        <button type="button" className="tx" onClick={() => onSelect(t)}>
          <span className={`tx__icon tx__icon--${t.type}`} aria-hidden="true">{cat?.icon ?? '❔'}</span>
          <span className="tx__text">
            <span className="tx__title">{t.description || cat?.name || 'Sin categoría'}</span>
            <span className="tx__sub">
              {cat?.name ?? 'Sin categoría'}
              {!groupByDay && `, ${formatDay(t.date).toLowerCase()}`}
            </span>
          </span>
          <span className={`tx__amount tx__amount--${t.type}`}>
            {t.type === 'gasto' ? '−' : '+'}
            {formatMoney(t.amount)}
          </span>
        </button>
      </li>
    )
  }

  if (!groupByDay) return <ul className="tx-list">{transactions.map(row)}</ul>

  return (
    <div className="tx-days">
      {groups.map((g) => {
        const net = g.items.reduce((s, t) => s + (t.type === 'ingreso' ? t.amount : -t.amount), 0)
        return (
          <section key={g.date} className="tx-day">
            <h3 className="tx-day__head">
              <span>{formatDay(g.date)}</span>
              <span className="tx-day__net">{net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net))}</span>
            </h3>
            <ul className="tx-list">{g.items.map(row)}</ul>
          </section>
        )
      })}
    </div>
  )
}
