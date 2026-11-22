import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatMonto, formatFecha, hoy, primerDiaMes } from '../utils/format'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

interface Movimiento {
  id: number
  cuenta_id: number
  cuenta_nombre: string
  moneda: string
  categoria_id: number | null
  tipo: 'ingreso' | 'egreso'
  monto: number
  fecha: string
  descripcion: string | null
  categoria_nombre: string | null
  icono: string | null
  color: string | null
}

interface Cuenta { id: number; nombre: string; moneda: string; activa: number }
interface Categoria { id: number; nombre: string; tipo: string; icono: string; color: string }

interface Filtros {
  cuenta_id: string
  tipo: string
  fecha_desde: string
  fecha_hasta: string
}

interface FormMov {
  cuenta_id: string
  tipo: 'ingreso' | 'egreso'
  monto: string
  fecha: string
  descripcion: string
  categoria_id: string
}

const FORM_VACÍO: FormMov = {
  cuenta_id: '', tipo: 'egreso', monto: '', fecha: hoy(), descripcion: '', categoria_id: '',
}

export default function Movimientos() {
  const [filtros, setFiltros] = useState<Filtros>({
    cuenta_id: '', tipo: '', fecha_desde: primerDiaMes(), fecha_hasta: hoy(),
  })

  const { data: movimientos, loading, reload } = useApi<Movimiento[]>(
    () => window.api.getMovimientos({
      cuenta_id: filtros.cuenta_id ? Number(filtros.cuenta_id) : undefined,
      tipo: filtros.tipo || undefined,
      fecha_desde: filtros.fecha_desde || undefined,
      fecha_hasta: filtros.fecha_hasta || undefined,
    }),
    [filtros]
  )

  const { data: todasCuentas } = useApi<Cuenta[]>(() => window.api.getCuentas())
  // Las cuentas archivadas no reciben movimientos nuevos (sí se pueden filtrar)
  const cuentas = todasCuentas?.filter(c => c.activa === 1)
  const { data: categorias } = useApi<Categoria[]>(() => window.api.getCategorias())

  const [modal, setModal] = useState<'nuevo' | 'editar' | null>(null)
  const [movEditar, setMovEditar] = useState<Movimiento | null>(null)
  const [form, setForm] = useState<FormMov>(FORM_VACÍO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(k: keyof FormMov, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setFiltro(k: keyof Filtros, v: string) {
    setFiltros(f => ({ ...f, [k]: v }))
  }

  function abrirNuevo() {
    const primeraCuenta = cuentas?.[0]
    setForm({ ...FORM_VACÍO, cuenta_id: primeraCuenta ? String(primeraCuenta.id) : '' })
    setError(null)
    setModal('nuevo')
  }

  function abrirEditar(mov: Movimiento) {
    setMovEditar(mov)
    setForm({
      cuenta_id: String(mov.cuenta_id),
      tipo: mov.tipo,
      monto: String(mov.monto),
      fecha: mov.fecha,
      descripcion: mov.descripcion ?? '',
      categoria_id: mov.categoria_id ? String(mov.categoria_id) : '',
    })
    setError(null)
    setModal('editar')
  }

  function cerrarModal() {
    setModal(null)
    setMovEditar(null)
    setError(null)
  }

  async function guardar() {
    if (!form.cuenta_id) { setError('Selecciona una cuenta'); return }
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return }
    if (!form.fecha) { setError('La fecha es obligatoria'); return }

    setGuardando(true)
    setError(null)
    try {
      const payload = {
        cuenta_id: Number(form.cuenta_id),
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        fecha: form.fecha,
        descripcion: form.descripcion.trim() || null,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      }
      if (modal === 'nuevo') {
        await window.api.createMovimiento(payload)
      } else if (movEditar) {
        await window.api.updateMovimiento(movEditar.id, payload)
      }
      cerrarModal()
      reload()
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(mov: Movimiento) {
    if (!confirm(`¿Eliminar este movimiento de ${formatMonto(mov.monto)}?`)) return
    await window.api.deleteMovimiento(mov.id)
    reload()
  }

  const totalIngresos = movimientos?.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0) ?? 0
  const totalEgresos  = movimientos?.filter(m => m.tipo === 'egreso').reduce((s, m)  => s + m.monto, 0) ?? 0
  const balance = totalIngresos - totalEgresos

  const categoriasFiltradas = categorias?.filter(c =>
    c.tipo === 'ambos' || c.tipo === form.tipo
  ) ?? []

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Movimientos</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresos y egresos registrados</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo movimiento</button>
      </div>

      {/* Filtros */}
      <div className="card px-5 py-4 mb-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Cuenta</label>
            <select className="input" value={filtros.cuenta_id} onChange={e => setFiltro('cuenta_id', e.target.value)}>
              <option value="">Todas las cuentas</option>
              {todasCuentas?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={filtros.tipo} onChange={e => setFiltro('tipo', e.target.value)}>
              <option value="">Todos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="egreso">Solo egresos</option>
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Resumen período */}
      {!loading && movimientos && movimientos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card px-4 py-3">
            <p className="label text-income">Ingresos</p>
            <p className="font-mono font-semibold text-income text-base">{formatMonto(totalIngresos)}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="label text-expense">Egresos</p>
            <p className="font-mono font-semibold text-expense text-base">{formatMonto(totalEgresos)}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="label">Balance</p>
            <p className={`font-mono font-semibold text-base ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatMonto(balance)}
            </p>
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {!loading && (!movimientos || movimientos.length === 0) && (
        <EmptyState
          icono="↕️"
          titulo="Sin movimientos en este período"
          descripcion="Registra el primer ingreso o egreso de tu organización"
          accion={<button className="btn-primary" onClick={abrirNuevo}>+ Nuevo movimiento</button>}
        />
      )}

      {/* Tabla de movimientos */}
      {!loading && movimientos && movimientos.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-100">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-400">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-400">Descripción</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-400">Cuenta</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-400">Categoría</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-400">Monto</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {movimientos.map(mov => (
                <tr key={mov.id} className="hover:bg-surface-50 group transition-colors">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                    {formatFecha(mov.fecha)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mov.tipo === 'ingreso' ? 'bg-income' : 'bg-expense'}`} />
                      <span className="text-gray-700 truncate max-w-[200px]">
                        {mov.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{mov.cuenta_nombre}</td>
                  <td className="px-4 py-3">
                    {mov.categoria_nombre ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <span>{mov.icono}</span> {mov.categoria_nombre}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold text-sm ${mov.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '−'}{formatMonto(mov.monto, mov.moneda)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => abrirEditar(mov)} className="p-1.5 rounded text-gray-400 hover:bg-surface-200 hover:text-gray-700" title="Editar">✏️</button>
                      <button onClick={() => eliminar(mov)} className="p-1.5 rounded text-gray-400 hover:bg-expense-light hover:text-expense" title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-surface-100 bg-surface-50">
            <p className="text-xs text-gray-400">{movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} encontrado{movimientos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Modal nuevo / editar */}
      {modal && (
        <Modal
          titulo={modal === 'nuevo' ? 'Nuevo movimiento' : 'Editar movimiento'}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            {/* Tipo — toggle prominente */}
            <div>
              <label className="label">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ingreso', 'egreso'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => {
                      // Si la categoría elegida no aplica al nuevo tipo, se limpia
                      const cat = categorias?.find(c => String(c.id) === f.categoria_id)
                      const sigueValida = !cat || cat.tipo === 'ambos' || cat.tipo === t
                      return { ...f, tipo: t, categoria_id: sigueValida ? f.categoria_id : '' }
                    })}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.tipo === t
                        ? t === 'ingreso'
                          ? 'bg-income text-white border-income'
                          : 'bg-expense text-white border-expense'
                        : 'bg-white text-gray-500 border-surface-300 hover:border-surface-400'
                    }`}
                  >
                    {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Monto *</label>
                <input
                  className="input font-mono"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.monto}
                  onChange={e => setField('monto', e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Fecha *</label>
                <input type="date" className="input" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Cuenta *</label>
              <select className="input" value={form.cuenta_id} onChange={e => setField('cuenta_id', e.target.value)}>
                <option value="">Seleccionar cuenta…</option>
                {todasCuentas?.filter(c => c.activa === 1 || String(c.id) === form.cuenta_id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria_id} onChange={e => setField('categoria_id', e.target.value)}>
                <option value="">Sin categoría</option>
                {categoriasFiltradas.map(c => (
                  <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Descripción</label>
              <input
                className="input"
                placeholder="Descripción opcional"
                value={form.descripcion}
                onChange={e => setField('descripcion', e.target.value)}
                maxLength={200}
              />
            </div>

            {error && <p className="text-xs text-expense bg-expense-light px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : modal === 'nuevo' ? 'Registrar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
