/**
 * Capa de datos de Control de gastos.
 *
 * - La interfaz lee y escribe en la copia local (localStorage), así el historial funciona sin conexión.
 * - Cada cambio se agrega a una cola de pendientes.
 * - El motor de sincronización envía la cola a Supabase (tablas cg_categorias y cg_movimientos)
 *   y descarga los datos actuales.
 * - Las gráficas y el saldo se consultan en las vistas de la base de datos
 *   (cg_resumen_mensual, cg_totales_por_categoria, cg_saldo).
 */
import { createId, isUuid } from '../lib/id'
import type { CategoryShare, MonthPoint } from '../lib/stats'
import { createStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { classifyError, createSyncEngine, type PendingOp, type PushResult } from '../lib/sync'
import { cleanText, parseCategoryList, parseTransactionList } from '../lib/validation'
import {
  DEFAULT_CATEGORIES,
  FALLBACK_CATEGORY,
  legacyCategoryId,
  type Category,
  type Transaction,
  type TransactionDraft,
  type TxType,
} from '../types'

const KEY = 'control-gastos'

/* ---------- Copia local ---------- */

export const categoriesStore = createStore<Category[]>(`${KEY}:categorias:v2`, DEFAULT_CATEGORIES, parseCategoryList)
export const transactionsStore = createStore<Transaction[]>(`${KEY}:movimientos:v2`, [], parseTransactionList)

/* ---------- Conversión entre la app y las columnas de la base de datos ---------- */

type MovimientoRow = {
  id: string
  tipo: TxType
  monto: number
  categoria_id: string
  descripcion: string
  fecha: string
  creado_en: string
}

type CategoriaRow = {
  id: string
  nombre: string
  icono: string
  tipo: TxType
  predeterminada: boolean
}

/** En la app el monto se maneja en centavos; en la base de datos como numeric(10,2). */
const toMovimientoRow = (t: Transaction): MovimientoRow => ({
  id: t.id,
  tipo: t.type,
  monto: t.amount / 100,
  categoria_id: t.categoryId,
  descripcion: t.description,
  fecha: t.date,
  creado_en: new Date(t.createdAt).toISOString(),
})

const fromMovimientoRow = (r: { id: string; tipo: string; monto: number; categoria_id: string; descripcion: string; fecha: string; creado_en: string }): Transaction => ({
  id: r.id,
  type: r.tipo === 'ingreso' ? 'ingreso' : 'gasto',
  amount: Math.round(Number(r.monto) * 100),
  categoryId: r.categoria_id,
  description: r.descripcion,
  date: r.fecha,
  createdAt: Date.parse(r.creado_en),
})

const toCategoriaRow = (c: Category): CategoriaRow => ({
  id: c.id,
  nombre: c.name,
  icono: c.icon,
  tipo: c.type,
  predeterminada: Boolean(c.builtIn),
})

const fromCategoriaRow = (r: { id: string; nombre: string; icono: string; tipo: string; predeterminada: boolean }): Category => ({
  id: r.id,
  name: r.nombre,
  icon: r.icono,
  type: r.tipo === 'ingreso' ? 'ingreso' : 'gasto',
  builtIn: r.predeterminada,
})

/* ---------- Envío de cambios (INSERT / UPDATE / DELETE) ---------- */

/** Clave igual a la columna generada nombre_clave = lower(btrim(nombre)). */
const categoryKey = (nombre: string) => nombre.trim().toLowerCase()

/** La categoría ya existía en la base de datos con otro id: se usa el de la base de datos. */
function remapCategory(fromId: string, toId: string) {
  categoriesStore.set((list) => {
    const target = list.find((c) => c.id === toId)
    return target ? list.filter((c) => c.id !== fromId) : list.map((c) => (c.id === fromId ? { ...c, id: toId } : c))
  })
  transactionsStore.set((list) => list.map((t) => (t.categoryId === fromId ? { ...t, categoryId: toId } : t)))
  sync.outbox.set((list) =>
    list.map((op) => (op.row && op.row.categoria_id === fromId ? { ...op, row: { ...op.row, categoria_id: toId } } : op)),
  )
}

async function push(ops: PendingOp[]): Promise<PushResult> {
  if (!supabase) return { kind: 'retry', message: 'Supabase no está configurado' }
  const [op] = ops

  if (op.table === 'cg_categorias' && op.action === 'upsert' && op.row) {
    const row = op.row as CategoriaRow
    const { error } = await supabase.from('cg_categorias').upsert(row, { onConflict: 'id' })
    if (error?.code === '23505') {
      // Ya existe una categoría con ese nombre y tipo: se reutiliza.
      const found = await supabase
        .from('cg_categorias')
        .select('id')
        .eq('tipo', row.tipo)
        .eq('nombre_clave', categoryKey(row.nombre))
        .single()
      if (found.error) return classifyError(found.error)
      remapCategory(row.id, found.data.id)
      return { kind: 'ok' }
    }
    return classifyError(error)
  }

  if (op.table === 'cg_categorias' && op.action === 'delete' && op.id) {
    const { error } = await supabase.from('cg_categorias').delete().eq('id', op.id)
    return classifyError(error)
  }

  if (op.table === 'cg_movimientos' && op.action === 'upsert') {
    const rows = ops.map((o) => o.row as MovimientoRow)
    const { error } = await supabase.from('cg_movimientos').upsert(rows, { onConflict: 'id' })
    return classifyError(error)
  }

  if (op.table === 'cg_movimientos' && op.action === 'delete' && op.id) {
    const { error } = await supabase.from('cg_movimientos').delete().eq('id', op.id)
    return classifyError(error)
  }

  if (op.table === 'cg_movimientos' && op.action === 'deleteAll') {
    // Supabase exige un filtro en DELETE; este abarca todas las filas.
    const { error } = await supabase.from('cg_movimientos').delete().gte('fecha', '1900-01-01')
    return classifyError(error)
  }

  return { kind: 'drop', message: `Operación desconocida en ${op.table}` }
}

/* ---------- Consulta (SELECT) ---------- */

async function pull(): Promise<PushResult> {
  if (!supabase) return { kind: 'retry', message: 'Supabase no está configurado' }
  const [categorias, movimientos] = await Promise.all([
    supabase.from('cg_categorias').select('id, nombre, icono, tipo, predeterminada').order('creado_en'),
    supabase
      .from('cg_movimientos')
      .select('id, tipo, monto, categoria_id, descripcion, fecha, creado_en')
      .order('fecha', { ascending: false }),
  ])
  if (categorias.error) return classifyError(categorias.error)
  if (movimientos.error) return classifyError(movimientos.error)
  if (sync.outbox.get().length > 0) return { kind: 'ok' }
  if (categorias.data.length > 0) categoriesStore.set(categorias.data.map(fromCategoriaRow))
  transactionsStore.set(movimientos.data.map(fromMovimientoRow))
  return { kind: 'ok' }
}

export const sync = createSyncEngine({ storageKey: KEY, batchable: ['cg_movimientos'], push, pull })

/* ---------- Consultas para las gráficas y el saldo (vistas de la base de datos) ---------- */

/** Ingresos y gastos por mes, calculados por la vista cg_resumen_mensual. */
export async function fetchMonthlySeries(months: string[]): Promise<MonthPoint[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('cg_resumen_mensual').select('mes, ingresos, gastos').in('mes', months)
  if (error) return null
  const byMonth = new Map(data.map((r) => [r.mes, r]))
  return months.map((key) => {
    const r = byMonth.get(key)
    const ingresos = Math.round(Number(r?.ingresos ?? 0) * 100)
    const gastos = Math.round(Number(r?.gastos ?? 0) * 100)
    return { key, ingresos, gastos, saldo: ingresos - gastos }
  })
}

/** Total por categoría de un mes, calculado por la vista cg_totales_por_categoria. */
export async function fetchCategoryTotals(month: string, type: TxType): Promise<CategoryShare[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('cg_totales_por_categoria')
    .select('categoria_id, nombre, icono, total, movimientos')
    .eq('mes', month)
    .eq('tipo', type)
    .order('total', { ascending: false })
  if (error) return null
  const sum = data.reduce((s, r) => s + Number(r.total ?? 0), 0)
  return data.map((r) => ({
    category: { id: r.categoria_id ?? '', name: r.nombre ?? '', icon: r.icono ?? '❔', type },
    amount: Math.round(Number(r.total ?? 0) * 100),
    count: Number(r.movimientos ?? 0),
    share: sum ? Number(r.total ?? 0) / sum : 0,
  }))
}

/** Saldo disponible calculado por la vista cg_saldo. */
export async function fetchBalance(): Promise<number | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('cg_saldo').select('saldo').single()
  if (error) return null
  return Math.round(Number(data.saldo ?? 0) * 100)
}

