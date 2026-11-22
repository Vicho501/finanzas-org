import { contextBridge, ipcRenderer } from 'electron'

// Expone la API de IPC al renderer de forma segura
contextBridge.exposeInMainWorld('api', {
  // Cuentas
  getCuentas: () => ipcRenderer.invoke('cuentas:getAll'),
  createCuenta: (data: any) => ipcRenderer.invoke('cuentas:create', data),
  updateCuenta: (id: number, data: any) => ipcRenderer.invoke('cuentas:update', id, data),
  archiveCuenta: (id: number) => ipcRenderer.invoke('cuentas:archive', id),

  // Movimientos
  getMovimientos: (filtros?: any) => ipcRenderer.invoke('movimientos:getAll', filtros),
  createMovimiento: (data: any) => ipcRenderer.invoke('movimientos:create', data),
  updateMovimiento: (id: number, data: any) => ipcRenderer.invoke('movimientos:update', id, data),
  deleteMovimiento: (id: number) => ipcRenderer.invoke('movimientos:delete', id),

  // Categorías
  getCategorias: () => ipcRenderer.invoke('categorias:getAll'),
  createCategoria: (data: any) => ipcRenderer.invoke('categorias:create', data),
  updateCategoria: (id: number, data: any) => ipcRenderer.invoke('categorias:update', id, data),
  getCategoriasConUso: () => ipcRenderer.invoke('categorias:getAllConUso'),
  setCategoriaActiva: (id: number, activa: boolean) => ipcRenderer.invoke('categorias:setActiva', id, activa),

  // Dashboard
  getDashboard: () => ipcRenderer.invoke('dashboard:getResumen'),

  // Reportes
  getReporteMensual: (mes: number, anio: number) =>
    ipcRenderer.invoke('reportes:getMensual', mes, anio),
  exportReporte: (mes: number, anio: number, formato: 'pdf' | 'excel') =>
    ipcRenderer.invoke('reportes:export', mes, anio, formato),
  getHistorialReportes: () => ipcRenderer.invoke('reportes:getHistorial'),
  abrirReporte: (id: number) => ipcRenderer.invoke('reportes:abrir', id),
  mostrarReporteEnCarpeta: (id: number) => ipcRenderer.invoke('reportes:mostrarEnCarpeta', id),
  quitarReporteDelHistorial: (id: number) => ipcRenderer.invoke('reportes:quitarDelHistorial', id),

  // Config
  getConfig: (clave: string) => ipcRenderer.invoke('config:get', clave),
  setConfig: (clave: string, valor: string) => ipcRenderer.invoke('config:set', clave, valor),

  // Sistema y respaldos
  getSistemaInfo: () => ipcRenderer.invoke('sistema:info'),
  crearRespaldo: () => ipcRenderer.invoke('respaldo:crear'),
  prepararRestauracion: (nombreAuto?: string) => ipcRenderer.invoke('respaldo:prepararRestauracion', nombreAuto),
  confirmarRestauracion: () => ipcRenderer.invoke('respaldo:confirmarRestauracion'),
  abrirCarpetaRespaldos: () => ipcRenderer.invoke('respaldo:abrirCarpeta'),
})
