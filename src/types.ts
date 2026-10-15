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

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', icon: '🍽️', type: 'gasto', builtIn: true },
  { id: 'transporte', name: 'Transporte', icon: '🚌', type: 'gasto', builtIn: true },
  { id: 'escuela', name: 'Escuela y materiales', icon: '📚', type: 'gasto', builtIn: true },
  { id: 'vivienda', name: 'Renta y servicios', icon: '🏠', type: 'gasto', builtIn: true },
  { id: 'celular', name: 'Celular e internet', icon: '📱', type: 'gasto', builtIn: true },
  { id: 'salud', name: 'Salud', icon: '🩺', type: 'gasto', builtIn: true },
  { id: 'ocio', name: 'Entretenimiento', icon: '🎮', type: 'gasto', builtIn: true },
  { id: 'ropa', name: 'Ropa y cuidado personal', icon: '👕', type: 'gasto', builtIn: true },
  { id: 'otros-gastos', name: 'Otros gastos', icon: '📦', type: 'gasto', builtIn: true },
  { id: 'trabajo', name: 'Trabajo', icon: '💼', type: 'ingreso', builtIn: true },
  { id: 'beca', name: 'Beca', icon: '🎓', type: 'ingreso', builtIn: true },
  { id: 'familia', name: 'Apoyo familiar', icon: '🤝', type: 'ingreso', builtIn: true },
  { id: 'otros-ingresos', name: 'Otros ingresos', icon: '💰', type: 'ingreso', builtIn: true },
]

export const FALLBACK_CATEGORY: Record<TxType, string> = {
  gasto: 'otros-gastos',
  ingreso: 'otros-ingresos',
}
