import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, ErrorFormulario, useUI } from './UI'
import { formatMonto, hoy } from '../utils/format'
import { avisarCambioDatos } from '../utils/eventos'

export interface Movimiento {
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

interface Cuenta { id: number; nombre: string; banco: string; moneda: string; activa: number }
interface Categoria { id: number; nombre: string; tipo: string; icono: string }

interface Form {
  cuenta_id: string
  tipo: 'ingreso' | 'egreso'
  monto: string
  fecha: string
  descripcion: string
  categoria_id: string
}

// La última cuenta usada se recuerda para no elegirla cada vez
const CLAVE_ULTIMA_CUENTA = 'finanzas:ultima-cuenta'

function ultimaCuenta(): string {
  try { return localStorage.getItem(CLAVE_ULTIMA_CUENTA) ?? '' } catch { return '' }
}

export default function ModalMovimiento({ movimiento, tipoInicial = 'egreso', onClose }: {
  movimiento?: Movimiento | null
  tipoInicial?: 'ingreso' | 'egreso'
  onClose: () => void
}) {
  const { avisar } = useUI()
  const editando = !!movimiento
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState<Form>(() => movimiento ? {
    cuenta_id: String(movimiento.cuenta_id),
    tipo: movimiento.tipo,
    monto: String(movimiento.monto),
    fecha: movimiento.fecha,
    descripcion: movimiento.descripcion ?? '',
    categoria_id: movimiento.categoria_id ? String(movimiento.categoria_id) : '',
  } : { cuenta_id: '', tipo: tipoInicial, monto: '', fecha: hoy(), descripcion: '', categoria_id: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const montoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([window.api.getCuentas(), window.api.getCategorias()]).then(([cs, cats]) => {
      // Las cuentas archivadas no reciben movimientos nuevos, salvo la del movimiento que se edita
      const disponibles = (cs as Cuenta[]).filter(c => c.activa === 1 || String(c.id) === form.cuenta_id)
      setCuentas(disponibles)
      setCategorias(cats)
      if (!editando) {
        const recordada = ultimaCuenta()
        const elegida = disponibles.find(c => String(c.id) === recordada) ?? disponibles[0]
        if (elegida) setForm(f => ({ ...f, cuenta_id: String(elegida.id) }))
      }
    })
  }, [])

  const set = (k: keyof Form, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(null) }

  function cambiarTipo(t: 'ingreso' | 'egreso') {
    setForm(f => {
      // Si la categoría elegida no aplica al nuevo tipo, se limpia
      const cat = categorias.find(c => String(c.id) === f.categoria_id)
      const sigueValida = !cat || cat.tipo === 'ambos' || cat.tipo === t
      return { ...f, tipo: t, categoria_id: sigueValida ? f.categoria_id : '' }
    })
  }

  const cuenta = cuentas?.find(c => String(c.id) === form.cuenta_id)
  const moneda = cuenta?.moneda ?? 'CLP'
  const monto = parseFloat(form.monto)
  const categoriasDelTipo = categorias.filter(c => c.tipo === 'ambos' || c.tipo === form.tipo)
  const esIngreso = form.tipo === 'ingreso'

  async function guardar(otro: boolean) {
    if (!form.cuenta_id) { setError('Elige la cuenta donde entró o salió el dinero.'); return }
    if (!form.monto || !(monto > 0)) { setError('Escribe un monto mayor a cero.'); montoRef.current?.focus(); return }
    if (!form.fecha) { setError('Elige la fecha del movimiento.'); return }

    setGuardando(true)
    try {
      const payload = {
        cuenta_id: Number(form.cuenta_id),
        tipo: form.tipo,
        monto,
        fecha: form.fecha,
        descripcion: form.descripcion.trim() || null,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      }
      if (editando) await window.api.updateMovimiento(movimiento!.id, payload)
      else await window.api.createMovimiento(payload)
      try { localStorage.setItem(CLAVE_ULTIMA_CUENTA, form.cuenta_id) } catch { /* no es crítico */ }

      avisarCambioDatos()
      avisar(editando ? 'Cambios guardados' : `${esIngreso ? 'Ingreso' : 'Gasto'} de ${formatMonto(monto, moneda)} registrado`)
      if (otro) {
        // Mantiene cuenta, tipo y fecha para cargar varios seguidos
        setForm(f => ({ ...f, monto: '', descripcion: '', categoria_id: '' }))
        montoRef.current?.focus()
      } else {
        onClose()
      }
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar el movimiento.')
    } finally {
      setGuardando(false)
    }
  }

  if (cuentas && cuentas.length === 0) {
    return (
      <Modal titulo="Primero crea una cuenta" onClose={onClose} ancho="max-w-md">
        <p className="text-sm text-ink leading-relaxed">
          Cada movimiento se anota en una cuenta bancaria (o en la caja chica).
          Crea al menos una cuenta y después vuelve a registrar el movimiento.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <Link to="/cuentas?nueva=1" className="btn-primary" onClick={onClose}>Crear una cuenta</Link>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={editando ? 'Editar movimiento' : 'Registrar movimiento'}
      descripcion={editando ? undefined : 'Anota el dinero que entró o salió de una cuenta.'}
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={e => { e.preventDefault(); guardar(false) }}
      >
        <fieldset>
          <legend className="label">¿Entró o salió dinero?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['ingreso', 'egreso'] as const).map(t => {
              const activo = form.tipo === t
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => cambiarTipo(t)}
                  className={`px-4 py-3 rounded-xl text-left border-2 transition-colors ${
                    activo
                      ? t === 'ingreso' ? 'border-income bg-income-light' : 'border-expense bg-expense-light'
                      : 'border-surface-200 bg-white hover:border-surface-300'
                  }`}
                >
                  <span className={`block font-bold ${activo ? (t === 'ingreso' ? 'text-income' : 'text-expense') : 'text-ink'}`}>
                    {t === 'ingreso' ? '↑ Entró dinero' : '↓ Salió dinero'}
                  </span>
                  <span className="block text-xs text-surface-500 mt-0.5">
                    {t === 'ingreso' ? 'Ingreso: cuotas, donaciones, ventas' : 'Gasto: pagos, compras, cuentas'}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3">
            <label className="label" htmlFor="mov-monto">Monto</label>
            <div className="relative">
              <input
                id="mov-monto"
                ref={montoRef}
                className="input cifra text-lg pr-14"
                type="number"
                inputMode="decimal"
                min="0"
                step={moneda === 'CLP' ? '1' : '0.01'}
                placeholder="0"
                value={form.monto}
                onChange={e => set('monto', e.target.value)}
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-surface-500">{moneda}</span>
            </div>
            <p className="ayuda">{monto > 0 ? `Se anotará ${formatMonto(monto, moneda)}` : 'Sin puntos ni signo $'}</p>
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="mov-fecha">Fecha</label>
            <input id="mov-fecha" type="date" className="input" value={form.fecha} max="9999-12-31"
              onChange={e => set('fecha', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="mov-cuenta">Cuenta</label>
          <select id="mov-cuenta" className="input" value={form.cuenta_id} onChange={e => set('cuenta_id', e.target.value)}>
            {!cuentas && <option>Cargando…</option>}
            {cuentas?.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.banco.startsWith('Caja') || c.banco === c.nombre ? '' : `, ${c.banco}`}{c.moneda !== 'CLP' ? ` (${c.moneda})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="mov-categoria">Categoría <span className="font-normal text-surface-500">(opcional)</span></label>
          <select id="mov-categoria" className="input" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
            <option value="">Sin categoría</option>
            {categoriasDelTipo.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
          <p className="ayuda">Sirve para saber en qué se gasta y de dónde viene el dinero.</p>
        </div>

        <div>
          <label className="label" htmlFor="mov-desc">Detalle <span className="font-normal text-surface-500">(opcional)</span></label>
          <input
            id="mov-desc"
            className="input"
            placeholder={esIngreso ? 'ej: Cuota de marzo, familia Pérez' : 'ej: Boleta de luz de la sede'}
            value={form.descripcion}
            onChange={e => set('descripcion', e.target.value)}
            maxLength={200}
          />
        </div>

        <ErrorFormulario texto={error} />

        <div className="flex justify-end gap-2 pt-1 flex-wrap">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          {!editando && (
            <button type="button" className="btn-secondary" disabled={guardando} onClick={() => guardar(true)}>
              Guardar y anotar otro
            </button>
          )}
          <button type="submit" className={esIngreso ? 'btn-income' : 'btn-expense'} disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : esIngreso ? 'Registrar ingreso' : 'Registrar gasto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
