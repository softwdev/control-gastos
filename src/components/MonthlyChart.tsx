import { useState } from 'react'
import { useElementWidth } from '../hooks/useElementWidth'
import { formatMonthLong, formatMonthShort } from '../lib/dates'
import { formatCompact, formatMoney } from '../lib/money'
import type { MonthPoint } from '../lib/stats'

interface Props {
  data: MonthPoint[]
  selected?: string
  onSelect?: (key: string) => void
}

const HEIGHT = 240
const M = { top: 12, right: 8, bottom: 28, left: 52 }

function niceMax(value: number): { max: number; step: number } {
  if (value <= 0) return { max: 100_000, step: 25_000 }
  const rough = value / 4
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow
  return { max: Math.ceil(value / step) * step, step }
}

/** Barra con esquinas superiores redondeadas (4px) anclada a la línea base. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

export function MonthlyChart({ data, selected, onSelect }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const peak = Math.max(0, ...data.flatMap((d) => [d.ingresos, d.gastos]))
  const { max, step } = niceMax(peak)
  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = HEIGHT - M.top - M.bottom
  const band = data.length ? innerW / data.length : 0
  const barW = Math.max(4, Math.min(26, (band * 0.62 - 2) / 2))
  const y = (v: number) => M.top + innerH - (v / max) * innerH
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step)

  const hovered = hover !== null ? data[hover] : null

  return (
    <figure className="chart">
      <div className="chart__head">
        <div className="legend" aria-label="Leyenda">
          <span className="legend__item"><span className="swatch swatch--ingreso" />Ingresos</span>
          <span className="legend__item"><span className="swatch swatch--gasto" />Gastos</span>
        </div>
        <button type="button" className="link-btn" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
          {showTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th><th scope="col">Balance</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <th scope="row">{formatMonthLong(d.key)}</th>
                  <td>{formatMoney(d.ingresos)}</td>
                  <td>{formatMoney(d.gastos)}</td>
                  <td>{d.saldo < 0 ? '−' : ''}{formatMoney(Math.abs(d.saldo))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart__plot" ref={ref} onPointerLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={width} height={HEIGHT} role="img" aria-label="Ingresos y gastos por mes">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-base' : 'grid'} />
                  <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">{formatCompact(t)}</text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = M.left + band * i + band / 2
                const isSel = d.key === selected
                return (
                  <g key={d.key}>
                    {(hover === i || isSel) && (
                      <rect x={M.left + band * i + 2} y={M.top} width={Math.max(0, band - 4)} height={innerH} rx={6} className={isSel ? 'band band--selected' : 'band'} />
                    )}
                    <path d={barPath(cx - barW - 1, y(d.ingresos), barW, y(0) - y(d.ingresos))} className="bar bar--ingreso" />
                    <path d={barPath(cx + 1, y(d.gastos), barW, y(0) - y(d.gastos))} className="bar bar--gasto" />
                    <text x={cx} y={HEIGHT - 8} textAnchor="middle" className={isSel ? 'tick tick--strong' : 'tick'}>{formatMonthShort(d.key)}</text>
                    <rect
                      x={M.left + band * i}
                      y={0}
                      width={band}
                      height={HEIGHT}
                      fill="transparent"
                      style={{ cursor: onSelect ? 'pointer' : 'default' }}
                      onPointerEnter={() => setHover(i)}
                      onClick={() => onSelect?.(d.key)}
                    />
                  </g>
                )
              })}
            </svg>
          )}
          {hovered && hover !== null && (
            <div
              className="tooltip"
              style={{
                left: Math.min(Math.max(M.left + band * hover + band / 2, 90), width - 90),
                top: Math.max(4, y(Math.max(hovered.ingresos, hovered.gastos)) - 8),
              }}
            >
              <strong>{formatMonthLong(hovered.key)}</strong>
              <span><i className="swatch swatch--ingreso" />Ingresos <b>{formatMoney(hovered.ingresos)}</b></span>
              <span><i className="swatch swatch--gasto" />Gastos <b>{formatMoney(hovered.gastos)}</b></span>
              <span className="tooltip__net">Balance <b>{hovered.saldo < 0 ? '−' : '+'}{formatMoney(Math.abs(hovered.saldo))}</b></span>
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
