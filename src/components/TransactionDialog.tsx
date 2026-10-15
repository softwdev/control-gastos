import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/dates'
import { centsToInput, parseMoney } from '../lib/money'
import type { Category, Transaction, TransactionDraft, TxType } from '../types'

interface Props {
  open: boolean
  transaction: Transaction | null
  initialType: TxType
  categories: Category[]
  onSave: (draft: TransactionDraft) => void
  onDelete: (id: string) => void
  onClose: () => void
}

interface FormState {
  type: TxType
  amount: string
  categoryId: string
  description: string
  date: string
}

export function TransactionDialog({ open, transaction, initialType, categories, onSave, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const [form, setForm] = useState<FormState>({ type: 'gasto', amount: '', categoryId: '', description: '', date: todayISO() })
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      setForm(
        transaction
          ? {
              type: transaction.type,
              amount: centsToInput(transaction.amount),
              categoryId: transaction.categoryId,
              description: transaction.description,
              date: transaction.date,
            }
          : { type: initialType, amount: '', categoryId: '', description: '', date: todayISO() },
      )
      setError('')
      if (!dialog.open) dialog.showModal()
      requestAnimationFrame(() => amountRef.current?.focus())
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open, transaction, initialType])

  const options = categories.filter((c) => c.type === form.type)

  const setType = (type: TxType) => setForm((f) => ({ ...f, type, categoryId: f.type === type ? f.categoryId : '' }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const amount = parseMoney(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Escribe un monto mayor a cero, por ejemplo 150 o 89.50.')
    if (!form.categoryId) return setError('Elige una categoría.')
    if (!form.date) return setError('Elige la fecha.')
    onSave({
      type: form.type,
      amount,
      categoryId: form.categoryId,
      description: form.description.trim(),
      date: form.date,
    })
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={`${uid}-title`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="sheet__body" onSubmit={submit} noValidate>
        <header className="sheet__header">
          <h2 id={`${uid}-title`}>{transaction ? 'Editar movimiento' : 'Registrar movimiento'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="type-toggle" role="radiogroup" aria-label="Tipo de movimiento">
          {(['gasto', 'ingreso'] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={form.type === t}
              className={`type-toggle__btn type-toggle__btn--${t}`}
              onClick={() => setType(t)}
            >
              {t === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>

        <label className="field amount-field">
          <span>Monto</span>
          <div className="amount-input">
            <span aria-hidden="true">$</span>
            <input
              ref={amountRef}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <span className="amount-input__cur">MXN</span>
          </div>
        </label>

        <fieldset className="field">
          <legend>Categoría</legend>
          <div className="cat-grid">
            {options.map((c) => (
              <label key={c.id} className="cat-opt">
                <input
                  type="radio"
                  name={`${uid}-cat`}
                  value={c.id}
                  checked={form.categoryId === c.id}
                  onChange={() => setForm((f) => ({ ...f, categoryId: c.id }))}
                />
                <span>
                  <span className="cat-opt__icon" aria-hidden="true">{c.icon}</span>
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <label className="field">
            <span>Descripción (opcional)</span>
            <input
              value={form.description}
              maxLength={80}
              placeholder={form.type === 'gasto' ? 'Ej. Comida en la cafetería' : 'Ej. Pago de beca'}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={form.date} max="2100-12-31" onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </label>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <footer className="sheet__footer">
          {transaction && (
            <button type="button" className="btn btn--danger-text" onClick={() => onDelete(transaction.id)}>
              Eliminar
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary">{transaction ? 'Guardar cambios' : 'Guardar'}</button>
        </footer>
      </form>
    </dialog>
  )
}
