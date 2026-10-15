import { formatMoney } from '../lib/money'
import type { CategoryShare } from '../lib/stats'
import type { TxType } from '../types'

interface Props {
  items: CategoryShare[]
  type: TxType
  limit?: number
  emptyText: string
}

const pct = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 })

/** Barras horizontales ordenadas de mayor a menor: cuánto se fue en cada categoría. */
export function CategoryBreakdown({ items, type, limit, emptyText }: Props) {
  if (items.length === 0) return <p className="muted">{emptyText}</p>

  let shown = items
  if (limit && items.length > limit) {
    const rest = items.slice(limit - 1)
    shown = [
      ...items.slice(0, limit - 1),
      {
        category: { id: '__otros', name: `Otras ${rest.length} categorías`, icon: '⋯', type },
        amount: rest.reduce((s, r) => s + r.amount, 0),
        count: rest.reduce((s, r) => s + r.count, 0),
        share: rest.reduce((s, r) => s + r.share, 0),
      },
    ]
  }
  const max = Math.max(...shown.map((s) => s.amount))

  return (
    <ul className="breakdown">
      {shown.map((s) => (
        <li key={s.category.id} className="breakdown__row" title={`${s.category.name}: ${formatMoney(s.amount)} en ${s.count} movimiento${s.count === 1 ? '' : 's'}`}>
          <span className="breakdown__label">
            <span aria-hidden="true">{s.category.icon}</span>
            {s.category.name}
          </span>
          <span className="breakdown__value">
            {formatMoney(s.amount)} <span className="muted">{pct.format(s.share)}</span>
          </span>
          <span className="breakdown__track" aria-hidden="true">
            <span className={`breakdown__bar bar--${type}`} style={{ width: `${Math.max(1.5, (s.amount / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
