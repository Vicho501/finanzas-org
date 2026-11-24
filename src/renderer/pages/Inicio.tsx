import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { formatMonto, formatMontoCorto, formatFecha, formatPeriodoCorto } from '../utils/format'
import Spinner from '../components/Spinner'
import ModalMovimiento from '../components/ModalMovimiento'

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

const MES_ACTUAL = new Date().toLocaleDateString('es-CL', { month: 'long' })
const CLAVE_GUIA_OCULTA = 'finanzas:guia-oculta'

function saludo(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Inicio() {
  const { data, loading, error } = useApi<Resumen>(() => window.api.getDashboard())
  const { data: historial } = useApi<unknown[]>(() => window.api.getHistorialReportes())
  const [registrar, setRegistrar] = useState<'ingreso' | 'egreso' | null>(null)

  return (
    <div className="px-10 py-9 max-w-6xl">
      {loading && <Spinner />}
      {error && <p className="text-sm text-expense bg-expense-light px-4 py-3 rounded-lg">{error}</p>}

      {data && (
        <>
          <PrimerosPasos
            tieneCuentas={data.cuentas.length > 0}
            tieneMovimientos={data.ultimos.length > 0}
            tieneReportes={(historial?.length ?? 0) > 0}
            onRegistrar={() => setRegistrar('ingreso')}
          />
          {data.cuentas.length > 0 && <Contenido data={data} onRegistrar={setRegistrar} />}
        </>
      )}

      {registrar && <ModalMovimiento tipoInicial={registrar} onClose={() => setRegistrar(null)} />}
    </div>
  )
}

/* ---------- Guía de primeros pasos (es una secuencia real: cuenta → movimiento → reporte) ---------- */

function PrimerosPasos({ tieneCuentas, tieneMovimientos, tieneReportes, onRegistrar }: {
  tieneCuentas: boolean; tieneMovimientos: boolean; tieneReportes: boolean; onRegistrar: () => void
}) {
  const [oculta, setOculta] = useState(() => {
    try { return localStorage.getItem(CLAVE_GUIA_OCULTA) === '1' } catch { return false }
  })
  const completa = tieneCuentas && tieneMovimientos && tieneReportes
  // Sin cuentas la guía es lo único útil en pantalla, así que no se puede ocultar
  if (completa || (oculta && tieneCuentas)) return null

  const pasos = [
    {
      hecho: tieneCuentas,
      titulo: 'Crea la primera cuenta',
      texto: 'Una cuenta por cada banco, más una para la caja chica si manejan efectivo.',
      accion: <Link to="/cuentas?nueva=1" className="btn-primary">Crear cuenta</Link>,
    },
    {
      hecho: tieneMovimientos,
      titulo: 'Anota lo que entra y sale',
      texto: 'Cada cuota, donación, pago o compra. Con eso la app calcula los saldos sola.',
      accion: <button className="btn-primary" onClick={onRegistrar}>Registrar movimiento</button>,
    },
    {
      hecho: tieneReportes,
      titulo: 'Genera el reporte del mes',
      texto: 'Un PDF o Excel listo para presentar en la asamblea o a la directiva.',
      accion: <Link to="/reportes" className="btn-primary">Ir a reportes</Link>,
    },
  ]
  const siguiente = pasos.findIndex(p => !p.hecho)

  return (
    <section className="card p-7 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-ink">
            {tieneCuentas ? 'Ya casi está todo listo' : 'Bienvenido a FinanzasOrg'}
          </h2>
          <p className="text-sm text-surface-500 mt-1">
            Tres pasos para llevar las finanzas de la organización en orden.
          </p>
        </div>
        {tieneCuentas && (
          <button
            className="btn-fila text-surface-500"
            onClick={() => { try { localStorage.setItem(CLAVE_GUIA_OCULTA, '1') } catch { /* */ } setOculta(true) }}
          >Ocultar guía</button>
        )}
      </div>
      <ol className="grid md:grid-cols-3 gap-3">
        {pasos.map((p, i) => {
          const actual = i === siguiente
          return (
            <li key={p.titulo}
              className={`rounded-xl p-5 border-2 flex flex-col ${
                actual ? 'border-primary-700 bg-primary-50' : 'border-surface-200'
              }`}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  p.hecho ? 'bg-income text-white' : actual ? 'bg-primary-800 text-white' : 'bg-surface-200 text-surface-500'
                }`}>{p.hecho ? '✓' : i + 1}</span>
                <h3 className={`font-bold ${p.hecho ? 'text-surface-500 line-through' : 'text-ink'}`}>{p.titulo}</h3>
              </div>
              <p className="text-sm text-surface-500 flex-1">{p.texto}</p>
              {actual && <div className="mt-4">{p.accion}</div>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* ---------- Resumen ---------- */

function Contenido({ data, onRegistrar }: { data: Resumen; onRegistrar: (t: 'ingreso' | 'egreso') => void }) {
  // Solo se consolidan cuentas en la moneda base; las demás se muestran aparte
  const base = data.monedaBase
  const enBase = data.cuentas.filter(c => c.moneda === base)
  const otras = data.cuentas.filter(c => c.moneda !== base)
  const saldoTotal = enBase.reduce((s, c) => s + c.saldo_actual, 0)
  const balanceMes = data.mes.ingresos - data.mes.egresos

  return (
    <div className="space-y-6">
      {/* La respuesta principal, en palabras */}
      <section className="pb-2">
        <p className="text-base text-surface-500">{saludo()}. Hoy la organización tiene</p>
        <p className={`cifra text-[3.25rem] leading-tight tracking-tight mt-1 ${saldoTotal < 0 ? 'text-expense' : 'text-ink'}`}>
          {formatMonto(saldoTotal, base)}
        </p>
        <p className="text-base text-surface-500 mt-1">
          sumando {enBase.length === 1 ? 'su cuenta' : `sus ${enBase.length} cuentas`} en {base}
          {otras.length > 0 && (
            <>, y además {otras.map((c, i) => (
              <span key={c.id}>
                {i > 0 && (i === otras.length - 1 ? ' y ' : ', ')}
                <span className="cifra text-ink">{formatMonto(c.saldo_actual, c.moneda)}</span> en {c.nombre}
              </span>
            ))}</>
          )}.
        </p>
        <div className="flex gap-2 mt-5">
          <button className="btn-income" onClick={() => onRegistrar('ingreso')}>↑ Anotar un ingreso</button>
          <button className="btn-expense" onClick={() => onRegistrar('egreso')}>↓ Anotar un gasto</button>
        </div>
      </section>

      {/* Este mes */}
      <section className="card p-6">
        <h2 className="titulo-seccion">¿Cómo va {MES_ACTUAL}?</h2>
        <div className="grid grid-cols-3 gap-6 mt-4">
          <Cifra titulo="Entró" valor={formatMonto(data.mes.ingresos, base)} clase="text-income" />
          <Cifra titulo="Salió" valor={formatMonto(data.mes.egresos, base)} clase="text-expense" />
          <Cifra
            titulo={balanceMes >= 0 ? 'Quedó a favor' : 'Se gastó de más'}
            valor={formatMonto(Math.abs(balanceMes), base)}
            clase={balanceMes >= 0 ? 'text-income' : 'text-expense'}
          />
        </div>
        <p className="text-sm text-surface-500 mt-4">
          {data.mes.cantidad === 0
            ? `Todavía no hay movimientos anotados en ${MES_ACTUAL}.`
            : balanceMes >= 0
              ? `Este mes entró más dinero del que salió, según ${data.mes.cantidad} movimiento${data.mes.cantidad !== 1 ? 's' : ''} anotado${data.mes.cantidad !== 1 ? 's' : ''}.`
              : `Este mes salió más dinero del que entró, según ${data.mes.cantidad} movimiento${data.mes.cantidad !== 1 ? 's' : ''} anotado${data.mes.cantidad !== 1 ? 's' : ''}.`}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="card p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h2 className="titulo-seccion">Los últimos 6 meses</h2>
            <div className="flex gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-income" />Entró</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-expense" />Salió</span>
            </div>
          </div>
          <GraficoBarras historico={data.historico} moneda={base} />
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="titulo-seccion mb-4">¿En qué se gastó más este mes?</h2>
          {data.topEgresos.length === 0 ? (
            <p className="text-sm text-surface-500">No hay gastos anotados este mes.</p>
          ) : (
            <TopEgresos items={data.topEgresos} total={data.mes.egresos} moneda={base} />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="titulo-seccion">Saldo de cada cuenta</h2>
            <Link to="/cuentas" className="btn-fila">Ver cuentas</Link>
          </div>
          <ul className="divide-y divide-surface-100">
            {data.cuentas.map(c => (
              <li key={c.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{c.nombre}</p>
                  <p className="text-xs text-surface-500">{c.banco}</p>
                </div>
                <p className={`cifra ${c.saldo_actual >= 0 ? 'text-ink' : 'text-expense'}`}>
                  {formatMonto(c.saldo_actual, c.moneda)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="titulo-seccion">Lo último que se anotó</h2>
            <Link to="/movimientos" className="btn-fila">Ver todos</Link>
          </div>
          {data.ultimos.length === 0 ? (
            <p className="px-6 pb-5 text-sm text-surface-500">Todavía no hay movimientos.</p>
          ) : (
            <ul className="divide-y divide-surface-100">
              {data.ultimos.map(m => (
                <li key={m.id} className="px-6 py-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0" aria-hidden>
                    {m.icono ?? (m.tipo === 'ingreso' ? '↑' : '↓')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">
                      {m.descripcion || m.categoria_nombre || (m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}
                    </p>
                    <p className="text-xs text-surface-500">{formatFecha(m.fecha)}, {m.cuenta_nombre}</p>
                  </div>
                  <p className={`cifra ${m.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {m.tipo === 'ingreso' ? '+' : '−'}{formatMonto(m.monto, m.moneda)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Cifra({ titulo, valor, clase }: { titulo: string; valor: string; clase: string }) {
  return (
    <div>
      <p className="text-sm text-surface-500">{titulo}</p>
      <p className={`cifra text-xl mt-0.5 ${clase}`}>{valor}</p>
    </div>
  )
}

function GraficoBarras({ historico, moneda }: { historico: Resumen['historico']; moneda: string }) {
  const max = Math.max(1, ...historico.flatMap(h => [h.ingresos, h.egresos]))
  const ALTO = 180

  return (
    <div>
      <div className="relative flex items-end gap-3 pl-10" style={{ height: ALTO }}>
        {[0, 0.5, 1].map(f => (
          <div key={f} className="absolute left-0 right-0 border-t border-dashed border-surface-200" style={{ bottom: f * ALTO }}>
            <span className="absolute -top-2.5 left-0 text-xs text-surface-400 bg-white pr-1">{formatMontoCorto(max * f)}</span>
          </div>
        ))}
        {historico.map(h => (
          <div key={h.periodo} className="relative flex-1 flex items-end justify-center gap-1 h-full">
            <Barra valor={h.ingresos} max={max} clase="bg-income" titulo={`Entró en ${formatPeriodoCorto(h.periodo)}: ${formatMonto(h.ingresos, moneda)}`} />
            <Barra valor={h.egresos} max={max} clase="bg-expense" titulo={`Salió en ${formatPeriodoCorto(h.periodo)}: ${formatMonto(h.egresos, moneda)}`} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2 pl-10">
        {historico.map(h => (
          <p key={h.periodo} className="flex-1 text-center text-xs text-surface-500">{formatPeriodoCorto(h.periodo)}</p>
        ))}
      </div>
    </div>
  )
}

function Barra({ valor, max, clase, titulo }: { valor: number; max: number; clase: string; titulo: string }) {
  const pct = (valor / max) * 100
  return (
    <div
      className={`w-full max-w-[24px] rounded-t ${clase} opacity-90 hover:opacity-100 transition-opacity`}
      style={{ height: valor > 0 ? `max(${pct}%, 2px)` : 0 }}
      title={titulo}
    />
  )
}

function TopEgresos({ items, total, moneda }: { items: Resumen['topEgresos']; total: number; moneda: string }) {
  return (
    <ul className="space-y-4">
      {items.map(it => {
        const pct = total > 0 ? (it.total / total) * 100 : 0
        return (
          <li key={it.nombre}>
            <div className="flex items-baseline justify-between gap-2 text-sm mb-1.5">
              <span className="text-ink font-semibold truncate">{it.icono} {it.nombre}</span>
              <span className="cifra text-ink">{formatMonto(it.total, moneda)}</span>
            </div>
            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: it.color }} />
            </div>
            <p className="text-xs text-surface-500 mt-1">{pct < 1 ? 'Menos del 1%' : `${Math.round(pct)}%`} de lo que salió</p>
          </li>
        )
      })}
    </ul>
  )
}
