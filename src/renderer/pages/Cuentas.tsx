import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { formatMonto } from '../utils/format'
import { avisarCambioDatos } from '../utils/eventos'
import { Encabezado, EstadoVacio, ErrorFormulario, Modal, useUI } from '../components/UI'
import Spinner from '../components/Spinner'

interface Cuenta {
  id: number
  nombre: string
  banco: string
  tipo: 'corriente' | 'ahorro' | 'vista'
  moneda: string
  saldo_inicial: number
  saldo_actual: number
  total_movimientos: number
  activa: number
}

const TIPO_LABELS: Record<string, string> = {
  corriente: 'cuenta corriente',
  ahorro: 'cuenta de ahorro',
  vista: 'cuenta vista / RUT',
}

const esEfectivo = (c: { banco: string }) => c.banco.startsWith('Caja')

const BANCO_OPCIONES = [
  'Banco Estado', 'Banco de Chile', 'Santander', 'BCI', 'Falabella',
  'Scotiabank', 'Itaú', 'Security', 'Consorcio', 'Coopeuch', 'Caja chica (efectivo)', 'Otro',
]

interface FormCuenta {
  nombre: string
  banco: string
  tipo: string
  moneda: string
  saldo_inicial: string
}

const FORM_VACIO: FormCuenta = {
  nombre: '', banco: 'Banco Estado', tipo: 'corriente', moneda: 'CLP', saldo_inicial: '',
}

