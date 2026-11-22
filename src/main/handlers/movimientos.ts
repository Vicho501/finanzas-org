import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerMovimientoHandlers() {
  const db = () => getDb()

  ipcMain.handle('movimientos:getAll', (_e, filtros: any = {}) => {
    let query = `
      SELECT m.*, c.nombre as cuenta_nombre, c.moneda, cat.nombre as categoria_nombre, cat.icono, cat.color
      FROM movimiento m
      JOIN cuenta_bancaria c ON c.id = m.cuenta_id
      LEFT JOIN categoria cat ON cat.id = m.categoria_id
      WHERE 1=1
    `
    const params: any[] = []

    if (filtros.cuenta_id) { query += ' AND m.cuenta_id = ?'; params.push(filtros.cuenta_id) }
    if (filtros.tipo)       { query += ' AND m.tipo = ?';      params.push(filtros.tipo) }
    if (filtros.fecha_desde){ query += ' AND m.fecha >= ?';    params.push(filtros.fecha_desde) }
    if (filtros.fecha_hasta){ query += ' AND m.fecha <= ?';    params.push(filtros.fecha_hasta) }
    if (filtros.categoria_id){ query += ' AND m.categoria_id = ?'; params.push(filtros.categoria_id) }

    query += ' ORDER BY m.fecha DESC, m.id DESC'
    if (filtros.limit) { query += ` LIMIT ${Number(filtros.limit)}` }

    return db().prepare(query).all(...params)
  })

  ipcMain.handle('movimientos:create', (_e, data) => {
    const stmt = db().prepare(`
      INSERT INTO movimiento (cuenta_id, tipo, monto, fecha, descripcion, categoria_id)
      VALUES (@cuenta_id, @tipo, @monto, @fecha, @descripcion, @categoria_id)
    `)
    const result = stmt.run(data)
    return { id: Number(result.lastInsertRowid) }
  })

  ipcMain.handle('movimientos:update', (_e, id: number, data) => {
    db().prepare(`
      UPDATE movimiento
      SET cuenta_id = @cuenta_id, tipo = @tipo, monto = @monto, fecha = @fecha,
          descripcion = @descripcion, categoria_id = @categoria_id
      WHERE id = @id
    `).run({ ...data, id })
    return { ok: true }
  })

  ipcMain.handle('movimientos:delete', (_e, id: number) => {
    db().prepare('DELETE FROM movimiento WHERE id = ?').run(id)
    return { ok: true }
  })
}
