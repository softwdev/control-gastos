import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/dates'
import { centsToInput, formatMoney } from '../lib/money'
import {
  cleanText,
  LIMITS,
  parseAmount,
  sanitizeAmountInput,
  validateTransaction,
  type TransactionErrors,
  type TransactionForm,
} from '../lib/validation'
import type { Category, Transaction, TransactionDraft, TxType } from '../types'

interface Props {
  open: boolean
  transaction: Transaction | null
  initialType: TxType
  categories: Category[]
  /** Saldo disponible sin contar el movimiento que se edita */
  balance: number
  onSave: (draft: TransactionDraft) => void
  onDelete: (id: string) => void
  onClose: () => void
}

type Field = keyof TransactionForm
const FIELD_ORDER: Field[] = ['type', 'amount', 'categoryId', 'description', 'date']

export function TransactionDialog({ open, transaction, initialType, categories, balance, onSave, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const [form, setForm] = useState<TransactionForm>({ type: 'gasto', amount: '', categoryId: '', description: '', date: todayISO() })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

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
      setTouched({})
      setSubmitted(false)
      if (!dialog.open) dialog.showModal()
      requestAnimationFrame(() => amountRef.current?.focus())
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open, transaction, initialType])

  const errors: TransactionErrors = useMemo(() => validateTransaction(form, categories), [form, categories])
  const show = (field: Field) => (submitted || touched[field] ? errors[field] : undefined)
  const errorId = (field: Field) => `${uid}-${field}-error`
  const blur = (field: Field) => setTouched((t) => ({ ...t, [field]: true }))
  const set = <K extends Field>(key: K, value: TransactionForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const options = categories.filter((c) => c.type === form.type)
  const setType = (type: TxType) => setForm((f) => ({ ...f, type, categoryId: f.type === type ? f.categoryId : '' }))

  // Aviso (no bloquea): un gasto que deja el saldo en negativo.
  const cents = parseAmount(form.amount)
  const after = balance - (Number.isFinite(cents) ? cents : 0)
  const negativeWarning = form.type === 'gasto' && !errors.amount && after < 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = FIELD_ORDER.find((f) => errors[f])
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalid}"]`)?.focus()
      return
    }
    onSave({
      type: form.type,
      amount: parseAmount(form.amount),
      categoryId: form.categoryId,
      description: cleanText(form.description),
      date: form.date,
    })
  }

  const errorCount = submitted ? FIELD_ORDER.filter((f) => errors[f]).length : 0

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
      <form ref={formRef} className="sheet__body" onSubmit={submit} noValidate>
        <header className="sheet__header">
          <h2 id={`${uid}-title`}>{transaction ? 'Editar movimiento' : 'Registrar movimiento'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        {errorCount > 0 && (
          <p className="form-summary" role="alert">
            Revisa {errorCount === 1 ? 'el campo marcado' : `los ${errorCount} campos marcados`} antes de guardar.
          </p>
        )}

        <div className="type-toggle" role="radiogroup" aria-label="Tipo de movimiento">
          {(['gasto', 'ingreso'] as TxType[]).map((t, i) => (
            <button
              key={t}
              type="button"
              role="radio"
              data-field={i === 0 ? 'type' : undefined}
              aria-checked={form.type === t}
              className={`type-toggle__btn type-toggle__btn--${t}`}
              onClick={() => setType(t)}
            >
              {t === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        {show('type') && <small className="field-error">{show('type')}</small>}

        <label className="field amount-field">
          <span>Monto <abbr title="obligatorio">*</abbr></span>
          <div className={`amount-input ${show('amount') ? 'is-invalid' : ''}`}>
            <span aria-hidden="true">$</span>
            <input
              ref={amountRef}
              data-field="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              maxLength={13}
              value={form.amount}
              onChange={(e) => set('amount', sanitizeAmountInput(e.target.value))}
              onBlur={() => blur('amount')}
              required
              aria-invalid={!!show('amount')}
              aria-describedby={show('amount') ? errorId('amount') : negativeWarning ? `${uid}-warning` : undefined}
            />
            <span className="amount-input__cur">MXN</span>
          </div>
          {show('amount') && <small id={errorId('amount')} className="field-error">{show('amount')}</small>}
          {negativeWarning && (
            <small id={`${uid}-warning`} className="field-warning">
              Con este gasto tu saldo quedará en −{formatMoney(Math.abs(after))}. Puedes guardarlo de todos modos.
            </small>
          )}
        </label>

        <fieldset className="field" aria-describedby={show('categoryId') ? errorId('categoryId') : undefined}>
          <legend>Categoría <abbr title="obligatorio">*</abbr></legend>
          <div className={`cat-grid ${show('categoryId') ? 'is-invalid' : ''}`}>
            {options.map((c, i) => (
              <label key={c.id} className="cat-opt">
                <input
                  type="radio"
                  data-field={i === 0 ? 'categoryId' : undefined}
                  name={`${uid}-cat`}
                  value={c.id}
                  checked={form.categoryId === c.id}
                  onChange={() => set('categoryId', c.id)}
                  required
                />
                <span>
                  <span className="cat-opt__icon" aria-hidden="true">{c.icon}</span>
                  {c.name}
                </span>
              </label>
            ))}
          </div>
          {show('categoryId') && <small id={errorId('categoryId')} className="field-error">{show('categoryId')}</small>}
        </fieldset>

        <div className="field-row">
          <label className="field">
            <span>Descripción (opcional)</span>
            <input
              data-field="description"
              value={form.description}
              maxLength={LIMITS.descriptionMax}
              placeholder={form.type === 'gasto' ? 'Ej. Comida en la cafetería' : 'Ej. Pago de beca'}
              onChange={(e) => set('description', e.target.value)}
              onBlur={() => blur('description')}
              aria-invalid={!!show('description')}
              aria-describedby={show('description') ? errorId('description') : undefined}
            />
            {show('description') && <small id={errorId('description')} className="field-error">{show('description')}</small>}
          </label>
          <label className="field">
            <span>Fecha <abbr title="obligatorio">*</abbr></span>
            <input
              data-field="date"
              type="date"
              value={form.date}
              min={LIMITS.minDate}
              max={todayISO()}
              onChange={(e) => set('date', e.target.value)}
              onBlur={() => blur('date')}
              required
              aria-invalid={!!show('date')}
              aria-describedby={show('date') ? errorId('date') : undefined}
            />
            {show('date') && <small id={errorId('date')} className="field-error">{show('date')}</small>}
          </label>
        </div>

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
