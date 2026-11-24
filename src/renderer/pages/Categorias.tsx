import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { Encabezado, ErrorFormulario, Modal, useUI } from '../components/UI'
import { avisarCambioDatos } from '../utils/eventos'

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

const SECCIONES: { tipo: TipoCategoria; titulo: string; boton: string; ayuda: string }[] = [
  { tipo: 'ingreso', titulo: 'Para ingresos', boton: 'Ingresos', ayuda: 'De dónde viene el dinero' },
  { tipo: 'egreso', titulo: 'Para gastos', boton: 'Gastos', ayuda: 'En qué se gasta' },
  { tipo: 'ambos', titulo: 'Para ingresos y gastos', boton: 'Ambos', ayuda: 'Sirven en los dos casos, como traspasos o ajustes' },
]

const COLORES = ['#1c7a4e', '#b4372f', '#1e4d6b', '#8a5a00', '#6b4c9a', '#b4562a', '#2f7f8c', '#5b6670']
const ICONOS = ['💰', '🤝', '🏛️', '↩️', '➕', '👥', '🏢', '💡', '📦', '🚗', '🔧', '🏦', '➖', '🔄', '📋', '🎓', '🍽️', '💻', '📣', '⚖️', '🩺', '🎁']

const COLOR_POR_TIPO: Record<TipoCategoria, string> = {
  ingreso: '#1c7a4e', egreso: '#b4372f', ambos: '#8a5a00',
}

