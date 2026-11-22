import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDatabase } from './database'
import { registerCuentaHandlers } from './handlers/cuentas'
import { registerMovimientoHandlers } from './handlers/movimientos'
import { registerCategoriaHandlers } from './handlers/categorias'
import { registerReporteHandlers } from './handlers/reportes'
import { registerDashboardHandlers } from './handlers/dashboard'
import { registerConfigHandlers } from './handlers/config'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f7f6f2',
    show: false,
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  // Inicializar base de datos
  initDatabase()

  // Registrar handlers IPC
  registerCuentaHandlers()
  registerMovimientoHandlers()
  registerCategoriaHandlers()
  registerReporteHandlers()
  registerDashboardHandlers()
  registerConfigHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