/* ---------- Acciones que usa la interfaz ---------- */

export function saveTransaction(draft: TransactionDraft, original: Transaction | null): void {
  const tx: Transaction = original ? { ...original, ...draft } : { ...draft, id: createId(), createdAt: Date.now() }
  transactionsStore.set((list) => (original ? list.map((t) => (t.id === tx.id ? tx : t)) : [...list, tx]))
  sync.queue({ table: 'cg_movimientos', action: 'upsert', id: tx.id, row: toMovimientoRow(tx) })
}

export function deleteTransaction(id: string): Transaction | null {
  const tx = transactionsStore.get().find((t) => t.id === id)
  if (!tx) return null
  transactionsStore.set((list) => list.filter((t) => t.id !== id))
  sync.queue({ table: 'cg_movimientos', action: 'delete', id })
  return tx
}

export function restoreTransaction(tx: Transaction): void {
  transactionsStore.set((list) => [...list, tx])
  sync.queue({ table: 'cg_movimientos', action: 'upsert', id: tx.id, row: toMovimientoRow(tx) })
}

export function addCategory(c: Omit<Category, 'id'>): void {
  const category: Category = { ...c, name: cleanText(c.name), id: createId(), builtIn: false }
  categoriesStore.set((list) => [...list, category])
  sync.queue({ table: 'cg_categorias', action: 'upsert', id: category.id, row: toCategoriaRow(category) })
}

