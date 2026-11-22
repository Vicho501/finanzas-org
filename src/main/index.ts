import { app, BrowserWindow, dialog, shell } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database'
import { respaldoAutomatico } from './respaldo'
import { registerCuentaHandlers } from './handlers/cuentas'
import { registerMovimientoHandlers } from './handlers/movimientos'
import { registerCategoriaHandlers } from './handlers/categorias'
import { registerReporteHandlers } from './handlers/reportes'
import { registerDashboardHandlers } from './handlers/dashboard'
import { registerConfigHandlers } from './handlers/config'
import { registerSistemaHandlers } from './handlers/sistema'

const isDev = !app.isPackaged
const DEV_URL = 'http://localhost:5173'

let mainWindow: BrowserWindow | null = null

// Una sola instancia: dos procesos escribiendo la misma base SQLite es riesgoso
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(iniciar)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'FinanzasOrg',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#f7f6f2',
    show: false,
  })
  mainWindow = win

  // La app nunca navega fuera de su propio contenido; los enlaces externos van al navegador
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    const permitido = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://')
    if (!permitido) e.preventDefault()
  })

  if (isDev) {
    win.loadURL(DEV_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.setMenu(null)
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { mainWindow = null })
}

async function iniciar() {
  try {
    initDatabase()
  } catch (err: any) {
    dialog.showErrorBox(
      'No se pudo abrir la base de datos',
      `${err?.message ?? err}\n\nLa aplicación se cerrará. Si el problema persiste, restaura un respaldo desde la carpeta de datos.`,
    )
    app.exit(1)
    return
  }

  registerCuentaHandlers()
  registerMovimientoHandlers()
  registerCategoriaHandlers()
  registerReporteHandlers()
  registerDashboardHandlers()
  registerConfigHandlers()
  registerSistemaHandlers()

  createWindow()

  // El respaldo diario no bloquea el inicio
  respaldoAutomatico().catch(err => console.error('Respaldo automático falló:', err))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => closeDatabase())
