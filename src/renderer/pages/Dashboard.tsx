import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { formatMonto, formatMontoCorto, formatFecha, formatPeriodoCorto } from '../utils/format'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

interface Resumen {
  monedaBase: string
  cuentas: { id: number; nombre: string; banco: string; moneda: string; saldo_actual: number }[]
  mes: { ingresos: number; egresos: number; cantidad: number }
  historico: { periodo: string; ingresos: number; egresos: number }[]
  topEgresos: { nombre: string; icono: string; color: string; total: number }[]
  ultimos: {
    id: number; tipo: 'ingreso' | 'egreso'; monto: number; fecha: string
    descripcion: string | null; cuenta_nombre: string; moneda: string; categoria_nombre: string | null; icono: string | null
  }[]
}

const NOMBRE_MES = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

export default function Dashboard() {
  const { data, loading, error } = useApi<Resumen>(() => window.api.getDashboard())

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen financiero de {NOMBRE_MES}</p>
      </div>

      {loading && <Spinner />}
      {error && <p className="text-sm text-expense bg-expense-light px-4 py-3 rounded-lg">{error}</p>}

      {data && data.cuentas.length === 0 && (
        <EmptyState
          icono="🏦"
          titulo="Aún no hay cuentas"
          descripcion="Crea la primera cuenta bancaria para empezar a ver el resumen"
          accion={<Link to="/cuentas" className="btn-primary inline-block">Ir a Cuentas</Link>}
        />
      )}

      {data && data.cuentas.length > 0 && <Contenido data={data} />}
    </div>
  )
}