export default function Categorias() {
  const { confirmar, avisar } = useUI()
  const { data: categorias, loading } = useApi<Categoria[]>(() => window.api.getCategoriasConUso())
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
    if (!nombre) { setError('Escribe un nombre para la categoría.'); return }
    const duplicada = categorias?.some(c =>
      c.id !== editando?.id && c.nombre.toLowerCase() === nombre.toLowerCase()
    )
    if (duplicada) { setError(`Ya existe una categoría llamada "${nombre}". Usa otro nombre.`); return }

    setGuardando(true)
    setError(null)
    try {
      const payload = { ...form, nombre }
      if (modal === 'nueva') await window.api.createCategoria(payload)
      else if (editando) await window.api.updateCategoria(editando.id, payload)
      avisar(modal === 'nueva' ? `Categoría "${nombre}" creada` : 'Cambios guardados')
      cerrarModal()
      avisarCambioDatos()
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la categoría.')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarActiva(cat: Categoria, activa: boolean) {
    if (!activa) {
      const ok = await confirmar({
        titulo: `¿Archivar "${cat.nombre}"?`,
        mensaje: <>
          <p>Ya no aparecerá al anotar movimientos nuevos.</p>
          {cat.total_movimientos > 0 && (
            <p className="mt-2 text-surface-500">
              Los {cat.total_movimientos} movimientos que ya la usan la conservan. Puedes restaurarla cuando quieras.
            </p>
          )}
        </>,
        confirmar: 'Archivar categoría',
      })
      if (!ok) return
    }
    await window.api.setCategoriaActiva(cat.id, activa)
    avisar(activa ? `"${cat.nombre}" restaurada` : `"${cat.nombre}" archivada`)
    avisarCambioDatos()
  }

  // Cambiar el tipo de una categoría en uso podría dejar movimientos con una categoría incompatible
  const cambioTipoRiesgoso =
    modal === 'editar' && editando && editando.total_movimientos > 0 &&
    form.tipo !== editando.tipo && form.tipo !== 'ambos'

  return (
    <div className="px-10 py-9 max-w-4xl">
      <Encabezado
        titulo="Categorías"
        descripcion="Agrupan los movimientos para saber de dónde viene el dinero y en qué se gasta. Aparecen en el inicio y en los reportes."
        acciones={<button className="btn-primary" onClick={() => abrirNueva()}>+ Nueva categoría</button>}
      />

      {loading && <Spinner />}

      {!loading && (
        <div className="space-y-8">
          {SECCIONES.map(sec => {
            const items = activas.filter(c => c.tipo === sec.tipo)
            return (
              <section key={sec.tipo}>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h2 className="titulo-seccion">{sec.titulo}</h2>
                    <p className="text-sm text-surface-500">{sec.ayuda}</p>
                  </div>
                  <button className="btn-fila" onClick={() => abrirNueva(sec.tipo)}>+ Agregar aquí</button>
                </div>
                {items.length === 0 ? (
                  <div className="card px-5 py-4 text-sm text-surface-500">Todavía no hay categorías de este tipo.</div>
                ) : (
                  <ul className="card divide-y divide-surface-100">
                    {items.map(cat => (
                      <li key={cat.id} className="px-4 py-3 flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: cat.color + '1f' }}
                          aria-hidden
                        >{cat.icono}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink truncate">{cat.nombre}</p>
                          <p className="text-xs text-surface-500">
                            {cat.total_movimientos === 0
                              ? 'Sin usar todavía'
                              : `Usada en ${cat.total_movimientos} movimiento${cat.total_movimientos !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} aria-hidden />
                        <div className="flex gap-1">
                          <button onClick={() => abrirEditar(cat)} className="btn-fila">Editar</button>
                          <button onClick={() => cambiarActiva(cat, false)} className="btn-fila text-surface-500">Archivar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}

          {archivadas.length > 0 && (
            <details>
              <summary className="text-sm font-semibold text-surface-500 cursor-pointer hover:text-ink select-none">
                Categorías archivadas ({archivadas.length})
              </summary>
              <ul className="card mt-3 divide-y divide-surface-100">
                {archivadas.map(cat => (
                  <li key={cat.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="opacity-50" aria-hidden>{cat.icono}</span>
                    <p className="flex-1 text-sm text-surface-500">{cat.nombre}</p>
                    <button className="btn-fila" onClick={() => cambiarActiva(cat, true)}>Restaurar</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {modal && (
        <Modal titulo={modal === 'nueva' ? 'Nueva categoría' : 'Editar categoría'} onClose={cerrarModal}>
          <form className="space-y-5" onSubmit={e => { e.preventDefault(); guardar() }}>
            <div className="flex items-end gap-3">
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: form.color + '1f' }}
                aria-hidden
              >{form.icono}</span>
              <div className="flex-1">
                <label className="label" htmlFor="cat-nombre">Nombre</label>
                <input
                  id="cat-nombre"
                  className="input"
                  placeholder="ej: Cuotas sociales, Arriendo de la sede"
                  value={form.nombre}
                  onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setError(null) }}
                  maxLength={40}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <p className="label">¿Para qué movimientos sirve?</p>
              <div className="grid grid-cols-3 gap-2">
                {SECCIONES.map(s => (
                  <button
                    key={s.tipo}
                    type="button"
                    aria-pressed={form.tipo === s.tipo}
                    onClick={() => setForm(f => ({ ...f, tipo: s.tipo }))}
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      form.tipo === s.tipo
                        ? 'bg-primary-800 text-white border-primary-800'
                        : 'bg-white text-ink border-surface-300 hover:border-surface-400'
                    }`}
                  >{s.boton}</button>
                ))}
              </div>
              {cambioTipoRiesgoso && (
                <p className="text-sm text-caution bg-caution-light px-3 py-2.5 rounded-lg mt-2">
                  Esta categoría ya se usa en {editando!.total_movimientos} movimiento(s). Si cambias el tipo, algunos
                  podrían quedar con una categoría que no corresponde.
                </p>
              )}
            </div>

            <div>
              <p className="label">Ícono</p>
              <div className="grid grid-cols-11 gap-1">
                {ICONOS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={`Ícono ${ic}`}
                    aria-pressed={form.icono === ic}
                    onClick={() => setForm(f => ({ ...f, icono: ic }))}
                    className={`h-9 rounded-lg text-lg transition-colors ${
                      form.icono === ic ? 'bg-primary-100 ring-2 ring-primary-500' : 'hover:bg-surface-100'
                    }`}
                  >{ic}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Color</p>
              <div className="flex gap-2">
                {COLORES.map(col => (
                  <button
                    key={col}
                    type="button"
                    aria-label={`Color ${col}`}
                    aria-pressed={form.color === col}
                    onClick={() => setForm(f => ({ ...f, color: col }))}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.color === col ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <ErrorFormulario texto={error} />

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : modal === 'nueva' ? 'Crear categoría' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