export default function Cuentas() {
  const { confirmar, avisar } = useUI()
  const { data: cuentas, loading } = useApi<Cuenta[]>(() => window.api.getCuentas())
  const [monedaBase, setMonedaBase] = useState('CLP')
  const [modal, setModal] = useState<'nueva' | 'editar' | null>(null)
  const [cuentaEditar, setCuentaEditar] = useState<Cuenta | null>(null)
  const [form, setForm] = useState<FormCuenta>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()

  useEffect(() => { window.api.getConfig('moneda_base').then(m => setMonedaBase(m ?? 'CLP')) }, [])

  // Llegar con ?nueva=1 (desde la guía de inicio) abre directamente el formulario
  useEffect(() => {
    if (params.get('nueva') === '1') { abrirNueva(); setParams({}, { replace: true }) }
  }, [params])

  function abrirNueva() {
    setCuentaEditar(null)
    setForm({ ...FORM_VACIO, moneda: monedaBase })
    setError(null)
    setModal('nueva')
  }

  function abrirEditar(cuenta: Cuenta) {
    setCuentaEditar(cuenta)
    setForm({ nombre: cuenta.nombre, banco: cuenta.banco, tipo: cuenta.tipo, moneda: cuenta.moneda, saldo_inicial: String(cuenta.saldo_inicial) })
    setError(null)
    setModal('editar')
  }

  function cerrarModal() {
    setModal(null)
    setCuentaEditar(null)
    setError(null)
  }

  function setField(k: keyof FormCuenta, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setError(null)
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('Ponle un nombre a la cuenta, por ejemplo "Cuenta principal".'); return }
    setGuardando(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        banco: form.banco.trim(),
        tipo: form.tipo,
        moneda: form.moneda,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      }
      if (modal === 'nueva') await window.api.createCuenta(payload)
      else if (cuentaEditar) await window.api.updateCuenta(cuentaEditar.id, payload)
      avisar(modal === 'nueva' ? `Cuenta "${payload.nombre}" creada` : 'Cambios guardados')
      cerrarModal()
      avisarCambioDatos()
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la cuenta.')
    } finally {
      setGuardando(false)
    }
  }

  async function archivar(cuenta: Cuenta) {
    const ok = await confirmar({
      titulo: `¿Archivar "${cuenta.nombre}"?`,
      mensaje: <>
        <p>La cuenta deja de aparecer al registrar movimientos y no se suma al saldo total.</p>
        <p className="mt-2 text-surface-500">Sus {cuenta.total_movimientos} movimientos se conservan y puedes reactivarla cuando quieras.</p>
      </>,
      confirmar: 'Archivar cuenta',
    })
    if (!ok) return
    await window.api.archiveCuenta(cuenta.id)
    avisar(`"${cuenta.nombre}" archivada`)
    avisarCambioDatos()
  }

  async function reactivar(cuenta: Cuenta) {
    await window.api.restoreCuenta(cuenta.id)
    avisar(`"${cuenta.nombre}" está activa de nuevo`)
    avisarCambioDatos()
  }

  const activas = cuentas?.filter(c => c.activa === 1) ?? []
  const archivadas = cuentas?.filter(c => c.activa === 0) ?? []
  // Solo se suman cuentas en la moneda base (no se convierten monedas)
  const enBase = activas.filter(c => c.moneda === monedaBase)
  const totalBase = enBase.reduce((s, c) => s + c.saldo_actual, 0)
  const hayOtras = enBase.length < activas.length

  return (
    <div className="px-10 py-9 max-w-4xl">
      <Encabezado
        titulo="Cuentas"
        descripcion="Las cuentas bancarias de la organización y la caja chica. El saldo de cada una se calcula con los movimientos que anotas."
        acciones={activas.length > 0 && <button className="btn-primary" onClick={abrirNueva}>+ Nueva cuenta</button>}
      />

      {loading && <Spinner />}

      {!loading && activas.length === 0 && (
        <EstadoVacio
          icono="🏦"
          titulo="Todavía no hay cuentas"
          descripcion="Crea una cuenta por cada banco que usa la organización. Si también manejan efectivo, crea una cuenta llamada Caja chica."
          accion={<button className="btn-primary" onClick={abrirNueva}>Crear la primera cuenta</button>}
        />
      )}

      {!loading && activas.length > 0 && (
        <>
          <div className="card px-6 py-5 mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-surface-500">Saldo total{hayOtras ? ` de las cuentas en ${monedaBase}` : ''}</p>
              <p className={`cifra text-3xl mt-0.5 ${totalBase < 0 ? 'text-expense' : 'text-ink'}`}>{formatMonto(totalBase, monedaBase)}</p>
            </div>
            <p className="text-sm text-surface-500 text-right">
              {activas.length} cuenta{activas.length !== 1 ? 's' : ''} activa{activas.length !== 1 ? 's' : ''}
              {hayOtras && <><br />Las cuentas en otra moneda no se suman.</>}
            </p>
          </div>

          <ul className="space-y-3">
            {activas.map(cuenta => (
              <li key={cuenta.id} className="card px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0" aria-hidden>
                  {esEfectivo(cuenta) ? '💵' : '🏦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink">{cuenta.nombre}</p>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {esEfectivo(cuenta) ? 'Efectivo' : `${cuenta.banco}, ${TIPO_LABELS[cuenta.tipo] ?? cuenta.tipo}`}
                    {cuenta.moneda !== monedaBase && <>, en {cuenta.moneda}</>}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {cuenta.total_movimientos === 0 ? 'Sin movimientos todavía' : `${cuenta.total_movimientos} movimiento${cuenta.total_movimientos !== 1 ? 's' : ''} anotado${cuenta.total_movimientos !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-surface-500">Saldo hoy</p>
                  <p className={`cifra text-lg ${cuenta.saldo_actual >= 0 ? 'text-ink' : 'text-expense'}`}>
                    {formatMonto(cuenta.saldo_actual, cuenta.moneda)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0 pl-2 border-l border-surface-100">
                  <button className="btn-fila" onClick={() => abrirEditar(cuenta)}>Editar</button>
                  <button className="btn-fila text-surface-500" onClick={() => archivar(cuenta)}>Archivar</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && archivadas.length > 0 && (
        <details className="mt-8">
          <summary className="text-sm font-semibold text-surface-500 cursor-pointer hover:text-ink select-none">
            Cuentas archivadas ({archivadas.length})
          </summary>
          <ul className="card mt-3 divide-y divide-surface-100">
            {archivadas.map(cuenta => (
              <li key={cuenta.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-500">{cuenta.nombre}</p>
                  <p className="text-xs text-surface-500">{cuenta.banco}</p>
                </div>
                <p className="cifra text-surface-500">{formatMonto(cuenta.saldo_actual, cuenta.moneda)}</p>
                <button className="btn-fila" onClick={() => reactivar(cuenta)}>Reactivar</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {modal && (
        <Modal
          titulo={modal === 'nueva' ? 'Nueva cuenta' : 'Editar cuenta'}
          descripcion={modal === 'nueva' ? 'Una cuenta por cada banco, o una para el efectivo.' : undefined}
          onClose={cerrarModal}
        >
          <form className="space-y-5" onSubmit={e => { e.preventDefault(); guardar() }}>
            <div>
              <label className="label" htmlFor="cta-nombre">Nombre de la cuenta</label>
              <input id="cta-nombre" className="input" placeholder='ej: Cuenta principal, Caja chica'
                value={form.nombre} onChange={e => setField('nombre', e.target.value)} autoFocus maxLength={60} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cta-banco">Banco</label>
                <select id="cta-banco" className="input" value={form.banco} onChange={e => setField('banco', e.target.value)}>
                  {!BANCO_OPCIONES.includes(form.banco) && <option>{form.banco}</option>}
                  {BANCO_OPCIONES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="cta-tipo">Tipo de cuenta</label>
                <select id="cta-tipo" className="input" value={form.tipo} onChange={e => setField('tipo', e.target.value)}>
                  <option value="corriente">Cuenta corriente</option>
                  <option value="ahorro">Cuenta de ahorro</option>
                  <option value="vista">Cuenta vista / RUT</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cta-moneda">Moneda</label>
                <select id="cta-moneda" className="input" value={form.moneda}
                  onChange={e => setField('moneda', e.target.value)} disabled={modal === 'editar'}>
                  <option value="CLP">Pesos chilenos (CLP)</option>
                  <option value="USD">Dólares (USD)</option>
                  <option value="EUR">Euros (EUR)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="cta-saldo">Saldo al empezar</label>
                <input
                  id="cta-saldo"
                  className="input cifra"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.saldo_inicial}
                  onChange={e => setField('saldo_inicial', e.target.value)}
                  disabled={modal === 'editar'}
                />
              </div>
            </div>
            <p className="ayuda !mt-2">
              {modal === 'nueva'
                ? 'El saldo al empezar es lo que hay hoy en la cuenta, según la cartola. Desde ahí la app suma y resta los movimientos.'
                : 'La moneda y el saldo al empezar no se pueden cambiar, porque todos los saldos se calculan a partir de ellos.'}
            </p>

            <ErrorFormulario texto={error} />

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : modal === 'nueva' ? 'Crear cuenta' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
