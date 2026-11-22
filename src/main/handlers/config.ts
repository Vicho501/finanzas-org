import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerConfigHandlers() {
  const db = () => getDb()

  ipcMain.handle('config:get', (_e, clave: string) => {
    const row = db().prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave) as
      | { valor: string }
      | undefined
    return row?.valor ?? null
  })

  ipcMain.handle('config:set', (_e, clave: string, valor: string) => {
    db().prepare(`
      INSERT INTO configuracion (clave, valor) VALUES (?, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `).run(clave, valor)
    return { ok: true }
  })
}
