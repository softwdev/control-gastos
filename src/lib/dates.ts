export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => toISO(new Date())

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** "2026-10-15" → "2026-10" */
export const monthKey = (iso: string) => iso.slice(0, 7)
export const currentMonth = () => monthKey(todayISO())

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Lista de meses terminando en `end` (inclusive) */
export function lastMonths(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(end, i - count + 1))
}

const monthLong = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' })
const monthShort = new Intl.DateTimeFormat('es-MX', { month: 'short' })
const dayLong = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatMonthLong = (key: string) => cap(monthLong.format(parseISO(`${key}-01`)))
export const formatMonthShort = (key: string) => cap(monthShort.format(parseISO(`${key}-01`)).replace('.', ''))

export function formatDay(iso: string): string {
  const today = todayISO()
  const yesterday = toISO(new Date(Date.now() - 86_400_000))
  if (iso === today) return 'Hoy'
  if (iso === yesterday) return 'Ayer'
  const text = cap(dayLong.format(parseISO(iso)))
  return iso.slice(0, 4) === today.slice(0, 4) ? text : `${text} de ${iso.slice(0, 4)}`
}
