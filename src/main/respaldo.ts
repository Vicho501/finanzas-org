import { app } from 'electron'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { getDb } from './database'

const MAX_RESPALDOS_AUTO = 10
const TABLAS_REQUERIDAS = ['cuenta_bancaria', 'categoria', 'movimiento', 'configuracion']

export function carpetaRespaldos(): string {
  const dir = path.join(app.getPath('userData'), 'respaldos')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function fechaHoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function marcaTiempo(): string {
  const d = new Date()
  return `${fechaHoy()}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
}

/** Deja el archivo en modo DELETE: un único .db autocontenido, sin -wal/-shm al lado. */
function convertirAArchivoUnico(ruta: string): void {
  const conn = new Database(ruta)
  try {
    conn.pragma('journal_mode = DELETE')
  } finally {
    conn.close()
  }
}

/** Copia consistente de la base (funciona con WAL y con la base abierta). */
export async function crearRespaldo(destino: string): Promise<void> {
  await getDb().backup(destino)
  convertirAArchivoUnico(destino)
}

/**
 * Copia el archivo elegido a una ubicación interna y lo prepara para restaurar.
 * Se valida y restaura esa copia: el archivo original del usuario nunca se modifica
 * y no puede cambiar entre la validación y la restauración.
 */
export function copiarParaRestaurar(origen: string): string {
  const destino = path.join(app.getPath('userData'), 'restauracion-pendiente.db')
  for (const sufijo of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(destino + sufijo) } catch { /* puede no existir */ }
  }
  fs.copyFileSync(origen, destino)
  // Si el origen venía con WAL pendiente se copia también, para no perder datos
  if (fs.existsSync(origen + '-wal')) fs.copyFileSync(origen + '-wal', destino + '-wal')
  convertirAArchivoUnico(destino)
  return destino
}

export function listarRespaldosAuto(): { nombre: string; ruta: string; tamano: number; fecha: string }[] {
  const dir = carpetaRespaldos()
  return fs.readdirSync(dir)
    .filter(f => /^finanzas-auto-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort()
    .reverse()
    .map(f => {
      const ruta = path.join(dir, f)
      return { nombre: f, ruta, tamano: fs.statSync(ruta).size, fecha: f.slice(14, 24) }
    })
}

/** Un respaldo por día al iniciar la app; conserva los últimos MAX_RESPALDOS_AUTO. */
export async function respaldoAutomatico(): Promise<void> {
  const destino = path.join(carpetaRespaldos(), `finanzas-auto-${fechaHoy()}.db`)
  if (!fs.existsSync(destino)) {
    await crearRespaldo(destino)
  }
  for (const viejo of listarRespaldosAuto().slice(MAX_RESPALDOS_AUTO)) {
    try { fs.unlinkSync(viejo.ruta) } catch { /* se reintenta en el próximo inicio */ }
  }
}

/** Verifica que el archivo sea una base de FinanzasOrg íntegra antes de restaurarla. */
export function validarRespaldo(ruta: string): { ok: true; movimientos: number; cuentas: number } | { ok: false; mensaje: string } {
  let conn: Database.Database | null = null
  try {
    conn = new Database(ruta, { readonly: true, fileMustExist: true })
    const tablas = (conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[])
      .map(t => t.name)
    const faltan = TABLAS_REQUERIDAS.filter(t => !tablas.includes(t))
    if (faltan.length > 0) return { ok: false, mensaje: 'El archivo no es un respaldo de FinanzasOrg.' }
    const integridad = conn.pragma('integrity_check', { simple: true })
    if (integridad !== 'ok') return { ok: false, mensaje: 'El respaldo está dañado y no se puede restaurar.' }
    const n = (t: string) => (conn!.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n
    return { ok: true, movimientos: n('movimiento'), cuentas: n('cuenta_bancaria') }
  } catch {
    return { ok: false, mensaje: 'No se pudo leer el archivo. ¿Es una base de datos SQLite válida?' }
  } finally {
    conn?.close()
  }
}
