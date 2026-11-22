import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerReporteHandlers() {
  const db = () => getDb()

  ipcMain.handle('reportes:getMensual', (_e, mes: number, anio: number) => {
    const fechaDesde = `${anio}-${String(mes).padStart(2, '0')}-01`
    const fechaHasta = `${anio}-${String(mes).padStart(2, '0')}-31`

    const cuentas = db().prepare(`
      SELECT
        c.id, c.nombre, c.banco, c.moneda,
        c.saldo_inicial
          + COALESCE(SUM(CASE WHEN m2.tipo='ingreso' AND m2.fecha < @desde THEN m2.monto ELSE 0 END),0)
          - COALESCE(SUM(CASE WHEN m2.tipo='egreso'  AND m2.fecha < @desde THEN m2.monto ELSE 0 END),0)
        AS saldo_inicio_mes,
        COALESCE(SUM(CASE WHEN m2.tipo='ingreso' AND m2.fecha BETWEEN @desde AND @hasta THEN m2.monto ELSE 0 END),0) AS ingresos_mes,
        COALESCE(SUM(CASE WHEN m2.tipo='egreso'  AND m2.fecha BETWEEN @desde AND @hasta THEN m2.monto ELSE 0 END),0) AS egresos_mes
      FROM cuenta_bancaria c
      LEFT JOIN movimiento m2 ON m2.cuenta_id = c.id
      WHERE c.activa = 1
      GROUP BY c.id
    `).all({ desde: fechaDesde, hasta: fechaHasta })

    const movimientos = db().prepare(`
      SELECT m.*, c.nombre as cuenta_nombre, cat.nombre as categoria_nombre, cat.icono
      FROM movimiento m
      JOIN cuenta_bancaria c ON c.id = m.cuenta_id
      LEFT JOIN categoria cat ON cat.id = m.categoria_id
      WHERE m.fecha BETWEEN ? AND ?
      ORDER BY m.fecha, m.id
    `).all(fechaDesde, fechaHasta)

    const porCategoria = db().prepare(`
      SELECT cat.nombre, cat.icono, cat.color, m.tipo,
             COUNT(*) as cantidad, SUM(m.monto) as total
      FROM movimiento m
      LEFT JOIN categoria cat ON cat.id = m.categoria_id
      WHERE m.fecha BETWEEN ? AND ?
      GROUP BY cat.id, m.tipo
      ORDER BY total DESC
    `).all(fechaDesde, fechaHasta)

    return { cuentas, movimientos, porCategoria, mes, anio }
  })

  ipcMain.handle('reportes:export', (_e, mes: number, anio: number, formato: string) => {
    // Implementado en Fase 4
    return { ok: false, mensaje: 'Exportación disponible en Fase 4' }
  })
}
