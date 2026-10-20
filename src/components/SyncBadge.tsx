import type { SyncEngine } from '../lib/sync'
import { useSync } from '../lib/sync'

const timeFormat = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })

/** Muestra si los datos ya están guardados en Supabase o si hay cambios por subir. */
export function SyncBadge({ engine }: { engine: SyncEngine }) {
  const { status, pending, lastSync, message } = useSync(engine)

  let tone = 'ok'
  let text: string
  if (status === 'disabled') {
    tone = 'warn'
    text = 'Solo en este dispositivo: falta configurar Supabase'
  } else if (status === 'syncing') {
    text = 'Sincronizando con la base de datos…'
  } else if (status === 'offline') {
    tone = 'warn'
    text = pending > 0 ? `Sin conexión: ${pending} ${pending === 1 ? 'cambio' : 'cambios'} por subir` : 'Sin conexión: mostrando datos guardados'
  } else if (status === 'error') {
    tone = 'error'
    text = message ?? 'No se pudo sincronizar'
  } else if (pending > 0) {
    text = `${pending} ${pending === 1 ? 'cambio' : 'cambios'} por subir`
  } else {
    text = lastSync ? `Guardado en Supabase a las ${timeFormat.format(lastSync)}` : 'Conectando con la base de datos…'
  }

  return (
    <div className={`sync sync--${tone}`} role="status">
      <span className={`sync__dot ${status === 'syncing' ? 'is-spinning' : ''}`} aria-hidden="true" />
      <span className="sync__text">{text}</span>
      {status !== 'disabled' && status !== 'syncing' && (
        <button type="button" className="sync__btn" onClick={() => void engine.sync()}>
          Sincronizar
        </button>
      )}
    </div>
  )
}
