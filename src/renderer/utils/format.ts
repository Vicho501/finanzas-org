// Formatea montos en pesos chilenos u otras monedas
// Negativos como "-$1.234" (Intl es-CL produce "$-1.234")
export function formatMonto(monto: number, moneda = 'CLP'): string {
  const texto = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: moneda === 'CLP' ? 0 : 2,
    maximumFractionDigits: moneda === 'CLP' ? 0 : 2,
  }).format(Math.abs(monto))
  return monto < 0 && texto.replace(/[^1-9]/g, '') !== '' ? '-' + texto : texto
}

// Formatea fecha YYYY-MM-DD a formato legible
export function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// Fecha de hoy en formato YYYY-MM-DD (hora local, no UTC)
export function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// 'YYYY-MM' → 'nov 26'
export function formatPeriodoCorto(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number)
  return `${MESES_CORTOS[m - 1]} ${String(y).slice(2)}`
}

// Monto abreviado para ejes de gráficos: 1.2M, 350k
export function formatMontoCorto(monto: number): string {
  const abs = Math.abs(monto)
  if (abs >= 1_000_000) return `${(monto / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `${Math.round(monto / 1_000)}k`
  return String(Math.round(monto))
}

// Primer día del mes actual
export function primerDiaMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
