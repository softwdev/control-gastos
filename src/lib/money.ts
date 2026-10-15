const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 })

/** Centavos → "$1,234.50" */
export const formatMoney = (cents: number) => currency.format(cents / 100)

/** Centavos → "$1.2 k" para ejes de gráficas */
export const formatCompact = (cents: number) => `$${compact.format(cents / 100)}`

/** "1,234.5" → 123450 centavos. Devuelve NaN si no es válido. */
export function parseMoney(text: string): number {
  const clean = text.replace(/[$\s,]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return Number.NaN
  return Math.round(Number(clean) * 100)
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, '')
