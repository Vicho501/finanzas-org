import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatFecha } from '../utils/format'
import { EVENTO_CONFIG } from '../utils/eventos'
import { Encabezado, ErrorFormulario, Modal, useUI } from '../components/UI'

type Restauracion = { archivo: string; cuentas: number; movimientos: number }

function formatTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('es-CL', { maximumFractionDigits: 1 })} MB`
}

export default function Configuracion() {
  const { avisar } = useUI()
  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState('CLP')
  const [original, setOriginal] = useState({ nombre: '', moneda: 'CLP' })
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [respaldoGuardado, setRespaldoGuardado] = useState<string | null>(null)
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
    if (!n) { setErrorGeneral('Escribe el nombre de la organización.'); return }
    setGuardando(true)
    try {
      await window.api.setConfig('nombre_organizacion', n)
      await window.api.setConfig('moneda_base', moneda)
      setOriginal({ nombre: n, moneda })
      setNombre(n)
      avisar('Cambios guardados')
      window.dispatchEvent(new Event(EVENTO_CONFIG))
    } catch (e: any) {
      setErrorGeneral(e?.message ?? 'No se pudieron guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  async function crearRespaldo() {
    setRespaldoGuardado(null)
    const res = await window.api.crearRespaldo()
    if (res.cancelado) return
    if (res.ok && res.ruta) { setRespaldoGuardado(res.ruta); avisar('Respaldo guardado') }
    else avisar(res.mensaje ?? 'No se pudo crear el respaldo.', 'error')
  }

  async function prepararRestauracion(nombreAuto?: string) {
    const res = await window.api.prepararRestauracion(nombreAuto)
    if (res.ok) setRestauracion({ archivo: res.archivo, cuentas: res.cuentas, movimientos: res.movimientos })
    else if (!res.cancelado) avisar(res.mensaje ?? 'No se pudo leer el respaldo.', 'error')
  }

  async function confirmarRestauracion() {
    setRestaurando(true)
    const res = await window.api.confirmarRestauracion()
    // Si todo sale bien la app se reinicia y esta línea no se alcanza
    setRestaurando(false)
    setRestauracion(null)
    if (!res.ok) avisar(res.mensaje ?? 'No se pudo restaurar.', 'error')
    recargarInfo()
  }

  return (
    <div className="px-10 py-9 max-w-3xl">
      <Encabezado titulo="Configuración" descripcion="Los datos de la organización y las copias de seguridad." />

      <section className="card p-6 mb-6">
        <h2 className="titulo-seccion mb-4">Organización</h2>
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); guardarGeneral() }}>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="cfg-nombre">Nombre de la organización</label>
              <input
                id="cfg-nombre"
                className="input"
                value={nombre}
                maxLength={80}
                onChange={e => { setNombre(e.target.value); setErrorGeneral(null) }}
              />
              <p className="ayuda">Aparece en la barra lateral y en los reportes.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="cfg-moneda">Moneda principal</label>
              <select id="cfg-moneda" className="input" value={moneda} onChange={e => setMoneda(e.target.value)}>
                <option value="CLP">Pesos chilenos (CLP)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
              <p className="ayuda">Los totales suman solo las cuentas en esta moneda.</p>
            </div>
          </div>
          <ErrorFormulario texto={errorGeneral} />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={guardando || !hayCambios}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6 mb-6">
        <h2 className="titulo-seccion mb-1">Copias de seguridad</h2>
        <p className="text-sm text-surface-500 mb-5 max-w-prose">
          Todos los datos están solo en este computador. Si se pierde o se daña, se pierden también.
          Por eso la app guarda una copia automática cada día, pero conviene guardar además una copia
          en un pendrive o en una carpeta en la nube, al menos una vez al mes.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button className="btn-primary" onClick={crearRespaldo}>Guardar una copia…</button>
          <button className="btn-secondary" onClick={() => prepararRestauracion()}>Recuperar desde una copia…</button>
          <button className="btn-secondary" onClick={() => window.api.abrirCarpetaRespaldos()}>Abrir carpeta de copias</button>
        </div>

        {respaldoGuardado && (
          <p className="text-sm px-4 py-3 rounded-lg mb-4 break-all bg-income-light text-income">
            <span className="font-semibold">Copia guardada en:</span> {respaldoGuardado}
          </p>
        )}

        <h3 className="font-semibold text-ink mt-6 mb-1">Copias automáticas</h3>
        <p className="text-sm text-surface-500 mb-3">Se guarda una al abrir la app cada día y se conservan las últimas 10.</p>
        {info && info.respaldosAuto.length === 0 && (
          <p className="text-sm text-surface-500">Todavía no hay copias automáticas.</p>
        )}
        {info && info.respaldosAuto.length > 0 && (
          <ul className="border border-surface-200 rounded-lg divide-y divide-surface-100">
            {info.respaldosAuto.map(r => (
              <li key={r.nombre} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-ink font-semibold">{formatFecha(r.fecha)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-surface-500">{formatTamano(r.tamano)}</span>
                  <button className="btn-fila" onClick={() => prepararRestauracion(r.nombre)}>Recuperar esta copia</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {info && (
        <details className="card p-6 text-sm">
          <summary className="titulo-seccion cursor-pointer select-none">Información técnica</summary>
          <dl className="grid grid-cols-[150px_1fr] gap-y-2 mt-4">
            <dt className="text-surface-500">Versión</dt>
            <dd className="text-ink">{info.version}</dd>
            <dt className="text-surface-500">Base de datos</dt>
            <dd className="text-xs text-ink break-all">{info.rutaBaseDatos}</dd>
            <dt className="text-surface-500">Carpeta de copias</dt>
            <dd className="text-xs text-ink break-all">{info.carpetaRespaldos}</dd>
          </dl>
        </details>
      )}

      {restauracion && (
        <Modal titulo="¿Recuperar esta copia?" onClose={() => !restaurando && setRestauracion(null)} ancho="max-w-md">
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="text-ink">
              Los datos que tienes ahora se reemplazarán por los de la copia
              <span className="text-xs bg-surface-100 px-1.5 py-0.5 rounded mx-1 break-all">{restauracion.archivo}</span>
              que tiene {restauracion.cuentas} cuenta{restauracion.cuentas !== 1 ? 's' : ''} y {restauracion.movimientos} movimiento{restauracion.movimientos !== 1 ? 's' : ''}.
            </p>
            <p className="text-surface-500">
              Por seguridad, antes de reemplazarlos la app guarda una copia de los datos actuales en la carpeta de copias.
              Después la app se reinicia sola.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setRestauracion(null)} disabled={restaurando}>Cancelar</button>
              <button className="btn-danger" onClick={confirmarRestauracion} disabled={restaurando}>
                {restaurando ? 'Recuperando…' : 'Recuperar y reiniciar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
