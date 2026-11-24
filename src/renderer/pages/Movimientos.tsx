import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatMonto, formatFecha, hoy, primerDiaMes } from '../utils/format'
import { avisarCambioDatos } from '../utils/eventos'
import { Encabezado, EstadoVacio, useUI } from '../components/UI'
import Spinner from '../components/Spinner'
import ModalMovimiento, { type Movimiento } from '../components/ModalMovimiento'

interface Cuenta { id: number; nombre: string; moneda: string; activa: number }

interface Filtros {
  cuenta_id: string
  tipo: string
  fecha_desde: string
  fecha_hasta: string
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Atajos de período: lo más común es mirar este mes o el anterior
function periodos(): { id: string; label: string; desde: string; hasta: string }[] {
  const n = new Date()
  return [
    { id: 'mes', label: 'Este mes', desde: primerDiaMes(), hasta: hoy() },
    { id: 'anterior', label: 'Mes pasado',
      desde: ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)), hasta: ymd(new Date(n.getFullYear(), n.getMonth(), 0)) },
    { id: 'anio', label: 'Este año', desde: `${n.getFullYear()}-01-01`, hasta: hoy() },
    { id: 'todo', label: 'Todo', desde: '', hasta: '' },
  ]
}

export default function Movimientos() {
  const { confirmar, avisar } = useUI()
  const [filtros, setFiltros] = useState<Filtros>({
    cuenta_id: '', tipo: '', fecha_desde: primerDiaMes(), fecha_hasta: hoy(),
  })
  const [busqueda, setBusqueda] = useState('')
  const [verFechas, setVerFechas] = useState(false)
  const [monedaBase, setMonedaBase] = useState('CLP')

  const { data: movimientos, loading } = useApi<Movimiento[]>(
    () => window.api.getMovimientos({
      cuenta_id: filtros.cuenta_id ? Number(filtros.cuenta_id) : undefined,
      tipo: filtros.tipo || undefined,
      fecha_desde: filtros.fecha_desde || undefined,
      fecha_hasta: filtros.fecha_hasta || undefined,
    }),
    [filtros]
  )
  const { data: cuentas } = useApi<Cuenta[]>(() => window.api.getCuentas())
  useEffect(() => { window.api.getConfig('moneda_base').then(m => setMonedaBase(m ?? 'CLP')) }, [])

  const [modal, setModal] = useState<{ tipo?: 'ingreso' | 'egreso'; mov?: Movimiento } | null>(null)

  const setFiltro = (k: keyof Filtros, v: string) => setFiltros(f => ({ ...f, [k]: v }))
  const periodoActivo = periodos().find(p => p.desde === filtros.fecha_desde && p.hasta === filtros.fecha_hasta)?.id

  async function eliminar(mov: Movimiento) {
    const ok = await confirmar({
      titulo: '¿Eliminar este movimiento?',
      mensaje: <>
        <p>
          Se borrará el {mov.tipo === 'ingreso' ? 'ingreso' : 'gasto'} de <strong>{formatMonto(mov.monto, mov.moneda)}</strong> del{' '}
          {formatFecha(mov.fecha)} en {mov.cuenta_nombre}
          {mov.descripcion && <> ("{mov.descripcion}")</>}.
        </p>
        <p className="mt-2 text-surface-500">El saldo de la cuenta se recalcula. Esta acción no se puede deshacer.</p>
      </>,
      confirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    await window.api.deleteMovimiento(mov.id)
    avisar('Movimiento eliminado')
    avisarCambioDatos()
  }

  const texto = busqueda.trim().toLowerCase()
  const visibles = (movimientos ?? []).filter(m => !texto ||
    [m.descripcion, m.categoria_nombre, m.cuenta_nombre].some(v => v?.toLowerCase().includes(texto)))

  // Los totales solo suman la moneda base; si se filtra por una cuenta, se usa su moneda
  const cuentaFiltrada = cuentas?.find(c => String(c.id) === filtros.cuenta_id)
  const monedaTotales = cuentaFiltrada?.moneda ?? monedaBase
  const paraTotales = visibles.filter(m => m.moneda === monedaTotales)
  const excluidos = visibles.length - paraTotales.length
  const totalIngresos = paraTotales.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalEgresos = paraTotales.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const balance = totalIngresos - totalEgresos
  const hayFiltros = !!(filtros.cuenta_id || filtros.tipo || texto)

  return (
    <div className="px-10 py-9 max-w-6xl">
      <Encabezado
        titulo="Movimientos"
        descripcion="Todo el dinero que entró y salió de las cuentas."
        acciones={<>
          <button className="btn-income" onClick={() => setModal({ tipo: 'ingreso' })}>↑ Anotar ingreso</button>
          <button className="btn-expense" onClick={() => setModal({ tipo: 'egreso' })}>↓ Anotar gasto</button>
        </>}
      />

      {/* Filtros */}
      <div className="card px-5 py-4 mb-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink mr-1">Período</span>
          {periodos().map(p => (
            <button
              key={p.id}
              aria-pressed={periodoActivo === p.id}
              onClick={() => { setFiltros(f => ({ ...f, fecha_desde: p.desde, fecha_hasta: p.hasta })); setVerFechas(false) }}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                periodoActivo === p.id
                  ? 'bg-primary-800 text-white border-primary-800'
                  : 'bg-white text-ink border-surface-300 hover:border-surface-400'
              }`}
            >{p.label}</button>
          ))}
          <button
            aria-pressed={!periodoActivo || verFechas}
            onClick={() => setVerFechas(v => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              !periodoActivo ? 'bg-primary-800 text-white border-primary-800' : 'bg-white text-ink border-surface-300 hover:border-surface-400'
            }`}
          >Elegir fechas…</button>
        </div>

        {(verFechas || !periodoActivo) && (
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="label" htmlFor="f-desde">Desde</label>
              <input id="f-desde" type="date" className="input" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-hasta">Hasta</label>
              <input id="f-hasta" type="date" className="input" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="f-buscar">Buscar</label>
            <input id="f-buscar" className="input" placeholder="Detalle, categoría o cuenta"
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-cuenta">Cuenta</label>
            <select id="f-cuenta" className="input" value={filtros.cuenta_id} onChange={e => setFiltro('cuenta_id', e.target.value)}>
              <option value="">Todas las cuentas</option>
              {cuentas?.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activa ? '' : ' (archivada)'}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-tipo">Mostrar</label>
            <select id="f-tipo" className="input" value={filtros.tipo} onChange={e => setFiltro('tipo', e.target.value)}>
              <option value="">Ingresos y gastos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="egreso">Solo gastos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totales del período */}
      {!loading && visibles.length > 0 && (
        <div className="card px-6 py-4 mb-5">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-surface-500">Entró</p>
              <p className="cifra text-lg text-income">{formatMonto(totalIngresos, monedaTotales)}</p>
            </div>
            <div>
              <p className="text-sm text-surface-500">Salió</p>
              <p className="cifra text-lg text-expense">{formatMonto(totalEgresos, monedaTotales)}</p>
            </div>
            <div>
              <p className="text-sm text-surface-500">Diferencia</p>
              <p className={`cifra text-lg ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
                {balance > 0 ? '+' : ''}{formatMonto(balance, monedaTotales)}
              </p>
            </div>
          </div>
          {excluidos > 0 && (
            <p className="text-xs text-surface-500 mt-3">
              Los totales suman solo {monedaTotales}. {excluidos} movimiento{excluidos !== 1 ? 's' : ''} en otra moneda no se incluye{excluidos !== 1 ? 'n' : ''}.
            </p>
          )}
        </div>
      )}

      {loading && <Spinner />}

      {!loading && visibles.length === 0 && (
        hayFiltros || (movimientos?.length ?? 0) > 0 ? (
          <EstadoVacio
            icono="🔍"
            titulo="No hay movimientos que coincidan"
            descripcion="Prueba con otro período, otra cuenta o borra la búsqueda."
            accion={<button className="btn-secondary" onClick={() => {
              setBusqueda('')
              setFiltros({ cuenta_id: '', tipo: '', fecha_desde: '', fecha_hasta: '' })
            }}>Ver todos los movimientos</button>}
          />
        ) : (
          <EstadoVacio
            icono="↕️"
            titulo="No hay movimientos en este período"
            descripcion="Anota cada vez que entra o sale dinero: cuotas, donaciones, pagos de cuentas, compras."
            accion={<div className="flex gap-2 justify-center">
              <button className="btn-income" onClick={() => setModal({ tipo: 'ingreso' })}>↑ Anotar ingreso</button>
              <button className="btn-expense" onClick={() => setModal({ tipo: 'egreso' })}>↓ Anotar gasto</button>
            </div>}
          />
        )
      )}

      {!loading && visibles.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-left text-sm text-surface-500">
                <th className="px-5 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Detalle</th>
                <th className="px-4 py-3 font-semibold">Cuenta</th>
                <th className="px-4 py-3 font-semibold text-right">Monto</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {visibles.map(mov => (
                <tr key={mov.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 text-surface-500 whitespace-nowrap">{formatFecha(mov.fecha)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0" aria-hidden>
                        {mov.icono ?? (mov.tipo === 'ingreso' ? '↑' : '↓')}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate max-w-[280px]">
                          {mov.descripcion || mov.categoria_nombre || (mov.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}
                        </p>
                        <p className="text-xs text-surface-500">
                          {mov.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                          {mov.categoria_nombre && mov.descripcion ? `, ${mov.categoria_nombre}` : ''}
                          {!mov.categoria_nombre && ', sin categoría'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-500">{mov.cuenta_nombre}</td>
                  <td className={`px-4 py-3 text-right cifra whitespace-nowrap ${mov.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '−'}{formatMonto(mov.monto, mov.moneda)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button className="btn-fila" onClick={() => setModal({ mov })}>Editar</button>
                    <button className="btn-fila-peligro" onClick={() => eliminar(mov)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-2.5 border-t border-surface-100 bg-surface-50">
            <p className="text-xs text-surface-500">
              {visibles.length} movimiento{visibles.length !== 1 ? 's' : ''}
              {texto && movimientos && visibles.length !== movimientos.length && ` de ${movimientos.length} en el período`}
            </p>
          </div>
        </div>
      )}

      {modal && (
        <ModalMovimiento movimiento={modal.mov} tipoInicial={modal.tipo} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
