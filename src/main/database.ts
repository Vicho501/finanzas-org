import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Base de datos no inicializada')
  return db
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'finanzas.db')
  db = new Database(dbPath)

  // Habilitar WAL para mejor rendimiento
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  seedCategorias()
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cuenta_bancaria (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT    NOT NULL,
      banco       TEXT    NOT NULL,
      tipo        TEXT    NOT NULL CHECK(tipo IN ('corriente','ahorro','vista')),
      moneda      TEXT    NOT NULL DEFAULT 'CLP',
      saldo_inicial REAL  NOT NULL DEFAULT 0,
      activa      INTEGER NOT NULL DEFAULT 1,
      creada_en   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categoria (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre  TEXT    NOT NULL,
      tipo    TEXT    NOT NULL CHECK(tipo IN ('ingreso','egreso','ambos')),
      color   TEXT    NOT NULL DEFAULT '#3582b4',
      icono   TEXT    NOT NULL DEFAULT '📋',
      activa  INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS movimiento (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      cuenta_id    INTEGER NOT NULL REFERENCES cuenta_bancaria(id),
      tipo         TEXT    NOT NULL CHECK(tipo IN ('ingreso','egreso')),
      monto        REAL    NOT NULL CHECK(monto > 0),
      fecha        TEXT    NOT NULL,
      descripcion  TEXT,
      categoria_id INTEGER REFERENCES categoria(id),
      creado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reporte_generado (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      mes          INTEGER NOT NULL,
      anio         INTEGER NOT NULL,
      generado_en  TEXT    NOT NULL DEFAULT (datetime('now')),
      ruta_archivo TEXT
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_movimiento_fecha
      ON movimiento(fecha);
    CREATE INDEX IF NOT EXISTS idx_movimiento_cuenta
      ON movimiento(cuenta_id);
  `)
}

function seedCategorias(): void {
  const count = db.prepare('SELECT COUNT(*) as n FROM categoria').get() as { n: number }
  if (count.n > 0) return

  const insert = db.prepare(
    'INSERT INTO categoria (nombre, tipo, color, icono) VALUES (?, ?, ?, ?)'
  )
  const categorias = [
    // Ingresos
    ['Ventas / Servicios', 'ingreso',  '#2d7a5b', '💰'],
    ['Donaciones',          'ingreso',  '#2d7a5b', '🤝'],
    ['Subsidios / Fondos',  'ingreso',  '#2d7a5b', '🏛️'],
    ['Devoluciones',        'ingreso',  '#2d7a5b', '↩️'],
    ['Otros ingresos',      'ingreso',  '#2d7a5b', '➕'],
    // Egresos
    ['Remuneraciones',      'egreso',   '#8b2e2e', '👥'],
    ['Arriendo',            'egreso',   '#8b2e2e', '🏢'],
    ['Servicios básicos',   'egreso',   '#8b2e2e', '💡'],
    ['Proveedores',         'egreso',   '#8b2e2e', '📦'],
    ['Transporte',          'egreso',   '#8b2e2e', '🚗'],
    ['Materiales',          'egreso',   '#8b2e2e', '🔧'],
    ['Impuestos / Tasas',   'egreso',   '#8b2e2e', '🏦'],
    ['Otros gastos',        'egreso',   '#8b2e2e', '➖'],
    // Ambos
    ['Transferencia',       'ambos',    '#7a6020', '🔄'],
  ]
  const insertMany = db.transaction(() => {
    categorias.forEach(c => insert.run(...c))
  })
  insertMany()

  // Config inicial
  db.prepare(
    "INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)"
  ).run('nombre_organizacion', 'Mi Organización')
  db.prepare(
    "INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)"
  ).run('moneda_base', 'CLP')
}
