import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerCuentaHandlers() {
  const db = () => getDb()

  ipcMain.handle('cuentas:getAll', () => {
    return db().prepare(`
      SELECT
        c.*,
        COALESCE(c.saldo_inicial, 0)
          + COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'egreso'  THEN m.monto ELSE 0 END), 0)
        AS saldo_actual,
        COUNT(m.id) AS total_movimientos
      FROM cuenta_bancaria c
      LEFT JOIN movimiento m ON m.cuenta_id = c.id
      GROUP BY c.id
      ORDER BY c.nombre
    `).all()
  })

  ipcMain.handle('cuentas:create', (_e, data) => {
    const stmt = db().prepare(`
      INSERT INTO cuenta_bancaria (nombre, banco, tipo, moneda, saldo_inicial)
      VALUES (@nombre, @banco, @tipo, @moneda, @saldo_inicial)
    `)
    const result = stmt.run(data)
    return { id: Number(result.lastInsertRowid) }
  })

  ipcMain.handle('cuentas:update', (_e, id: number, data) => {
    db().prepare(`
      UPDATE cuenta_bancaria
      SET nombre = @nombre, banco = @banco, tipo = @tipo
      WHERE id = @id
    `).run({ ...data, id })
    return { ok: true }
  })

  ipcMain.handle('cuentas:archive', (_e, id: number) => {
    db().prepare('UPDATE cuenta_bancaria SET activa = 0 WHERE id = ?').run(id)
    return { ok: true }
  })
}
