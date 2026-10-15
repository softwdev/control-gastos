import { useEffect, useState } from 'react'

/**
 * Estado de React sincronizado con localStorage.
 * Los datos se quedan en el dispositivo y están disponibles sin conexión.
 */
export function useLocalStorage<T>(key: string, initial: T, isValid?: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initial
      const parsed: unknown = JSON.parse(raw)
      if (isValid && !isValid(parsed)) return initial
      return parsed as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Almacenamiento lleno o bloqueado: la app sigue funcionando en memoria.
    }
  }, [key, value])

  // Mantiene varias pestañas abiertas sincronizadas.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return
      try {
        const parsed: unknown = JSON.parse(event.newValue)
        if (!isValid || isValid(parsed)) setValue(parsed as T)
      } catch {
        /* ignorar */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, isValid])

  return [value, setValue] as const
}
