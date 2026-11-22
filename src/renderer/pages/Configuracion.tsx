import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatFecha } from '../utils/format'
import Modal from '../components/Modal'

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null
type Restauracion = { archivo: string; cuentas: number; movimientos: number }

import { EVENTO_CONFIG } from '../utils/eventos'

function formatTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('es-CL', { maximumFractionDigits: 1 })} MB`
}

export default function Configuracion() {
  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState('CLP')
  const [original, setOriginal] = useState({ nombre: '', moneda: 'CLP' })
  const [guardando, setGuardando] = useState(false)
  const [avisoGeneral, setAvisoGeneral] = useState<Aviso>(null)
  const [avisoRespaldo, setAvisoRespaldo] = useState<Aviso>(null)
  const [restauracion, setRestauracion] = useState<Restauracion | null>(null)
  const [restaurando, setRestaurando] = useState(false)

  const { data: info, reload: recargarInfo } = useApi(() => window.api.getSistemaInfo())

  useEffect(() => {
    Promise.all([window.api.getConfig('nombre_organizacion'), window.api.getConfig('moneda_base')]).then(([n, m]) => {
      const valores = { nombre: n ?? 'Mi Organización', moneda: m ?? 'CLP' }
      setNombre(valores.nombre)
      setMoneda(valores.moneda)
      setOriginal(valores)
    })
  }, [])

  const hayCambios = nombre.trim() !== original.nombre || moneda !== original.moneda

  async function guardarGeneral() {
    const n = nombre.trim()
    if (!n) { setAvisoGeneral({ tipo: 'error', texto: 'El nombre de la organización es obligatorio' }); return }
    setGuardando(true)
    try {
      await window.api.setConfig('nombre_organizacion', n)
      await window.api.setConfig('moneda_base', moneda)
      setOriginal({ nombre: n, moneda })
      setNombre(n)
      setAvisoGeneral({ tipo: 'ok', texto: 'Cambios guardados' })
      window.dispatchEvent(new Event(EVENTO_CONFIG))
    } catch (e: any) {
      setAvisoGeneral({ tipo: 'error', texto: e?.message ?? 'No se pudo guardar' })
    } finally {
      setGuardando(false)
    }
  }

  async function crearRespaldo() {
    setAvisoRespaldo(null)
    const res = await window.api.crearRespaldo()
    if (res.cancelado) return
    setAvisoRespaldo(res.ok
      ? { tipo: 'ok', texto: `Respaldo guardado en ${res.ruta}` }
      : { tipo: 'error', texto: res.mensaje ?? 'No se pudo crear el respaldo' })
  }

  async function prepararRestauracion(nombreAuto?: string) {
    setAvisoRespaldo(null)
    const res = await window.api.prepararRestauracion(nombreAuto)
    if (res.ok) setRestauracion({ archivo: res.archivo, cuentas: res.cuentas, movimientos: res.movimientos })
    else if (!res.cancelado) setAvisoRespaldo({ tipo: 'error', texto: res.mensaje ?? 'No se pudo leer el respaldo' })
  }

  async function confirmarRestauracion() {
    setRestaurando(true)
    const res = await window.api.confirmarRestauracion()
    // Si todo sale bien la app se reinicia y esta línea no se alcanza
    setRestaurando(false)
    setRestauracion(null)
    if (!res.ok) setAvisoRespaldo({ tipo: 'error', texto: res.mensaje ?? 'No se pudo restaurar' })
    recargarInfo()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes generales de la aplicación</p>
      </div>

      {/* General */}
      <section className="card p-6 mb-5">
        <h2 className="font-medium text-gray-800 mb-4">Organización</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nombre de la organización</label>
            <input
              className="input"
              value={nombre}
              maxLength={80}
              onChange={e => { setNombre(e.target.value); setAvisoGeneral(null) }}
            />
            <p className="text-xs text-gray-400 mt-1">Aparece en la barra lateral y en los reportes PDF y Excel.</p>
          </div>
          <div>
            <label className="label">Moneda base</label>
            <select className="input" value={moneda} onChange={e => { setMoneda(e.target.value); setAvisoGeneral(null) }}>
              <option value="CLP">CLP — Peso chileno</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Los totales consolidados suman solo cuentas en esta moneda.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-5">
          {avisoGeneral && (
            <span className={`text-xs ${avisoGeneral.tipo === 'ok' ? 'text-income' : 'text-expense'}`}>{avisoGeneral.texto}</span>
          )}
          <button className="btn-primary" onClick={guardarGeneral} disabled={guardando || !hayCambios}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </section>

      {/* Respaldos */}
      <section className="card p-6 mb-5">
        <h2 className="font-medium text-gray-800 mb-1">Respaldos</h2>
        <p className="text-sm text-gray-500 mb-4">
          Todos los datos viven solo en este computador. La app guarda un respaldo automático
          al iniciar cada día (conserva los últimos 10). Guarda también copias en otro lugar,
          como un pendrive o una carpeta en la nube.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button className="btn-primary" onClick={crearRespaldo}>💾 Crear respaldo…</button>
          <button className="btn-secondary" onClick={() => prepararRestauracion()}>↩️ Restaurar desde archivo…</button>
          <button className="btn-secondary" onClick={() => window.api.abrirCarpetaRespaldos()}>📂 Abrir carpeta de respaldos</button>
        </div>

        {avisoRespaldo && (
          <p className={`text-xs px-3 py-2 rounded-lg mb-4 break-all ${
            avisoRespaldo.tipo === 'ok' ? 'bg-income-light text-income' : 'bg-expense-light text-expense'
          }`}>{avisoRespaldo.texto}</p>
        )}

        <h3 className="label mt-2">Respaldos automáticos</h3>
        {info && info.respaldosAuto.length === 0 && (
          <p className="text-sm text-gray-400">Todavía no hay respaldos automáticos.</p>
        )}
        {info && info.respaldosAuto.length > 0 && (
          <div className="border border-surface-200 rounded-lg divide-y divide-surface-100">
            {info.respaldosAuto.map(r => (
              <div key={r.nombre} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-gray-700">{formatFecha(r.fecha)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">{formatTamano(r.tamano)}</span>
                  <button className="text-xs text-primary-700 hover:text-primary-900" onClick={() => prepararRestauracion(r.nombre)}>
                    Restaurar
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Acerca de */}
      {info && (
        <section className="card p-6 text-sm">
          <h2 className="font-medium text-gray-800 mb-3">Acerca de</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2">
            <dt className="text-gray-400">Versión</dt>
            <dd className="font-mono text-gray-700">{info.version}</dd>
            <dt className="text-gray-400">Base de datos</dt>
            <dd className="font-mono text-xs text-gray-700 break-all">{info.rutaBaseDatos}</dd>
            <dt className="text-gray-400">Respaldos</dt>
            <dd className="font-mono text-xs text-gray-700 break-all">{info.carpetaRespaldos}</dd>
          </dl>
        </section>
      )}

      {restauracion && (
        <Modal titulo="Restaurar respaldo" onClose={() => !restaurando && setRestauracion(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-gray-700">
              Se reemplazarán <strong>todos los datos actuales</strong> por los del respaldo
              <span className="font-mono text-xs bg-surface-100 px-1.5 py-0.5 rounded mx-1">{restauracion.archivo}</span>
              ({restauracion.cuentas} cuenta{restauracion.cuentas !== 1 ? 's' : ''}, {restauracion.movimientos} movimiento{restauracion.movimientos !== 1 ? 's' : ''}).
            </p>
            <p className="text-gray-500">
              Antes de reemplazarlos, la app guarda una copia de los datos actuales en la carpeta de respaldos.
              Después se reiniciará.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setRestauracion(null)} disabled={restaurando}>Cancelar</button>
              <button
                className="bg-expense hover:opacity-90 text-white font-medium px-4 py-2 rounded-lg text-sm"
                onClick={confirmarRestauracion}
                disabled={restaurando}
              >
                {restaurando ? 'Restaurando…' : 'Restaurar y reiniciar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
