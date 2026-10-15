import { currentMonth, formatMonthLong, shiftMonth } from '../lib/dates'

interface Props {
  value: string
  onChange: (key: string) => void
}

export function MonthSwitcher({ value, onChange }: Props) {
  const isCurrent = value >= currentMonth()
  return (
    <div className="month-switch">
      <button type="button" className="icon-btn" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Mes anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <span className="month-switch__label" aria-live="polite">{formatMonthLong(value)}</span>
      <button type="button" className="icon-btn" onClick={() => onChange(shiftMonth(value, 1))} disabled={isCurrent} aria-label="Mes siguiente">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  )
}
