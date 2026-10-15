import { parseISO, todayISO, toISO } from './dates'
import { formatMoney } from './money'
import type { Category, Transaction, TxType } from '../types'

export const LIMITS = {
  /** Monto máximo por movimiento, en centavos ($999,999.99) */
  amountMax: 99_999_999,
  descriptionMin: 2,
  descriptionMax: 80,
  categoryMin: 2,
  categoryMax: 30,
  /** Fecha más antigua aceptada */
  minDate: '2000-01-01',
} as const

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u
const HAS_LETTER = /\p{L}/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** 1500 · 1500.5 · 1500.50 · 1,500.50 */
const MONEY = /^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/

export const cleanText = (text: string) => text.replace(/\s+/g, ' ').trim()

export const normalize = (text: string) =>
  cleanText(text).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es')

export function isValidISODate(value: string): boolean {
  return ISO_DATE.test(value) && toISO(parseISO(value)) === value
}

export const isTxType = (value: unknown): value is TxType => value === 'gasto' || value === 'ingreso'

/** Deja solo dígitos, comas y un punto decimal con máximo 2 decimales mientras se escribe. */
export function sanitizeAmountInput(text: string): string {
  let clean = text.replace(/[^\d.,]/g, '')
  const dot = clean.indexOf('.')
  if (dot !== -1) {
    clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/[.,]/g, '').slice(0, 2)
  }
  return clean
}

/** "1,234.5" → 123450 centavos; NaN si el formato no es válido. */
export function parseAmount(text: string): number {
  const value = text.trim()
  if (!MONEY.test(value)) return Number.NaN
  return Math.round(Number(value.replace(/,/g, '')) * 100)
}

export interface TransactionForm {
  type: TxType
  amount: string
  categoryId: string
  description: string
  date: string
}

export type TransactionErrors = Partial<Record<keyof TransactionForm, string>>

export function validateTransaction(form: TransactionForm, categories: Category[]): TransactionErrors {
  const errors: TransactionErrors = {}

  // Tipo
  if (!isTxType(form.type)) errors.type = 'Elige si es un gasto o un ingreso.'

  // Monto
  const amountText = form.amount.trim()
  const cents = parseAmount(amountText)
  if (!amountText) errors.amount = 'Escribe el monto.'
  else if (Number.isNaN(cents)) errors.amount = 'Escribe solo números, con máximo 2 decimales. Ejemplo: 150 o 89.50'
  else if (cents <= 0) errors.amount = 'El monto debe ser mayor a cero.'
  else if (cents > LIMITS.amountMax) errors.amount = `El monto máximo es ${formatMoney(LIMITS.amountMax)}.`

  // Categoría
  if (!form.categoryId) errors.categoryId = 'Elige una categoría.'
  else if (!categories.some((c) => c.id === form.categoryId && c.type === form.type))
    errors.categoryId = 'La categoría no corresponde al tipo de movimiento. Elige otra.'

  // Descripción (opcional)
  const description = cleanText(form.description)
  if (description) {
    if (description.length < LIMITS.descriptionMin) errors.description = `Escribe al menos ${LIMITS.descriptionMin} caracteres o déjala vacía.`
    else if (description.length > LIMITS.descriptionMax) errors.description = `Máximo ${LIMITS.descriptionMax} caracteres.`
    else if (!HAS_LETTER_OR_DIGIT.test(description)) errors.description = 'La descripción debe incluir letras o números.'
  }

  // Fecha
  if (!form.date) errors.date = 'Elige la fecha.'
  else if (!isValidISODate(form.date)) errors.date = 'La fecha no es válida.'
  else if (form.date > todayISO()) errors.date = 'No puedes registrar movimientos con fecha futura.'
  else if (form.date < LIMITS.minDate) errors.date = 'La fecha es demasiado antigua.'

  return errors
}

export function validateCategoryName(name: string, type: TxType, categories: Category[]): string | undefined {
  const clean = cleanText(name)
  if (!clean) return 'Escribe el nombre de la categoría.'
  if (clean.length < LIMITS.categoryMin) return `El nombre debe tener al menos ${LIMITS.categoryMin} caracteres.`
  if (clean.length > LIMITS.categoryMax) return `El nombre puede tener máximo ${LIMITS.categoryMax} caracteres.`
  if (!HAS_LETTER.test(clean)) return 'El nombre debe incluir letras.'
  if (categories.some((c) => c.type === type && normalize(c.name) === normalize(clean)))
    return 'Ya existe una categoría con ese nombre.'
  return undefined
}

/* ---------- Datos guardados o importados ---------- */

export function isStoredTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    t.id.length > 0 &&
    isTxType(t.type) &&
    typeof t.amount === 'number' &&
    Number.isInteger(t.amount) &&
    t.amount > 0 &&
    t.amount <= LIMITS.amountMax &&
    typeof t.categoryId === 'string' &&
    t.categoryId.length > 0 &&
    typeof t.description === 'string' &&
    t.description.length <= LIMITS.descriptionMax &&
    typeof t.date === 'string' &&
    isValidISODate(t.date) &&
    typeof t.createdAt === 'number'
  )
}

export function isStoredCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.name === 'string' &&
    cleanText(c.name).length > 0 &&
    c.name.length <= LIMITS.categoryMax &&
    typeof c.icon === 'string' &&
    c.icon.length > 0 &&
    c.icon.length <= 8 &&
    isTxType(c.type) &&
    (c.builtIn === undefined || typeof c.builtIn === 'boolean')
  )
}

/** Conserva los movimientos válidos y descarta los dañados. */
export function parseTransactionList(value: unknown): Transaction[] | null {
  return Array.isArray(value) ? value.filter(isStoredTransaction) : null
}

/** Conserva las categorías válidas; si no queda ninguna, usa las predeterminadas. */
export function parseCategoryList(value: unknown): Category[] | null {
  if (!Array.isArray(value)) return null
  const list = value.filter(isStoredCategory)
  return list.length > 0 ? list : null
}

export interface ImportResult {
  ok: boolean
  message: string
  categories?: Category[]
  transactions?: Transaction[]
}

/** Revisa un archivo de respaldo completo antes de reemplazar los datos. */
export function validateBackup(data: unknown, fallbackIds: Record<TxType, string>): ImportResult {
  if (typeof data !== 'object' || data === null) return { ok: false, message: 'El archivo no es un respaldo de Control de gastos.' }
  const obj = data as { categories?: unknown; transactions?: unknown }
  if (!Array.isArray(obj.categories) || !Array.isArray(obj.transactions))
    return { ok: false, message: 'Al respaldo le faltan las categorías o los movimientos.' }

  const categories = obj.categories.filter(isStoredCategory)
  if (categories.length === 0) return { ok: false, message: 'El respaldo no tiene categorías válidas.' }
  const ids = new Set(categories.map((c) => c.id))
  if (ids.size !== categories.length) return { ok: false, message: 'El respaldo tiene categorías repetidas.' }

  const valid = obj.transactions.filter(isStoredTransaction)
  const skipped = obj.transactions.length - valid.length
  // Si un movimiento apunta a una categoría que no existe, pasa a "Otros".
  const transactions = valid.map((t) => (ids.has(t.categoryId) ? t : { ...t, categoryId: fallbackIds[t.type] }))

  const parts = [transactions.length === 1 ? 'Se importó 1 movimiento.' : `Se importaron ${transactions.length} movimientos.`]
  if (skipped === 1) parts.push('Se omitió 1 por tener datos inválidos.')
  else if (skipped > 1) parts.push(`Se omitieron ${skipped} por tener datos inválidos.`)
  return { ok: true, message: parts.join(' '), categories, transactions }
}
