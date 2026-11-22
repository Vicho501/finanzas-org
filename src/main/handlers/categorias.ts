import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerCategoriaHandlers() {
  const db = () => getDb()

  ipcMain.handle('categorias:getAll', () => {
    return db().prepare('SELECT * FROM categoria WHERE activa = 1 ORDER BY tipo, nombre').all()
  })

  // Incluye archivadas y cantidad de movimientos asociados (para la pantalla de gestión)
  ipcMain.handle('categorias:getAllConUso', () => {
    return db().prepare(`
      SELECT cat.*, COUNT(m.id) AS total_movimientos
      FROM categoria cat
      LEFT JOIN movimiento m ON m.categoria_id = cat.id
      GROUP BY cat.id
      ORDER BY cat.activa DESC, cat.tipo, cat.nombre
    `).all()
  })

  ipcMain.handle('categorias:create', (_e, data) => {
    const result = db().prepare(`
      INSERT INTO categoria (nombre, tipo, color, icono)
      VALUES (@nombre, @tipo, @color, @icono)
    `).run(data)
    return { id: Number(result.lastInsertRowid) }
  })

  ipcMain.handle('categorias:update', (_e, id: number, data) => {
    db().prepare(`
      UPDATE categoria SET nombre = @nombre, tipo = @tipo, color = @color, icono = @icono
      WHERE id = @id
    `).run({ ...data, id })
    return { ok: true }
  })

  // Archivar en vez de borrar: los movimientos históricos conservan su categoría
  ipcMain.handle('categorias:setActiva', (_e, id: number, activa: boolean) => {
    db().prepare('UPDATE categoria SET activa = ? WHERE id = ?').run(activa ? 1 : 0, id)
    return { ok: true }
  })
}
