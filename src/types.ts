export type TxType = 'ingreso' | 'gasto'

export interface Category {
  id: string
  name: string
  icon: string
  type: TxType
  /** Las categorías predeterminadas no se pueden eliminar */
  builtIn?: boolean
}

export interface Transaction {
  id: string
  type: TxType
  /** Monto en centavos (entero) para evitar errores de redondeo */
  amount: number
  categoryId: string
  description: string
  /** Fecha AAAA-MM-DD */
  date: string
  createdAt: number
}

export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt'>

/** Mismos ids que las categorías predeterminadas de la tabla cg_categorias */
export const CATEGORY_IDS = {
  'comida': 'c0000000-0000-4000-8000-000000000001',
  'transporte': 'c0000000-0000-4000-8000-000000000002',
  'escuela': 'c0000000-0000-4000-8000-000000000003',
  'vivienda': 'c0000000-0000-4000-8000-000000000004',
  'celular': 'c0000000-0000-4000-8000-000000000005',
  'salud': 'c0000000-0000-4000-8000-000000000006',
  'ocio': 'c0000000-0000-4000-8000-000000000007',
  'ropa': 'c0000000-0000-4000-8000-000000000008',
  'otros-gastos': 'c0000000-0000-4000-8000-000000000009',
  'trabajo': 'c0000000-0000-4000-8000-000000000010',
  'beca': 'c0000000-0000-4000-8000-000000000011',
  'familia': 'c0000000-0000-4000-8000-000000000012',
  'otros-ingresos': 'c0000000-0000-4000-8000-000000000013',
} as const

/** Versión anterior: las categorías predeterminadas usaban estos nombres como id. */
export const legacyCategoryId = (id: string): string => (CATEGORY_IDS as Record<string, string>)[id] ?? id

export const DEFAULT_CATEGORIES: Category[] = [
  { id: CATEGORY_IDS['comida'], name: 'Comida', icon: '🍽️', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['transporte'], name: 'Transporte', icon: '🚌', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['escuela'], name: 'Escuela y materiales', icon: '📚', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['vivienda'], name: 'Renta y servicios', icon: '🏠', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['celular'], name: 'Celular e internet', icon: '📱', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['salud'], name: 'Salud', icon: '🩺', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['ocio'], name: 'Entretenimiento', icon: '🎮', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['ropa'], name: 'Ropa y cuidado personal', icon: '👕', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['otros-gastos'], name: 'Otros gastos', icon: '📦', type: 'gasto', builtIn: true },
  { id: CATEGORY_IDS['trabajo'], name: 'Trabajo', icon: '💼', type: 'ingreso', builtIn: true },
  { id: CATEGORY_IDS['beca'], name: 'Beca', icon: '🎓', type: 'ingreso', builtIn: true },
  { id: CATEGORY_IDS['familia'], name: 'Apoyo familiar', icon: '🤝', type: 'ingreso', builtIn: true },
  { id: CATEGORY_IDS['otros-ingresos'], name: 'Otros ingresos', icon: '💰', type: 'ingreso', builtIn: true },
]

export const FALLBACK_CATEGORY: Record<TxType, string> = {
  gasto: CATEGORY_IDS['otros-gastos'],
  ingreso: CATEGORY_IDS['otros-ingresos'],
}
