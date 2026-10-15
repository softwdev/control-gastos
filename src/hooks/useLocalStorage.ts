import { useEffect, useState } from 'react'

/**
 * Estado de React sincronizado con localStorage.
 * Los datos se quedan en el dispositivo y están disponibles sin conexión.
 *
 * `parse` valida lo que se lee: devuelve los datos limpios, o null si no sirven.
 * Si no sirven, se guarda una copia del texto original en `<key>:respaldo`
 * antes de empezar con el valor inicial, para no perder información.
 */
export function useLocalStorage<T>(key: string, initial: T, parse?: (value: unknown) => T | null) {
  const [value, setValue] = useState<T>(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
      if (raw === null) return initial
      const parsed: unknown = JSON.parse(raw)
      if (!parse) return parsed as T
      const clean = parse(parsed)
      if (clean !== null) return clean
    } catch {
      /* JSON inválido */
    }
    try {
      if (raw !== null) localStorage.setItem(`${key}:respaldo`, raw)
    } catch {
      /* sin espacio */
    }
    return initial
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
        const clean = parse ? parse(parsed) : (parsed as T)
        if (clean !== null) setValue(clean)
      } catch {
        /* ignorar */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, parse])

  return [value, setValue] as const
}