/** Elimina una categoría propia; sus movimientos pasan a "Otros gastos" u "Otros ingresos". */
export function deleteCategory(id: string): void {
  const cat = categoriesStore.get().find((c) => c.id === id)
  if (!cat || cat.builtIn) return
  const fallback = FALLBACK_CATEGORY[cat.type]
  const moved = transactionsStore.get().filter((t) => t.categoryId === id).map((t) => ({ ...t, categoryId: fallback }))
  transactionsStore.set((list) => list.map((t) => moved.find((m) => m.id === t.id) ?? t))
  moved.forEach((t) => sync.queue({ table: 'cg_movimientos', action: 'upsert', id: t.id, row: toMovimientoRow(t) }))
  categoriesStore.set((list) => list.filter((c) => c.id !== id))
  sync.queue({ table: 'cg_categorias', action: 'delete', id })
}

/** Importa un respaldo: agrega o actualiza categorías y movimientos en la base de datos. */
export function importData(categories: Category[], transactions: Transaction[]): void {
  const custom = categories.filter((c) => !c.builtIn)
  categoriesStore.set((list) => {
    const ids = new Set(list.map((c) => c.id))
    return [...list, ...custom.filter((c) => !ids.has(c.id))]
  })
  custom.forEach((c) => sync.queue({ table: 'cg_categorias', action: 'upsert', id: c.id, row: toCategoriaRow(c) }))
  transactionsStore.set((list) => {
    const incoming = new Map(transactions.map((t) => [t.id, t]))
    return [...list.filter((t) => !incoming.has(t.id)), ...transactions]
  })
  transactions.forEach((t) => sync.queue({ table: 'cg_movimientos', action: 'upsert', id: t.id, row: toMovimientoRow(t) }))
}

export function addTransactions(list: Transaction[]): void {
  transactionsStore.set((current) => [...current, ...list])
  list.forEach((t) => sync.queue({ table: 'cg_movimientos', action: 'upsert', id: t.id, row: toMovimientoRow(t) }))
}

export function clearTransactions(): void {
  transactionsStore.set([])
  sync.outbox.set((list) => list.filter((o) => o.table !== 'cg_movimientos'))
  sync.queue({ table: 'cg_movimientos', action: 'deleteAll' })
}

/* ---------- Migración de los datos de la versión anterior (solo localStorage) ---------- */

export function migrateFromV1(): void {
  const OLD_TX = `${KEY}:movimientos:v1`
  const OLD_CAT = `${KEY}:categorias:v1`
  try {
    if (localStorage.getItem(`${KEY}:movimientos:v2`) !== null) return
    const rawTx = localStorage.getItem(OLD_TX)
    if (!rawTx) return
    const rawCat = localStorage.getItem(OLD_CAT)

    // Categorías propias de la versión anterior
    const idMap = new Map<string, string>()
    const oldCats: unknown = rawCat ? JSON.parse(rawCat) : []
    if (Array.isArray(oldCats)) {
      for (const c of oldCats as Record<string, unknown>[]) {
        if (c.builtIn || typeof c.id !== 'string' || typeof c.name !== 'string') continue
        const type: TxType = c.type === 'ingreso' ? 'ingreso' : 'gasto'
        const id = isUuid(c.id) ? c.id : createId()
        idMap.set(c.id, id)
        const category: Category = { id, name: cleanText(c.name).slice(0, 30), icon: typeof c.icon === 'string' ? c.icon : '⭐', type }
        categoriesStore.set((list) => [...list, category])
        sync.queue({ table: 'cg_categorias', action: 'upsert', id, row: toCategoriaRow(category) })
      }
    }

    // Movimientos
    const oldTx: unknown = JSON.parse(rawTx)
    if (Array.isArray(oldTx)) {
      const migrated: Transaction[] = []
      for (const t of oldTx as Record<string, unknown>[]) {
        if (typeof t.amount !== 'number' || t.amount <= 0 || typeof t.date !== 'string' || typeof t.categoryId !== 'string') continue
        const type: TxType = t.type === 'ingreso' ? 'ingreso' : 'gasto'
        const categoryId = idMap.get(t.categoryId) ?? legacyCategoryId(t.categoryId)
        migrated.push({
          id: isUuid(t.id) ? t.id : createId(),
          type,
          amount: Math.round(t.amount),
          categoryId: isUuid(categoryId) ? categoryId : FALLBACK_CATEGORY[type],
          description: typeof t.description === 'string' ? t.description.slice(0, 80) : '',
          date: t.date,
          createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        })
      }
      addTransactions(migrated)
    }
    localStorage.setItem(`${OLD_TX}:migrado`, rawTx)
    localStorage.removeItem(OLD_TX)
    localStorage.removeItem(OLD_CAT)
  } catch {
    /* si algo falla se conserva la versión anterior */
  }
}
