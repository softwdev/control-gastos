import { useEffect, useRef, useState } from 'react'
import { ChartsView } from './components/ChartsView'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { SummaryView } from './components/SummaryView'
import { TransactionDialog } from './components/TransactionDialog'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { currentMonth } from './lib/dates'
import { createId } from './lib/id'
import { sampleTransactions } from './lib/sample'
import { totals } from './lib/stats'
import { parseCategoryList, parseTransactionList } from './lib/validation'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY, type Category, type Transaction, type TransactionDraft, type TxType } from './types'

type View = 'resumen' | 'historial' | 'graficas' | 'ajustes'

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'resumen', label: 'Resumen', icon: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { id: 'historial', label: 'Historial', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'graficas', label: 'Gráficas', icon: 'M5 20V10M12 20V4M19 20v-7M3 20h18' },
  { id: 'ajustes', label: 'Categorías', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
]

export default function App() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('control-gastos:movimientos:v1', [], parseTransactionList)
  const [categories, setCategories] = useLocalStorage<Category[]>('control-gastos:categorias:v1', DEFAULT_CATEGORIES, parseCategoryList)
  const [view, setView] = useState<View>('resumen')
  const [month, setMonth] = useState(currentMonth)
  const [dialog, setDialog] = useState<{ open: boolean; tx: Transaction | null; type: TxType }>({ open: false, tx: null, type: 'gasto' })
  const [undo, setUndo] = useState<Transaction | null>(null)
  const undoTimer = useRef<number | undefined>(undefined)
  const online = useOnlineStatus()
  const { canInstall, install } = useInstallPrompt()

  useEffect(() => () => window.clearTimeout(undoTimer.current), [])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  const openNew = (type: TxType = 'gasto') => setDialog({ open: true, tx: null, type })
  const openEdit = (tx: Transaction) => setDialog({ open: true, tx, type: tx.type })
  const close = () => setDialog((d) => ({ ...d, open: false }))

  const save = (draft: TransactionDraft) => {
    if (dialog.tx) {
      const id = dialog.tx.id
      setTransactions((list) => list.map((t) => (t.id === id ? { ...t, ...draft } : t)))
    } else {
      setTransactions((list) => [...list, { ...draft, id: createId(), createdAt: Date.now() }])
    }
    close()
  }

  const remove = (id: string) => {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    setTransactions((list) => list.filter((t) => t.id !== id))
    close()
    setUndo(tx)
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  const restore = () => {
    if (undo) setTransactions((list) => [...list, undo])
    setUndo(null)
  }

  const addCategory = (c: Omit<Category, 'id'>) => setCategories((list) => [...list, { ...c, id: createId() }])

  const deleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat || cat.builtIn) return
    setTransactions((list) => list.map((t) => (t.categoryId === id ? { ...t, categoryId: FALLBACK_CATEGORY[cat.type] } : t)))
    setCategories((list) => list.filter((c) => c.id !== id))
  }

  const loadSample = () => setTransactions(sampleTransactions())

  return (
    <div className="app">
      <header className="top">
        <div className="top__inner">
          <div className="brand">
            <img src="./favicon.svg" alt="" width="32" height="32" />
            <span>Control de gastos</span>
          </div>
          <nav className="nav" aria-label="Secciones">
            {NAV.map((n) => (
              <button key={n.id} type="button" className="nav__btn" aria-current={view === n.id ? 'page' : undefined} onClick={() => setView(n.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={n.icon} /></svg>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="top__actions">
            {canInstall && (
              <button type="button" className="btn btn--ghost btn--on-dark" onClick={install}>Instalar app</button>
            )}
            <button type="button" className="btn btn--accent add-desktop" onClick={() => openNew()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Registrar movimiento
            </button>
          </div>
        </div>
      </header>

      {!online && (
        <div className="offline" role="status">
          Sin conexión. Tu historial está guardado en este dispositivo y puedes seguir registrando movimientos.
        </div>
      )}

      <main className="main">
        {view === 'resumen' &&
          (transactions.length === 0 ? (
            <div className="view">
              <section className="balance">
                <p className="balance__label">Saldo disponible</p>
                <p className="balance__amount">$0.00</p>
                <p className="balance__hint">Registra tus ingresos y gastos para ver tu saldo.</p>
              </section>
              <section className="card welcome">
                <h2>Empieza registrando tu primer movimiento</h2>
                <p className="muted">
                  Anota lo que recibes (beca, trabajo, apoyo familiar) y lo que gastas (comida, transporte, escuela). Todo se guarda en este dispositivo y funciona sin internet.
                </p>
                <div className="actions-row">
                  <button type="button" className="btn btn--primary" onClick={() => openNew('ingreso')}>Registrar ingreso</button>
                  <button type="button" className="btn btn--primary" onClick={() => openNew('gasto')}>Registrar gasto</button>
                  <button type="button" className="btn btn--ghost" onClick={loadSample}>Cargar datos de ejemplo</button>
                </div>
              </section>
            </div>
          ) : (
            <SummaryView
              transactions={transactions}
              categories={categories}
              month={month}
              onMonth={setMonth}
              onSelect={openEdit}
              onGo={setView}
            />
          ))}
        {view === 'historial' && <HistoryView transactions={transactions} categories={categories} onSelect={openEdit} />}
        {view === 'graficas' && <ChartsView transactions={transactions} categories={categories} month={month} onMonth={setMonth} />}
        {view === 'ajustes' && (
          <SettingsView
            categories={categories}
            transactions={transactions}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            onImport={(data) => {
              setCategories(data.categories)
              setTransactions(data.transactions)
            }}
            onClear={() => setTransactions([])}
          />
        )}
      </main>

      <button type="button" className="fab" onClick={() => openNew()} aria-label="Registrar movimiento">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>

      <TransactionDialog
        open={dialog.open}
        transaction={dialog.tx}
        initialType={dialog.type}
        categories={categories}
        balance={totals(transactions.filter((t) => t.id !== dialog.tx?.id)).saldo}
        onSave={save}
        onDelete={remove}
        onClose={close}
      />

      {undo && (
        <div className="toast" role="status">
          <span>Se eliminó el movimiento.</span>
          <button type="button" onClick={restore}>Deshacer</button>
        </div>
      )}
    </div>
  )
}
