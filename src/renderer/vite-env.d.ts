/// <reference types="vite/client" />

interface Window {
  api: {
    getCuentas: () => Promise<any[]>
    createCuenta: (data: any) => Promise<{ id: number }>
    updateCuenta: (id: number, data: any) => Promise<{ ok: boolean }>
    archiveCuenta: (id: number) => Promise<{ ok: boolean }>
    getMovimientos: (filtros?: any) => Promise<any[]>
    createMovimiento: (data: any) => Promise<{ id: number }>
    updateMovimiento: (id: number, data: any) => Promise<{ ok: boolean }>
    deleteMovimiento: (id: number) => Promise<{ ok: boolean }>
    getCategorias: () => Promise<any[]>
    createCategoria: (data: any) => Promise<{ id: number }>
    updateCategoria: (id: number, data: any) => Promise<{ ok: boolean }>
    getCategoriasConUso: () => Promise<any[]>
    setCategoriaActiva: (id: number, activa: boolean) => Promise<{ ok: boolean }>
    getDashboard: () => Promise<any>
    getReporteMensual: (mes: number, anio: number) => Promise<any>
    exportReporte: (mes: number, anio: number, formato: 'pdf' | 'excel') => Promise<{ ok: boolean; cancelado?: boolean; mensaje?: string; id?: number; ruta?: string }>
    getHistorialReportes: () => Promise<any[]>
    abrirReporte: (id: number) => Promise<{ ok: boolean; mensaje?: string }>
    mostrarReporteEnCarpeta: (id: number) => Promise<{ ok: boolean; mensaje?: string }>
    quitarReporteDelHistorial: (id: number) => Promise<{ ok: boolean }>
    getConfig: (clave: string) => Promise<string | null>
    setConfig: (clave: string, valor: string) => Promise<{ ok: boolean }>
    getSistemaInfo: () => Promise<{
      version: string
      rutaBaseDatos: string
      carpetaRespaldos: string
      respaldosAuto: { nombre: string; ruta: string; tamano: number; fecha: string }[]
    }>
    crearRespaldo: () => Promise<{ ok: boolean; cancelado?: boolean; mensaje?: string; ruta?: string }>
    prepararRestauracion: (nombreAuto?: string) => Promise<
      | { ok: true; archivo: string; cuentas: number; movimientos: number }
      | { ok: false; cancelado?: boolean; mensaje?: string }
    >
    confirmarRestauracion: () => Promise<{ ok: boolean; mensaje?: string }>
    abrirCarpetaRespaldos: () => Promise<{ ok: boolean }>
  }
}
