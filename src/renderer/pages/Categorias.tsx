import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'

type TipoCategoria = 'ingreso' | 'egreso' | 'ambos'

interface Categoria {
  id: number
  nombre: string
  tipo: TipoCategoria
  color: string
  icono: string
  activa: number
  total_movimientos: number
}

interface FormCategoria {
  nombre: string
  tipo: TipoCategoria
  color: string
  icono: string
}

const SECCIONES: { tipo: TipoCategoria; titulo: string }[] = [
  { tipo: 'ingreso', titulo: 'Ingresos' },
  { tipo: 'egreso', titulo: 'Egresos' },
  { tipo: 'ambos', titulo: 'Ingresos y egresos' },
]

const COLORES = ['#2d7a5b', '#8b2e2e', '#245d84', '#7a6020', '#6b4c9a', '#b4562a', '#3f7f8c', '#5b5b5b']
const ICONOS = ['💰', '🤝', '🏛️', '↩️', '➕', '👥', '🏢', '💡', '📦', '🚗', '🔧', '🏦', '➖', '🔄', '📋', '🎓', '🍽️', '💻', '📣', '⚖️', '🩺', '🎁']

const COLOR_POR_TIPO: Record<TipoCategoria, string> = {
  ingreso: '#2d7a5b', egreso: '#8b2e2e', ambos: '#7a6020',
}

export default function Categorias() {
  const { data: categorias, loading, reload } = useApi<Categoria[]>(() => window.api.getCategoriasConUso())
  const [modal, setModal] = useState<'nueva' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [form, setForm] = useState<FormCategoria>({ nombre: '', tipo: 'egreso', color: COLOR_POR_TIPO.egreso, icono: '📋' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activas = categorias?.filter(c => c.activa === 1) ?? []
  const archivadas = categorias?.filter(c => c.activa === 0) ?? []

  function abrirNueva(tipo: TipoCategoria = 'egreso') {
    setEditando(null)
    setForm({ nombre: '', tipo, color: COLOR_POR_TIPO[tipo], icono: '📋' })
    setError(null)
    setModal('nueva')
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat)
    setForm({ nombre: cat.nombre, tipo: cat.tipo, color: cat.color, icono: cat.icono })
    setError(null)
    setModal('editar')
  }

  function cerrarModal() {
    setModal(null)
    setEditando(null)
    setError(null)
  }

  async function guardar() {
    const nombre = form.nombre.trim()
    if (!nombre) { setError('El nombre es obligatorio'); return }
    const duplicada = categorias?.some(c =>
      c.id !== editando?.id && c.nombre.toLowerCase() === nombre.toLowerCase()
    )
    if (duplicada) { setError('Ya existe una categoría con ese nombre'); return }

    setGuardando(true)
    setError(null)
    try {
      const payload = { ...form, nombre }
      if (modal === 'nueva') await window.api.createCategoria(payload)
      else if (editando) await window.api.updateCategoria(editando.id, payload)
      cerrarModal()
      reload()
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarActiva(cat: Categoria, activa: boolean) {
    if (!activa && !confirm(
      `¿Archivar "${cat.nombre}"? No aparecerá al registrar movimientos nuevos, ` +
      `pero los ${cat.total_movimientos} movimiento(s) existentes la conservan.`
    )) return
    await window.api.setCategoriaActiva(cat.id, activa)
    reload()
  }

  // Cambiar el tipo de una categoría en uso podría dejar movimientos con una categoría incompatible
  const cambioTipoRiesgoso =
    modal === 'editar' && editando && editando.total_movimientos > 0 &&
    form.tipo !== editando.tipo && form.tipo !== 'ambos'

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">Personaliza las categorías de movimientos</p>
        </div>
        <button className="btn-primary" onClick={() => abrirNueva()}>+ Nueva categoría</button>
      </div>

      {loading && <Spinner />}

      {!loading && (
        <div className="space-y-6">
          {SECCIONES.map(sec => {
            const items = activas.filter(c => c.tipo === sec.tipo)
            return (
              <section key={sec.tipo}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {sec.titulo} <span className="text-gray-300">({items.length})</span>
                  </h2>
                  <button
                    className="text-xs text-primary-700 hover:text-primary-900"
                    onClick={() => abrirNueva(sec.tipo)}
                  >+ Agregar</button>
                </div>
                {items.length === 0 ? (
                  <div className="card px-5 py-4 text-sm text-gray-400">Sin categorías de este tipo</div>
                ) : (
                  <div className="card divide-y divide-surface-100">
                    {items.map(cat => (
                      <div key={cat.id} className="px-4 py-3 flex items-center gap-3 group hover:bg-surface-50">
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: cat.color + '1f' }}
                        >{cat.icono}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{cat.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {cat.total_movimientos} movimiento{cat.total_movimientos !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirEditar(cat)} className="p-1.5 rounded text-gray-400 hover:bg-surface-200" title="Editar">✏️</button>
                          <button onClick={() => cambiarActiva(cat, false)} className="p-1.5 rounded text-gray-400 hover:bg-surface-200" title="Archivar">📁</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {archivadas.length > 0 && (
            <details>
              <summary className="text-xs font-semibold uppercase tracking-wide text-gray-400 cursor-pointer hover:text-gray-600">
                Categorías archivadas ({archivadas.length})
              </summary>
              <div className="card mt-3 divide-y divide-surface-100">
                {archivadas.map(cat => (
                  <div key={cat.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="opacity-50">{cat.icono}</span>
                    <p className="flex-1 text-sm text-gray-500">{cat.nombre}</p>
                    <button className="text-xs text-primary-700 hover:text-primary-900" onClick={() => cambiarActiva(cat, true)}>
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {modal && (
        <Modal titulo={modal === 'nueva' ? 'Nueva categoría' : 'Editar categoría'} onClose={cerrarModal}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: form.color + '1f' }}
              >{form.icono}</span>
              <div className="flex-1">
                <label className="label">Nombre *</label>
                <input
                  className="input"
                  placeholder="ej: Capacitaciones"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  maxLength={40}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {SECCIONES.map(s => (
                  <button
                    key={s.tipo}
                    onClick={() => setForm(f => ({ ...f, tipo: s.tipo }))}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.tipo === s.tipo
                        ? 'bg-primary-800 text-white border-primary-800'
                        : 'bg-white text-gray-500 border-surface-300 hover:border-surface-400'
                    }`}
                  >{s.titulo}</button>
                ))}
              </div>
              {cambioTipoRiesgoso && (
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                  Esta categoría ya tiene {editando!.total_movimientos} movimiento(s). Cambiar su tipo puede dejar
                  algunos de ellos con una categoría que no corresponde.
                </p>
              )}
            </div>

            <div>
              <label className="label">Ícono</label>
              <div className="grid grid-cols-11 gap-1">
                {ICONOS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setForm(f => ({ ...f, icono: ic }))}
                    className={`h-8 rounded-lg text-base transition-colors ${
                      form.icono === ic ? 'bg-primary-100 ring-2 ring-primary-500' : 'hover:bg-surface-100'
                    }`}
                  >{ic}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Color</label>
              <div className="flex gap-2">
                {COLORES.map(col => (
                  <button
                    key={col}
                    onClick={() => setForm(f => ({ ...f, color: col }))}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      form.color === col ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: col }}
                    title={col}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-expense bg-expense-light px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : modal === 'nueva' ? 'Crear categoría' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
