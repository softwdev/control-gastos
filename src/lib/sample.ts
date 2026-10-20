import { shiftMonth, todayISO, currentMonth } from './dates'
import { createId } from './id'
import { CATEGORY_IDS, type Transaction, type TxType } from '../types'

/** Genera movimientos de ejemplo de los últimos 6 meses para probar la app. */
export function sampleTransactions(): Transaction[] {
  const today = todayISO()
  const list: Transaction[] = []
  const add = (month: string, day: number, type: TxType, pesos: number, categoryId: string, description: string) => {
    const date = `${month}-${String(day).padStart(2, '0')}`
    if (date > today) return
    list.push({ id: createId(), type, amount: Math.round(pesos * 100), categoryId, description, date, createdAt: Date.now() + list.length })
  }
  const vary = (base: number, i: number, k: number) => Math.round(base * (1 + (((i * 7 + k * 13) % 9) - 4) / 20))

  for (let i = 5; i >= 0; i--) {
    const m = shiftMonth(currentMonth(), -i)
    add(m, 1, 'ingreso', 2800, CATEGORY_IDS['familia'], 'Apoyo mensual')
    add(m, 3, 'ingreso', 1600, CATEGORY_IDS['beca'], 'Beca de manutención')
    add(m, 15, 'ingreso', vary(2200, i, 1), CATEGORY_IDS['trabajo'], 'Proyecto freelance')
    add(m, 2, 'gasto', 1800, CATEGORY_IDS['vivienda'], 'Renta del cuarto')
    add(m, 5, 'gasto', 249, CATEGORY_IDS['celular'], 'Plan de celular')
    add(m, 4, 'gasto', vary(420, i, 2), CATEGORY_IDS['transporte'], 'Recarga de transporte')
    add(m, 6, 'gasto', vary(310, i, 3), CATEGORY_IDS['comida'], 'Despensa')
    add(m, 10, 'gasto', vary(185, i, 4), CATEGORY_IDS['comida'], 'Comida en la cafetería')
    add(m, 12, 'gasto', vary(260, i, 5), CATEGORY_IDS['escuela'], 'Copias e impresiones')
    add(m, 18, 'gasto', vary(350, i, 6), CATEGORY_IDS['comida'], 'Despensa')
    add(m, 20, 'gasto', vary(230, i, 7), CATEGORY_IDS['ocio'], 'Cine con amigos')
    add(m, 24, 'gasto', vary(280, i, 8), CATEGORY_IDS['transporte'], 'Gasolina')
    if (i % 2 === 0) add(m, 22, 'gasto', vary(450, i, 9), CATEGORY_IDS['ropa'], 'Tenis')
    if (i % 3 === 1) add(m, 8, 'gasto', vary(380, i, 10), CATEGORY_IDS['salud'], 'Consulta y medicamento')
  }
  return list
}
