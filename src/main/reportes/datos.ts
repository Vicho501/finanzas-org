import { getDb } from '../database'

export interface CuentaReporte {
  id: number
  nombre: string
  banco: string
  moneda: string
  activa: number
  saldo_inicio_mes: number
  ingresos_mes: number
  egresos_mes: number
  saldo_fin_mes: number
}

export interface MovimientoReporte {
  id: number
  fecha: string
  tipo: 'ingreso' | 'egreso'
  monto: number
  descripcion: string | null
  cuenta_nombre: string
  moneda: string
  categoria_nombre: string | null
  icono: string | null
}

export interface CategoriaReporte {
  nombre: string
  icono: string
  color: string
  tipo: 'ingreso' | 'egreso'
  cantidad: number
  total: number
}

export interface ReporteMensual {
  mes: number
  anio: number
  organizacion: string
  monedaBase: string
  cuentas: CuentaReporte[]
  movimientos: MovimientoReporte[]
  porCategoria: CategoriaReporte[]
  totales: { saldo_inicio: number; ingresos: number; egresos: number; saldo_fin: number }
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function rangoMes(mes: number, anio: number) {
  const mm = String(mes).padStart(2, '0')
  const ultimoDia = new Date(anio, mes, 0).getDate()
  return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, '0')}` }
}

function getConfig(clave: string, porDefecto: string): string {
  const row = getDb().prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave) as { valor: string } | undefined
  return row?.valor ?? porDefecto
}

export function getReporteMensual(mes: number, anio: number): ReporteMensual {
  const db = getDb()
  const { desde, hasta } = rangoMes(mes, anio)
  // Los totales consolidados y por categoría solo consideran la moneda base (no se convierten monedas)
  const monedaBase = getConfig('moneda_base', 'CLP')

  // Cuentas activas + archivadas que tuvieron movimientos en el mes (para que los totales cuadren)
  const cuentas = (db.prepare(`
    SELECT
      c.id, c.nombre, c.banco, c.moneda, c.activa,
      c.saldo_inicial
        + COALESCE(SUM(CASE WHEN m.tipo='ingreso' AND m.fecha < @desde THEN m.monto END), 0)
        - COALESCE(SUM(CASE WHEN m.tipo='egreso'  AND m.fecha < @desde THEN m.monto END), 0)
        AS saldo_inicio_mes,
      COALESCE(SUM(CASE WHEN m.tipo='ingreso' AND m.fecha BETWEEN @desde AND @hasta THEN m.monto END), 0) AS ingresos_mes,
      COALESCE(SUM(CASE WHEN m.tipo='egreso'  AND m.fecha BETWEEN @desde AND @hasta THEN m.monto END), 0) AS egresos_mes,
      COUNT(CASE WHEN m.fecha BETWEEN @desde AND @hasta THEN 1 END) AS movs_mes
    FROM cuenta_bancaria c
    LEFT JOIN movimiento m ON m.cuenta_id = c.id
    WHERE date(c.creada_en) <= @hasta
       OR EXISTS (SELECT 1 FROM movimiento x WHERE x.cuenta_id = c.id AND x.fecha <= @hasta)
    GROUP BY c.id
    HAVING c.activa = 1 OR movs_mes > 0
    ORDER BY c.nombre
  `).all({ desde, hasta }) as (Omit<CuentaReporte, 'saldo_fin_mes'> & { movs_mes: number })[])
    .map(({ movs_mes: _omit, ...c }) => ({
      ...c,
      saldo_fin_mes: c.saldo_inicio_mes + c.ingresos_mes - c.egresos_mes,
    }))

  const movimientos = db.prepare(`
    SELECT m.id, m.fecha, m.tipo, m.monto, m.descripcion,
           c.nombre AS cuenta_nombre, c.moneda, cat.nombre AS categoria_nombre, cat.icono
    FROM movimiento m
    JOIN cuenta_bancaria c ON c.id = m.cuenta_id
    LEFT JOIN categoria cat ON cat.id = m.categoria_id
    WHERE m.fecha BETWEEN ? AND ?
    ORDER BY m.fecha, m.id
  `).all(desde, hasta) as MovimientoReporte[]

  const porCategoria = db.prepare(`
    SELECT COALESCE(cat.nombre, 'Sin categoría') AS nombre,
           COALESCE(cat.icono, '•') AS icono,
           COALESCE(cat.color, '#9ca3af') AS color,
           m.tipo, COUNT(*) AS cantidad, SUM(m.monto) AS total
    FROM movimiento m
    JOIN cuenta_bancaria c ON c.id = m.cuenta_id AND c.moneda = ?
    LEFT JOIN categoria cat ON cat.id = m.categoria_id
    WHERE m.fecha BETWEEN ? AND ?
    GROUP BY m.categoria_id, m.tipo
    ORDER BY m.tipo, total DESC
  `).all(monedaBase, desde, hasta) as CategoriaReporte[]

  const sum = (k: keyof CuentaReporte) =>
    cuentas.filter(c => c.moneda === monedaBase).reduce((s, c) => s + (c[k] as number), 0)

  return {
    mes, anio,
    organizacion: getConfig('nombre_organizacion', 'Mi Organización'),
    monedaBase,
    cuentas, movimientos, porCategoria,
    totales: {
      saldo_inicio: sum('saldo_inicio_mes'),
      ingresos: sum('ingresos_mes'),
      egresos: sum('egresos_mes'),
      saldo_fin: sum('saldo_fin_mes'),
    },
  }
}

// Negativos como "-$1.234" (Intl es-CL produce "$-1.234")
export function formatMonto(monto: number, moneda = 'CLP'): string {
  const texto = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: moneda,
    minimumFractionDigits: moneda === 'CLP' ? 0 : 2,
    maximumFractionDigits: moneda === 'CLP' ? 0 : 2,
  }).format(Math.abs(monto))
  return monto < 0 && texto.replace(/[^1-9]/g, '') !== '' ? '-' + texto : texto
}

export function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-')
  return `${d}-${m}-${y}`
}
