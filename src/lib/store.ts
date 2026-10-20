import { useSyncExternalStore } from 'react'

/**
 * Almacén de datos guardado en localStorage.
 * Es la copia local de la base de datos: la interfaz siempre lee de aquí,
 * por eso la app funciona igual con o sin conexión.
 */
export interface Store<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(key: string, initial: T, parse?: (value: unknown) => T | null): Store<T> {
  const listeners = new Set<() => void>()

  const read = (): T => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
      if (raw === null) return initial
      const parsed: unknown = JSON.parse(raw)
      const clean = parse ? parse(parsed) : (parsed as T)
      if (clean !== null) return clean
    } catch {
      /* JSON dañado */
    }
    try {
      // Se respalda lo que no se pudo leer en lugar de perderlo.
      if (raw !== null) localStorage.setItem(`${key}:respaldo`, raw)
    } catch {
      /* sin espacio */
    }
    return initial
  }

  let value = read()

  const emit = () => listeners.forEach((l) => l())

  const set: Store<T>['set'] = (next) => {
    value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* almacenamiento lleno: se mantiene en memoria */
    }
    emit()
  }

  // Otra pestaña de la misma app cambió los datos.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== key) return
      value = read()
      emit()
    })
  }

  return {
    get: () => value,
    set,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
