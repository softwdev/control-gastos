import { createId } from './id'
import { createStore, useStore, type Store } from './store'
import { supabaseConfigured } from './supabase'

/**
 * Un cambio hecho en el dispositivo que todavía no se guarda en Supabase.
 * Los cambios se guardan en una cola (outbox) y se envían en orden cuando hay conexión.
 */
export interface PendingOp {
  opId: string
  table: string
  action: 'upsert' | 'delete' | 'deleteAll'
  /** id del registro afectado (upsert y delete) */
  id?: string
  /** fila con los nombres de columna de la base de datos (upsert) */
  row?: Record<string, unknown>
  at: number
}

/** Resultado de enviar un grupo de cambios. */
export type PushResult = { kind: 'ok' } | { kind: 'retry'; message: string } | { kind: 'drop'; message: string }

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSync: number | null
  message: string | null
}

export interface SyncEngine {
  outbox: Store<PendingOp[]>
  state: Store<SyncState>
  /** Agrega un cambio a la cola y programa la sincronización. */
  queue: (op: Omit<PendingOp, 'opId' | 'at'>) => void
  /** Envía los cambios pendientes y descarga los datos actuales de Supabase. */
  sync: () => Promise<void>
  /** Empieza a sincronizar: al abrir, al recuperar la conexión y cada 30 segundos. */
  start: () => void
}

const isOp = (v: unknown): v is PendingOp =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as PendingOp).opId === 'string' &&
  typeof (v as PendingOp).table === 'string' &&
  ['upsert', 'delete', 'deleteAll'].includes((v as PendingOp).action)

/** Clasifica un error de Supabase: sin red se reintenta; un error de la base de datos no. */
export function classifyError(error: { code?: string; message?: string } | null): PushResult {
  if (!error) return { kind: 'ok' }
  const message = error.message ?? 'Error desconocido'
  const isNetwork = !error.code || /fetch|network|load failed|timeout/i.test(message)
  return isNetwork ? { kind: 'retry', message } : { kind: 'drop', message }
}

interface EngineOptions {
  /** Prefijo de las claves de localStorage */
  storageKey: string
  /** Tablas cuyos upserts consecutivos se pueden mandar juntos en una sola petición */
  batchable: string[]
  /** Envía un grupo de cambios a Supabase */
  push: (ops: PendingOp[]) => Promise<PushResult>
  /** Descarga los datos de Supabase y reemplaza la copia local */
  pull: () => Promise<PushResult>
}

export function createSyncEngine({ storageKey, batchable, push, pull }: EngineOptions): SyncEngine {
  const outbox = createStore<PendingOp[]>(`${storageKey}:pendientes`, [], (v) => (Array.isArray(v) ? v.filter(isOp) : null))
  const state = createStore<SyncState>(`${storageKey}:sync`, { status: 'idle', lastSync: null, message: null }, (v) =>
    typeof v === 'object' && v !== null ? (v as SyncState) : null,
  )

  let running = false
  let again = false
  let timer: number | undefined

  const setState = (patch: Partial<SyncState>) => state.set((s) => ({ ...s, ...patch }))

  const queue: SyncEngine['queue'] = (op) => {
    outbox.set((list) => {
      // Si ya hay un cambio pendiente del mismo registro, se reemplaza (solo importa el último estado).
      if (op.action === 'upsert' && op.id) {
        const i = list.findIndex((o) => o.action === 'upsert' && o.table === op.table && o.id === op.id)
        if (i !== -1) {
          const copy = [...list]
          copy[i] = { ...copy[i], row: op.row, at: Date.now() }
          return copy
        }
      }
      // Al borrar, los cambios pendientes de ese registro ya no sirven.
      const rest = op.action === 'delete' ? list.filter((o) => !(o.table === op.table && o.id === op.id && o.action === 'upsert')) : list
      return [...rest, { ...op, opId: createId(), at: Date.now() }]
    })
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void sync(), 400)
  }

  /** Toma el siguiente grupo: varios upserts seguidos de la misma tabla viajan juntos. */
  const nextGroup = (list: PendingOp[]): PendingOp[] => {
    const first = list[0]
    if (first.action !== 'upsert' || !batchable.includes(first.table)) return [first]
    const group = [first]
    for (const op of list.slice(1)) {
      if (op.action !== 'upsert' || op.table !== first.table || group.length >= 200) break
      group.push(op)
    }
    return group
  }

  const sync = async () => {
    if (!supabaseConfigured) {
      setState({ status: 'disabled', message: null })
      return
    }
    if (running) {
      again = true
      return
    }
    if (!navigator.onLine) {
      setState({ status: 'offline', message: null })
      return
    }
    running = true
    setState({ status: 'syncing' })
    let dropped: string | null = null
    try {
      // 1. Enviar los cambios pendientes, en orden.
      while (outbox.get().length > 0) {
        const group = nextGroup(outbox.get())
        const result = await push(group)
        if (result.kind === 'retry') {
          setState({ status: 'offline', message: result.message })
          return
        }
        if (result.kind === 'drop') dropped = result.message
        const sent = new Set(group.map((o) => o.opId))
        outbox.set((list) => list.filter((o) => !sent.has(o.opId)))
      }
      // 2. Descargar el estado actual de la base de datos.
      const pulled = await pull()
      if (pulled.kind === 'retry') {
        setState({ status: 'offline', message: pulled.message })
        return
      }
      if (pulled.kind === 'drop') dropped = pulled.message
      setState({
        status: dropped ? 'error' : 'idle',
        lastSync: Date.now(),
        message: dropped ? `La base de datos rechazó un cambio: ${dropped}` : null,
      })
    } catch (error) {
      setState({ status: 'offline', message: error instanceof Error ? error.message : String(error) })
    } finally {
      running = false
      if (again) {
        again = false
        void sync()
      }
    }
  }

  let started = false
  const start = () => {
    if (started) return
    started = true
    void sync()
    window.addEventListener('online', () => void sync())
    window.addEventListener('offline', () => setState({ status: 'offline' }))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void sync()
    })
    window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync()
    }, 30_000)
  }

  return { outbox, state, queue, sync, start }
}

export function useSync(engine: SyncEngine) {
  const state = useStore(engine.state)
  const pending = useStore(engine.outbox).length
  return { ...state, pending }
}
