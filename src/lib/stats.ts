import { monthKey } from './dates'
import type { Category, Transaction, TxType } from '../types'

export interface Totals {
  ingresos: number
  gastos: number
  saldo: number
}

export function totals(list: Transaction[]): Totals {
  let ingresos = 0
  let gastos = 0
  for (const t of list) {
    if (t.type === 'ingreso') ingresos += t.amount
    else gastos += t.amount
  }
  return { ingresos, gastos, saldo: ingresos - gastos }
}

export const inMonth = (list: Transaction[], key: string) => list.filter((t) => monthKey(t.date) === key)

export interface MonthPoint extends Totals {
  key: string
}

export function monthlySeries(list: Transaction[], months: string[]): MonthPoint[] {
  return months.map((key) => ({ key, ...totals(inMonth(list, key)) }))
}

export interface CategoryShare {
  category: Category
  amount: number
  count: number
  share: number
}

export function byCategory(list: Transaction[], categories: Category[], type: TxType): CategoryShare[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const t of list) {
    if (t.type !== type) continue
    const entry = map.get(t.categoryId) ?? { amount: 0, count: 0 }
    entry.amount += t.amount
    entry.count += 1
    map.set(t.categoryId, entry)
  }
  const total = [...map.values()].reduce((s, e) => s + e.amount, 0)
  const lookup = new Map(categories.map((c) => [c.id, c]))
  return [...map.entries()]
    .map(([id, e]) => ({
      category: lookup.get(id) ?? { id, name: 'Sin categoría', icon: '❔', type },
      amount: e.amount,
      count: e.count,
      share: total ? e.amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function sortByDateDesc(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export function isTransactionList(value: unknown): value is Transaction[] {
  return (
    Array.isArray(value) &&
    value.every(
      (t) =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as Transaction).id === 'string' &&
        typeof (t as Transaction).amount === 'number' &&
        ((t as Transaction).type === 'ingreso' || (t as Transaction).type === 'gasto'),
    )
  )
}

export function isCategoryList(value: unknown): value is Category[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((c) => typeof c === 'object' && c !== null && typeof (c as Category).id === 'string' && typeof (c as Category).name === 'string')
  )
}
