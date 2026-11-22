import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { getDb } from '../database'
import { getReporteMensual, MESES } from '../reportes/datos'
import { generarPdf } from '../reportes/pdf'
import { generarExcel } from '../reportes/excel'

type Formato = 'pdf' | 'excel'

function nombreSeguro(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'Organizacion'
}

function rutaDeReporte(id: number): string | null {
  const row = getDb().prepare('SELECT ruta_archivo FROM reporte_generado WHERE id = ?').get(id) as
    | { ruta_archivo: string | null }
    | undefined
  return row?.ruta_archivo ?? null
}

export function registerReporteHandlers() {
  const db = () => getDb()

  ipcMain.handle('reportes:getMensual', (_e, mes: number, anio: number) => {
    return getReporteMensual(mes, anio)
  })

  ipcMain.handle('reportes:export', async (e, mes: number, anio: number, formato: Formato) => {
    const reporte = getReporteMensual(mes, anio)
    const ext = formato === 'pdf' ? 'pdf' : 'xlsx'
    const nombre = `Reporte-${nombreSeguro(reporte.organizacion)}-${anio}-${String(mes).padStart(2, '0')}.${ext}`

    const win = BrowserWindow.fromWebContents(e.sender)
    const opciones: Electron.SaveDialogOptions = {
      title: `Guardar reporte de ${MESES[mes - 1]} ${anio}`,
      defaultPath: path.join(app.getPath('documents'), nombre),
      filters: formato === 'pdf'
        ? [{ name: 'Documento PDF', extensions: ['pdf'] }]
        : [{ name: 'Libro de Excel', extensions: ['xlsx'] }],
    }
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, opciones)
      : await dialog.showSaveDialog(opciones)
    if (canceled || !filePath) return { ok: false, cancelado: true }

    try {
      const buffer = formato === 'pdf' ? generarPdf(reporte) : await generarExcel(reporte)
      fs.writeFileSync(filePath, buffer)
    } catch (err: any) {
      const msg = err?.code === 'EBUSY' || err?.code === 'EPERM'
        ? 'No se pudo guardar: el archivo está abierto en otro programa o no hay permisos.'
        : `No se pudo generar el reporte: ${err?.message ?? err}`
      return { ok: false, mensaje: msg }
    }

    const result = db().prepare(
      'INSERT INTO reporte_generado (mes, anio, ruta_archivo) VALUES (?, ?, ?)'
    ).run(mes, anio, filePath)
    return { ok: true, id: Number(result.lastInsertRowid), ruta: filePath }
  })

  ipcMain.handle('reportes:getHistorial', () => {
    const rows = db().prepare(`
      SELECT * FROM reporte_generado ORDER BY generado_en DESC, id DESC LIMIT 50
    `).all() as { id: number; mes: number; anio: number; generado_en: string; ruta_archivo: string | null }[]
    return rows.map(r => ({
      ...r,
      formato: r.ruta_archivo?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'excel',
      existe: !!r.ruta_archivo && fs.existsSync(r.ruta_archivo),
    }))
  })

  // Solo se abren rutas registradas por la propia app (el renderer envía el id, no la ruta)
  ipcMain.handle('reportes:abrir', async (_e, id: number) => {
    const ruta = rutaDeReporte(id)
    if (!ruta || !fs.existsSync(ruta)) return { ok: false, mensaje: 'El archivo ya no existe' }
    const error = await shell.openPath(ruta)
    return error ? { ok: false, mensaje: error } : { ok: true }
  })

  ipcMain.handle('reportes:mostrarEnCarpeta', (_e, id: number) => {
    const ruta = rutaDeReporte(id)
    if (!ruta || !fs.existsSync(ruta)) return { ok: false, mensaje: 'El archivo ya no existe' }
    shell.showItemInFolder(ruta)
    return { ok: true }
  })

  ipcMain.handle('reportes:quitarDelHistorial', (_e, id: number) => {
    db().prepare('DELETE FROM reporte_generado WHERE id = ?').run(id)
    return { ok: true }
  })
}
