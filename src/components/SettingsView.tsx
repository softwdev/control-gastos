import { useRef, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/dates'
import { cleanText, LIMITS, validateBackup, validateCategoryName } from '../lib/validation'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY, type Category, type Transaction, type TxType } from '../types'

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
  const [nameTouched, setNameTouched] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const usage = new Map<string, number>()
  for (const t of transactions) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1)

  const nameError = validateCategoryName(name, type, categories)
  const showNameError = nameTouched ? nameError : undefined

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setNameTouched(true)
    if (nameError || !ICONS.includes(icon)) return
    onAddCategory({ name: cleanText(name), icon, type })
    setName('')
    setNameTouched(false)
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
    if (!file.name.toLowerCase().endsWith('.json')) return setMessage('Elige un archivo .json descargado desde esta app.')
    if (file.size > 5 * 1024 * 1024) return setMessage('El archivo es demasiado grande (máximo 5 MB).')
    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      return setMessage('El archivo está dañado o no es JSON.')
    }
    const result = validateBackup(data, FALLBACK_CATEGORY)
    if (!result.ok || !result.categories || !result.transactions) return setMessage(result.message)
    // Asegura que las categorías predeterminadas existan siempre.
    const ids = new Set(result.categories.map((c) => c.id))
    const categories = [...DEFAULT_CATEGORIES.filter((c) => !ids.has(c.id)), ...result.categories]
    onImport({ categories, transactions: result.transactions })
    setMessage(result.message)
  }

  return (
    <div className="view">
      <h1 className="view__title">Categorías y datos</h1>

      <section className="card">
        <header className="card__head">
          <h2>Categorías</h2>
          <div className="chips" role="group" aria-label="Tipo de categoría">
            {(['gasto', 'ingreso'] as const).map((t) => (
              <button key={t} type="button" className="chip chip--small" aria-pressed={type === t} onClick={() => { setType(t); setNameTouched(false) }}>
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

        <form className="cat-form" onSubmit={submit} noValidate>
          <h3>Nueva categoría {type === 'gasto' ? 'de gasto' : 'de ingreso'}</h3>
          <div className="icon-pick" role="radiogroup" aria-label="Ícono">
            {ICONS.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={icon === i} className="icon-pick__btn" onClick={() => setIcon(i)}>
                {i}
              </button>
            ))}
          </div>
          <div className="cat-form__row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name && setNameTouched(true)}
              placeholder="Nombre, por ejemplo Café"
              maxLength={LIMITS.categoryMax}
              aria-label="Nombre de la categoría"
              aria-invalid={!!showNameError}
              aria-describedby={showNameError ? 'cat-name-error' : undefined}
              required
            />
            <button type="submit" className="btn btn--primary">Agregar</button>
          </div>
          {showNameError && <small id="cat-name-error" className="field-error" role="alert">{showNameError}</small>}
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
