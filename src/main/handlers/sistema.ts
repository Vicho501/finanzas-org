import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { closeDatabase, getDbPath } from '../database'
import {
  carpetaRespaldos, copiarParaRestaurar, crearRespaldo, listarRespaldosAuto, marcaTiempo, validarRespaldo,
} from '../respaldo'

// Ruta elegida en el diálogo de restauración, pendiente de confirmación.
// Se guarda aquí para que el renderer nunca envíe rutas arbitrarias.
let restauracionPendiente: string | null = null

function ventana(e: Electron.IpcMainInvokeEvent) {
  return BrowserWindow.fromWebContents(e.sender) ?? undefined
}

export function registerSistemaHandlers() {
  ipcMain.handle('sistema:info', () => ({
    version: app.getVersion(),
    rutaBaseDatos: getDbPath(),
    carpetaRespaldos: carpetaRespaldos(),
    respaldosAuto: listarRespaldosAuto(),
  }))

  ipcMain.handle('respaldo:abrirCarpeta', async () => {
    await shell.openPath(carpetaRespaldos())
    return { ok: true }
  })

  ipcMain.handle('respaldo:crear', async e => {
    const win = ventana(e)
    const opciones: Electron.SaveDialogOptions = {
      title: 'Guardar respaldo',
      defaultPath: path.join(app.getPath('documents'), `FinanzasOrg-respaldo-${marcaTiempo()}.db`),
      filters: [{ name: 'Respaldo FinanzasOrg', extensions: ['db'] }],
    }
    const { canceled, filePath } = win ? await dialog.showSaveDialog(win, opciones) : await dialog.showSaveDialog(opciones)
    if (canceled || !filePath) return { ok: false, cancelado: true }
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      await crearRespaldo(filePath)
      return { ok: true, ruta: filePath }
    } catch (err: any) {
      return { ok: false, mensaje: `No se pudo crear el respaldo: ${err?.message ?? err}` }
    }
  })

  // Paso 1: elegir archivo (o un respaldo automático) y validarlo
  ipcMain.handle('respaldo:prepararRestauracion', async (e, nombreAuto?: string) => {
    restauracionPendiente = null
    let ruta: string | undefined

    if (nombreAuto) {
      ruta = listarRespaldosAuto().find(r => r.nombre === nombreAuto)?.ruta
      if (!ruta) return { ok: false, mensaje: 'Ese respaldo automático ya no existe.' }
    } else {
      const win = ventana(e)
      const opciones: Electron.OpenDialogOptions = {
        title: 'Elegir respaldo para restaurar',
        defaultPath: app.getPath('documents'),
        filters: [{ name: 'Respaldo FinanzasOrg', extensions: ['db'] }],
        properties: ['openFile'],
      }
      const res = win ? await dialog.showOpenDialog(win, opciones) : await dialog.showOpenDialog(opciones)
      if (res.canceled || res.filePaths.length === 0) return { ok: false, cancelado: true }
      ruta = res.filePaths[0]
    }

    if (path.resolve(ruta) === path.resolve(getDbPath())) {
      return { ok: false, mensaje: 'Ese archivo es la base de datos en uso.' }
    }
    let copia: string
    try {
      copia = copiarParaRestaurar(ruta)
    } catch {
      return { ok: false, mensaje: 'No se pudo leer el archivo. ¿Es una base de datos SQLite válida?' }
    }
    const validacion = validarRespaldo(copia)
    if (!validacion.ok) return validacion
    restauracionPendiente = copia
    return { ok: true, archivo: path.basename(ruta), cuentas: validacion.cuentas, movimientos: validacion.movimientos }
  })

  // Paso 2: confirmar. Respalda la base actual, la reemplaza y reinicia la app.
  ipcMain.handle('respaldo:confirmarRestauracion', async () => {
    const origen = restauracionPendiente
    restauracionPendiente = null
    if (!origen || !fs.existsSync(origen)) return { ok: false, mensaje: 'No hay una restauración pendiente.' }

    const seguridad = path.join(carpetaRespaldos(), `finanzas-antes-de-restaurar-${marcaTiempo()}.db`)
    try {
      await crearRespaldo(seguridad)
    } catch (err: any) {
      return { ok: false, mensaje: `No se pudo respaldar la base actual; no se restauró nada. ${err?.message ?? ''}` }
    }

    const destino = getDbPath()
    closeDatabase()
    for (const extra of ['-wal', '-shm']) {
      try { fs.unlinkSync(destino + extra) } catch { /* puede no existir */ }
    }
    try {
      fs.renameSync(origen, destino)
    } catch {
      // Si la copia falla se vuelve a la base anterior, que está en el respaldo de seguridad
      fs.copyFileSync(seguridad, destino)
    }

    app.relaunch()
    app.exit(0)
    return { ok: true }
  })
}