function Contenido({ data }: { data: Resumen }) {
  // Solo se consolidan cuentas en la moneda base; las demás se muestran aparte por cuenta
  const base = data.monedaBase
  const saldoTotal = data.cuentas.filter(c => c.moneda === base).reduce((s, c) => s + c.saldo_actual, 0)
  const hayOtrasMonedas = data.cuentas.some(c => c.moneda !== base)
  const balanceMes = data.mes.ingresos - data.mes.egresos

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card px-5 py-4 bg-primary-800 border-primary-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-200">Saldo consolidado</p>
          <p className="font-mono text-xl font-semibold text-white mt-1">{formatMonto(saldoTotal, base)}</p>
          <p className="text-xs text-primary-300 mt-0.5">
            {data.cuentas.length} cuenta{data.cuentas.length !== 1 ? 's' : ''}{hayOtrasMonedas ? ` · solo ${base}` : ''}
          </p>
        </div>
        <Kpi titulo="Ingresos del mes" valor={data.mes.ingresos} moneda={base} clase="text-income" />
        <Kpi titulo="Egresos del mes" valor={data.mes.egresos} moneda={base} clase="text-expense" />
        <Kpi
          titulo="Balance del mes"
          valor={balanceMes}
          moneda={base}
          clase={balanceMes >= 0 ? 'text-income' : 'text-expense'}
          nota={`${data.mes.cantidad} movimiento${data.mes.cantidad !== 1 ? 's' : ''}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-800 text-sm">Ingresos vs egresos — últimos 6 meses</h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-income" />Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-expense" />Egresos</span>
            </div>
          </div>
          <GraficoBarras historico={data.historico} moneda={base} />
        </div>

        <div className="card p-5">
          <h2 className="font-medium text-gray-800 text-sm mb-4">Principales gastos del mes</h2>
          {data.topEgresos.length === 0 ? (
            <p className="text-sm text-gray-400">Sin egresos este mes</p>
          ) : (
            <TopEgresos items={data.topEgresos} total={data.mes.egresos} moneda={base} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="font-medium text-gray-800 text-sm">Saldos por cuenta</h2>
            <Link to="/cuentas" className="text-xs text-primary-700 hover:text-primary-900">Ver cuentas →</Link>
          </div>
          <div className="divide-y divide-surface-100">
            {data.cuentas.map(c => (
              <div key={c.id} className="px-5 py-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-400">{c.banco}</p>
                </div>
                <p className={`font-mono text-sm font-semibold ${c.saldo_actual >= 0 ? 'text-gray-800' : 'text-expense'}`}>
                  {formatMonto(c.saldo_actual, c.moneda)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="font-medium text-gray-800 text-sm">Últimos movimientos</h2>
            <Link to="/movimientos" className="text-xs text-primary-700 hover:text-primary-900">Ver todos →</Link>
          </div>
          {data.ultimos.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-gray-400">Todavía no hay movimientos registrados</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {data.ultimos.map(m => (
                <div key={m.id} className="px-5 py-2.5 flex items-center gap-3">
                  <span className="w-6 text-center">{m.icono ?? '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {m.descripcion || m.categoria_nombre || <span className="italic text-gray-400">Sin descripción</span>}
                    </p>
                    <p className="text-xs text-gray-400">{formatFecha(m.fecha)} · {m.cuenta_nombre}</p>
                  </div>
                  <p className={`font-mono text-sm font-semibold ${m.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {m.tipo === 'ingreso' ? '+' : '−'}{formatMonto(m.monto, m.moneda)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ titulo, valor, moneda, clase, nota }: { titulo: string; valor: number; moneda: string; clase: string; nota?: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="label">{titulo}</p>
      <p className={`font-mono text-xl font-semibold ${clase}`}>{formatMonto(valor, moneda)}</p>
      {nota && <p className="text-xs text-gray-400 mt-0.5">{nota}</p>}
    </div>
  )
}

function GraficoBarras({ historico, moneda }: { historico: Resumen['historico']; moneda: string }) {
  const max = Math.max(1, ...historico.flatMap(h => [h.ingresos, h.egresos]))
  const ALTO = 180

  return (
    <div>
      <div className="relative flex items-end gap-3 pl-9" style={{ height: ALTO }}>
        {/* Líneas guía */}
        {[0, 0.5, 1].map(f => (
          <div key={f} className="absolute left-0 right-0 border-t border-dashed border-surface-200" style={{ bottom: f * ALTO }}>
            <span className="absolute -top-2 left-0 text-[10px] text-gray-300 bg-white pr-1">{formatMontoCorto(max * f)}</span>
          </div>
        ))}
        {historico.map(h => (
          <div key={h.periodo} className="relative flex-1 flex items-end justify-center gap-1 h-full">
            <Barra valor={h.ingresos} max={max} clase="bg-income" titulo={`Ingresos ${formatPeriodoCorto(h.periodo)}: ${formatMonto(h.ingresos, moneda)}`} />
            <Barra valor={h.egresos} max={max} clase="bg-expense" titulo={`Egresos ${formatPeriodoCorto(h.periodo)}: ${formatMonto(h.egresos, moneda)}`} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2 pl-9">
        {historico.map(h => (
          <p key={h.periodo} className="flex-1 text-center text-xs text-gray-400 capitalize">{formatPeriodoCorto(h.periodo)}</p>
        ))}
      </div>
    </div>
  )
}

function Barra({ valor, max, clase, titulo }: { valor: number; max: number; clase: string; titulo: string }) {
  const pct = (valor / max) * 100
  return (
    <div
      className={`w-full max-w-[22px] rounded-t ${clase} opacity-80 hover:opacity-100 transition-opacity`}
      style={{ height: valor > 0 ? `max(${pct}%, 2px)` : 0 }}
      title={titulo}
    />
  )
}

function TopEgresos({ items, total, moneda }: { items: Resumen['topEgresos']; total: number; moneda: string }) {
  return (
    <div className="space-y-3">
      {items.map(it => {
        const pct = total > 0 ? (it.total / total) * 100 : 0
        return (
          <div key={it.nombre}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 truncate">{it.icono} {it.nombre}</span>
              <span className="font-mono text-xs text-gray-500 ml-2">{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: it.color }} />
            </div>
            <p className="font-mono text-xs text-gray-400 mt-0.5">{formatMonto(it.total, moneda)}</p>
          </div>
        )
      })}
    </div>
  )
}
