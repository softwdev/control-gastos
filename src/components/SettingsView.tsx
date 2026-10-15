import { useRef, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/dates'
import { isCategoryList, isTransactionList } from '../lib/stats'
import type { Category, Transaction, TxType } from '../types'

interface Props {
  categories: Category[]
  transactions: Transaction[]
  onAddCategory: (c: Omit<Category, 'id'>) => void
  onDeleteCategory: (id: string) => void
  onImport: (data: { categories: Category[]; transactions: Transaction[] }) => void
  onClear: () => void
}

const ICONS = ['🍕', '☕', '🚗', '🏋️', '🎵', '🐶', '🎁', '✈️', '💻', '🧾', '🛒', '🖨️', '💡', '🏦', '⭐']

export function SettingsView({ categories, transactions, onAddCategory, onDeleteCategory, onImport, onClear }: Props) {
  const [type, setType] = useState<TxType>('gasto')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICONS[0])
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const usage = new Map<string, number>()
  for (const t of transactions) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return setError('Escribe el nombre de la categoría.')
    if (categories.some((c) => c.type === type && c.name.toLocaleLowerCase('es') === clean.toLocaleLowerCase('es')))
      return setError('Ya existe una categoría con ese nombre.')
    onAddCategory({ name: clean, icon, type })
    setName('')
    setError('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), categories, transactions }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `control-gastos-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text())
      const obj = data as { categories?: unknown; transactions?: unknown }
      if (!isCategoryList(obj.categories) || !isTransactionList(obj.transactions)) throw new Error('formato')
      onImport({ categories: obj.categories, transactions: obj.transactions })
      setMessage(`Se importaron ${obj.transactions.length} movimientos.`)
    } catch {
      setMessage('El archivo no es un respaldo válido de Control de gastos.')
    }
  }

  return (
    <div className="view">
      <h1 className="view__title">Categorías y datos</h1>

      <section className="card">
        <header className="card__head">
          <h2>Categorías</h2>
          <div className="chips" role="group" aria-label="Tipo de categoría">
            {(['gasto', 'ingreso'] as const).map((t) => (
              <button key={t} type="button" className="chip chip--small" aria-pressed={type === t} onClick={() => setType(t)}>
                {t === 'gasto' ? 'De gasto' : 'De ingreso'}
              </button>
            ))}
          </div>
        </header>

        <ul className="cat-list">
          {categories
            .filter((c) => c.type === type)
            .map((c) => (
              <li key={c.id}>
                <span className="cat-list__icon" aria-hidden="true">{c.icon}</span>
                <span className="cat-list__name">
                  {c.name}
                  <span className="muted small">{usage.get(c.id) ?? 0} movimientos</span>
                </span>
                {!c.builtIn &&
                  (confirmId === c.id ? (
                    <span className="confirm">
                      <button type="button" className="btn btn--small btn--danger" onClick={() => onDeleteCategory(c.id)}>
                        Eliminar
                      </button>
                      <button type="button" className="btn btn--small btn--ghost" onClick={() => setConfirmId(null)}>
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => setConfirmId(c.id)} aria-label={`Eliminar categoría ${c.name}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></svg>
                    </button>
                  ))}
              </li>
            ))}
        </ul>
        {confirmId && (
          <p className="muted small">Los movimientos de esa categoría pasarán a “{type === 'gasto' ? 'Otros gastos' : 'Otros ingresos'}”.</p>
        )}

        <form className="cat-form" onSubmit={submit}>
          <h3>Nueva categoría {type === 'gasto' ? 'de gasto' : 'de ingreso'}</h3>
          <div className="icon-pick" role="radiogroup" aria-label="Ícono">
            {ICONS.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={icon === i} className="icon-pick__btn" onClick={() => setIcon(i)}>
                {i}
              </button>
            ))}
          </div>
          <div className="cat-form__row">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre, por ejemplo Café" maxLength={30} aria-label="Nombre de la categoría" />
            <button type="submit" className="btn btn--primary">Agregar</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="card">
        <header className="card__head">
          <h2>Respaldo de datos</h2>
        </header>
        <p className="muted">
          Tus movimientos se guardan solo en este navegador. Descarga un respaldo para pasarlos a otro dispositivo o no perderlos si borras los datos del navegador.
        </p>
        <div className="actions-row">
          <button type="button" className="btn btn--ghost" onClick={exportData} disabled={transactions.length === 0}>Descargar respaldo</button>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>Importar respaldo</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importData(file)
              e.target.value = ''
            }}
          />
          {confirmClear ? (
            <span className="confirm">
              <button type="button" className="btn btn--danger" onClick={() => { onClear(); setConfirmClear(false); setMessage('Se borraron todos los movimientos.') }}>
                Sí, borrar todo
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmClear(false)}>Cancelar</button>
            </span>
          ) : (
            <button type="button" className="btn btn--danger-text" onClick={() => setConfirmClear(true)} disabled={transactions.length === 0}>
              Borrar todos los movimientos
            </button>
          )}
        </div>
        {message && <p className="notice" role="status">{message}</p>}
      </section>
    </div>
  )
}
