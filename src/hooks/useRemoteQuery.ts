import { useEffect, useState } from 'react'
import { sync } from '../data/gastos'
import { useSync } from '../lib/sync'

/**
 * Ejecuta una consulta en Supabase cuando la copia local está al día con la base de datos
 * (conexión disponible y sin cambios pendientes). Devuelve null si no se puede consultar:
 * en ese caso la pantalla usa el cálculo local con los datos guardados en el dispositivo.
 * Se vuelve a consultar después de cada sincronización.
 */
export function useRemoteQuery<T>(key: string, fetcher: () => Promise<T | null>): T | null {
  const { status, pending, lastSync } = useSync(sync)
  const [result, setResult] = useState<{ key: string; data: T } | null>(null)
  const ready = status === 'idle' && pending === 0 && lastSync !== null

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void fetcher().then((data) => {
      if (!cancelled && data !== null) setResult({ key, data })
    })
    return () => {
      cancelled = true
    }
    // fetcher cambia en cada render; la consulta depende de key y de la última sincronización
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, lastSync])

  return ready && result?.key === key ? result.data : null
}
