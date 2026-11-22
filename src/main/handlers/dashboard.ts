import { ipcMain } from 'electron'
import { getDb } from '../database'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function registerDashboardHandlers() {
  const db = () => getDb()

  ipcMain.handle('dashboard:getResumen', () => {
    const now = new Date()
    const desdeMes = ymd(new Date(now.getFullYear(), now.getMonth(), 1))
    const hastaMes = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const desde6m = ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1))
    // Los agregados del mes solo consideran cuentas en la moneda base (no se convierten monedas)
    const monedaBase = (db().prepare("SELECT valor FROM configuracion WHERE clave = 'moneda_base'").get() as
      { valor: string } | undefined)?.valor ?? 'CLP'

    const cuentas = db().prepare(`
      SELECT c.id, c.nombre, c.banco, c.moneda,
        c.saldo_inicial
          + COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  THEN m.monto ELSE 0 END), 0)
        AS saldo_actual
      FROM cuenta_bancaria c
      LEFT JOIN movimiento m ON m.cuenta_id = c.id
      WHERE c.activa = 1
      GROUP BY c.id
      ORDER BY saldo_actual DESC
    `).all()

    const mes = db().prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  THEN m.monto ELSE 0 END), 0) AS egresos,
        COUNT(*) AS cantidad
      FROM movimiento m
      JOIN cuenta_bancaria c ON c.id = m.cuenta_id AND c.moneda = ?
      WHERE m.fecha BETWEEN ? AND ?
    `).get(monedaBase, desdeMes, hastaMes)

    const historicoRaw = db().prepare(`
      SELECT substr(m.fecha, 1, 7) AS periodo,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  THEN m.monto ELSE 0 END), 0) AS egresos
      FROM movimiento m
      JOIN cuenta_bancaria c ON c.id = m.cuenta_id AND c.moneda = ?
      WHERE m.fecha BETWEEN ? AND ?
      GROUP BY periodo
    `).all(monedaBase, desde6m, hastaMes) as { periodo: string; ingresos: number; egresos: number }[]

    // Rellenar meses sin movimientos para que el gráfico siempre tenga 6 barras
    const historico = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return historicoRaw.find(h => h.periodo === periodo) ?? { periodo, ingresos: 0, egresos: 0 }
    })

    const topEgresos = db().prepare(`
      SELECT COALESCE(cat.nombre, 'Sin categoría') AS nombre,
             COALESCE(cat.icono, '❔') AS icono,
             COALESCE(cat.color, '#9ca3af') AS color,
             SUM(m.monto) AS total
      FROM movimiento m
      JOIN cuenta_bancaria c ON c.id = m.cuenta_id AND c.moneda = ?
      LEFT JOIN categoria cat ON cat.id = m.categoria_id
      WHERE m.tipo = 'egreso' AND m.fecha BETWEEN ? AND ?
      GROUP BY m.categoria_id
      ORDER BY total DESC
      LIMIT 5
    `).all(monedaBase, desdeMes, hastaMes)

    const ultimos = db().prepare(`
      SELECT m.*, c.nombre AS cuenta_nombre, c.moneda, cat.nombre AS categoria_nombre, cat.icono
      FROM movimiento m
      JOIN cuenta_bancaria c ON c.id = m.cuenta_id
      LEFT JOIN categoria cat ON cat.id = m.categoria_id
      ORDER BY m.fecha DESC, m.id DESC
      LIMIT 6
    `).all()

    return { monedaBase, cuentas, mes, historico, topEgresos, ultimos }
  })
}
