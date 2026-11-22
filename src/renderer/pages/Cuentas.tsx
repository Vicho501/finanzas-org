import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatMonto } from '../utils/format'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
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
  corriente: 'Cuenta corriente',
  ahorro: 'Cuenta de ahorro',
  vista: 'Cuenta vista',
}

const BANCO_OPCIONES = [
  'Banco de Chile', 'Banco Estado', 'Santander', 'BCI', 'Falabella',
  'Scotiabank', 'Itaú', 'Security', 'Consorcio', 'Coopeuch', 'Otro',
]

interface FormCuenta {
  nombre: string
  banco: string
  tipo: string
  moneda: string
  saldo_inicial: string
}

const FORM_VACÍO: FormCuenta = {
  nombre: '', banco: 'Banco Estado', tipo: 'corriente', moneda: 'CLP', saldo_inicial: '0',
}

export default function Cuentas() {
  const { data: cuentas, loading, reload } = useApi<Cuenta[]>(() => window.api.getCuentas())
  const [modal, setModal] = useState<'nueva' | 'editar' | null>(null)
  const [cuentaEditar, setCuentaEditar] = useState<Cuenta | null>(null)
  const [form, setForm] = useState<FormCuenta>(FORM_VACÍO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function abrirNueva() {
    setForm(FORM_VACÍO)
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
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.banco.trim())  { setError('El banco es obligatorio'); return }
    setGuardando(true)
    setError(null)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        banco: form.banco.trim(),
        tipo: form.tipo,
        moneda: form.moneda,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      }
      if (modal === 'nueva') {
        await window.api.createCuenta(payload)
      } else if (cuentaEditar) {
        await window.api.updateCuenta(cuentaEditar.id, payload)
      }
      cerrarModal()
      reload()
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function archivar(cuenta: Cuenta) {
    if (!confirm(`¿Archivar la cuenta "${cuenta.nombre}"? No se perderán sus movimientos.`)) return
    await window.api.archiveCuenta(cuenta.id)
    reload()
  }

  const activasFiltradas = cuentas?.filter(c => c.activa === 1) ?? []
  const archivadas = cuentas?.filter(c => c.activa === 0) ?? []
  const totalGeneral = activasFiltradas.reduce((s, c) => s + c.saldo_actual, 0)

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Cuentas bancarias</h1>
          <p className="text-sm text-gray-500 mt-1">Administra las cuentas de la organización</p>
        </div>
        <button className="btn-primary" onClick={abrirNueva}>+ Nueva cuenta</button>
      </div>

      {loading && <Spinner />}

      {!loading && activasFiltradas.length === 0 && (
        <EmptyState
          icono="🏦"
          titulo="Sin cuentas registradas"
          descripcion="Agrega la primera cuenta bancaria de tu organización"
          accion={<button className="btn-primary" onClick={abrirNueva}>+ Nueva cuenta</button>}
        />
      )}

      {!loading && activasFiltradas.length > 0 && (
        <>
          {/* Resumen total */}
          <div className="card px-5 py-4 mb-5 flex items-center justify-between bg-primary-800 border-primary-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-200">Saldo total consolidado</p>
              <p className="font-mono text-2xl font-semibold text-white mt-0.5">{formatMonto(totalGeneral)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-300">{activasFiltradas.length} cuenta{activasFiltradas.length !== 1 ? 's' : ''} activa{activasFiltradas.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Lista de cuentas */}
          <div className="space-y-3">
            {activasFiltradas.map(cuenta => (
              <div key={cuenta.id} className="card px-5 py-4 flex items-center gap-4 hover:border-primary-200 transition-colors">
                {/* Ícono */}
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
                  🏦
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{cuenta.nombre}</p>
                    <span className="text-xs text-gray-400 bg-surface-100 px-2 py-0.5 rounded-full">
                      {TIPO_LABELS[cuenta.tipo] ?? cuenta.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{cuenta.banco} · {cuenta.moneda} · {cuenta.total_movimientos} movimiento{cuenta.total_movimientos !== 1 ? 's' : ''}</p>
                </div>
                {/* Saldo */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-mono font-semibold text-sm ${cuenta.saldo_actual >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatMonto(cuenta.saldo_actual, cuenta.moneda)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">saldo actual</p>
                </div>
                {/* Acciones */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => abrirEditar(cuenta)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-surface-100 hover:text-gray-700 transition-colors text-sm"
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => archivar(cuenta)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-surface-100 hover:text-gray-700 transition-colors text-sm"
                    title="Archivar"
                  >📁</button>
                </div>
              </div>
            ))}
          </div>

          {/* Archivadas */}
          {archivadas.length > 0 && (
            <details className="mt-6">
              <summary className="text-xs font-semibold uppercase tracking-wide text-gray-400 cursor-pointer hover:text-gray-600">
                Cuentas archivadas ({archivadas.length})
              </summary>
              <div className="mt-3 space-y-2 opacity-60">
                {archivadas.map(cuenta => (
                  <div key={cuenta.id} className="card px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-600 text-sm">{cuenta.nombre}</p>
                      <p className="text-xs text-gray-400">{cuenta.banco}</p>
                    </div>
                    <p className="font-mono text-sm text-gray-500">{formatMonto(cuenta.saldo_actual, cuenta.moneda)}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Modal nueva / editar */}
      {modal && (
        <Modal
          titulo={modal === 'nueva' ? 'Nueva cuenta bancaria' : 'Editar cuenta'}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Nombre de la cuenta *</label>
              <input className="input" placeholder="ej: Cuenta operaciones" value={form.nombre} onChange={e => setField('nombre', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Banco *</label>
                <select className="input" value={form.banco} onChange={e => setField('banco', e.target.value)}>
                  {BANCO_OPCIONES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo} onChange={e => setField('tipo', e.target.value)}>
                  <option value="corriente">Cuenta corriente</option>
                  <option value="ahorro">Cuenta de ahorro</option>
                  <option value="vista">Cuenta vista</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Moneda</label>
                <select className="input" value={form.moneda} onChange={e => setField('moneda', e.target.value)}>
                  <option value="CLP">CLP — Peso chileno</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div>
                <label className="label">Saldo inicial {modal === 'editar' ? '(solo lectura)' : ''}</label>
                <input
                  className="input font-mono"
                  type="number"
                  min="0"
                  value={form.saldo_inicial}
                  onChange={e => setField('saldo_inicial', e.target.value)}
                  disabled={modal === 'editar'}
                />
              </div>
            </div>

            {error && <p className="text-xs text-expense bg-expense-light px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : modal === 'nueva' ? 'Crear cuenta' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
