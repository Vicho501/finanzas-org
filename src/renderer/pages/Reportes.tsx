import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatMonto, formatFecha } from '../utils/format'
import Spinner from '../components/Spinner'
import { Encabezado, EstadoVacio, useUI } from '../components/UI'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Reporte {
  mes: number
  anio: number
  monedaBase: string
  cuentas: {
    id: number; nombre: string; banco: string; moneda: string; activa: number
    saldo_inicio_mes: number; ingresos_mes: number; egresos_mes: number; saldo_fin_mes: number
  }[]
  movimientos: { id: number }[]
  porCategoria: { nombre: string; icono: string; color: string; tipo: 'ingreso' | 'egreso'; cantidad: number; total: number }[]
  totales: { saldo_inicio: number; ingresos: number; egresos: number; saldo_fin: number }
}

interface ReporteHistorial {
  id: number
  mes: number
  anio: number
  generado_en: string
  ruta_archivo: string | null
  formato: 'pdf' | 'excel'
  existe: boolean
}

type Guardado = { id: number; ruta: string } | null

export default function Reportes() {
  const { avisar } = useUI()
  const ahora = new Date()
  const [periodo, setPeriodo] = useState({ mes: ahora.getMonth() + 1, anio: ahora.getFullYear() })
  const esMesActual = periodo.mes === ahora.getMonth() + 1 && periodo.anio === ahora.getFullYear()
  const anios = Array.from({ length: 8 }, (_, i) => ahora.getFullYear() - i)

  const { data: reporte, loading } = useApi<Reporte>(
    () => window.api.getReporteMensual(periodo.mes, periodo.anio),
    [periodo.mes, periodo.anio]
  )
  const { data: historial, reload: recargarHistorial } = useApi<ReporteHistorial[]>(
    () => window.api.getHistorialReportes()
  )

  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null)
  const [guardado, setGuardado] = useState<Guardado>(null)

  function cambiarPeriodo(mes: number, anio: number) {
    // No se permiten meses futuros
    if (anio > ahora.getFullYear() || (anio === ahora.getFullYear() && mes > ahora.getMonth() + 1)) {
      mes = ahora.getMonth() + 1
    }
    setGuardado(null)
    setPeriodo({ mes, anio })
  }

  function moverMes(delta: number) {
    const d = new Date(periodo.anio, periodo.mes - 1 + delta, 1)
    cambiarPeriodo(d.getMonth() + 1, d.getFullYear())
  }

  async function exportar(formato: 'pdf' | 'excel') {
    setExportando(formato)
    setGuardado(null)
    try {
      const res = await window.api.exportReporte(periodo.mes, periodo.anio, formato)
      if (res.cancelado) return
      if (res.ok && res.id && res.ruta) {
        setGuardado({ id: res.id, ruta: res.ruta })
        avisar(`Reporte ${formato === 'pdf' ? 'PDF' : 'Excel'} guardado`)
        recargarHistorial()
      } else {
        avisar(res.mensaje ?? 'No se pudo guardar el reporte.', 'error')
      }
    } catch (e: any) {
      avisar(e?.message ?? 'No se pudo guardar el reporte.', 'error')
    } finally {
      setExportando(null)
    }
  }

  async function abrir(id: number) {
    const res = await window.api.abrirReporte(id)
    if (!res.ok) { avisar(res.mensaje ?? 'No se pudo abrir el archivo.', 'error'); recargarHistorial() }
  }

  async function mostrarEnCarpeta(id: number) {
    const res = await window.api.mostrarReporteEnCarpeta(id)
    if (!res.ok) { avisar(res.mensaje ?? 'No se pudo abrir la carpeta.', 'error'); recargarHistorial() }
  }

  async function quitar(id: number) {
    await window.api.quitarReporteDelHistorial(id)
    recargarHistorial()
  }

  const fmt = (n: number) => formatMonto(n, reporte?.monedaBase ?? 'CLP')
  const balance = reporte ? reporte.totales.ingresos - reporte.totales.egresos : 0
  const sinDatos = !!reporte && reporte.cuentas.length === 0
  const nombrePeriodo = `${MESES[periodo.mes - 1]} ${periodo.anio}`

  return (
    <div className="px-10 py-9 max-w-5xl">
      <Encabezado
        titulo="Reportes"
        descripcion="El resumen de cada mes: cuánto había, cuánto entró, cuánto salió y en qué. Guárdalo en PDF para presentarlo o en Excel para trabajarlo."
      />

      {/* Paso 1: elegir el mes. Paso 2: guardarlo */}
      <div className="card px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-3" onClick={() => moverMes(-1)} aria-label="Mes anterior">‹</button>
          <select
            className="input !w-auto font-semibold"
            aria-label="Mes"
            value={periodo.mes}
            onChange={e => cambiarPeriodo(Number(e.target.value), periodo.anio)}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1} disabled={periodo.anio === ahora.getFullYear() && i > ahora.getMonth()}>{m}</option>
            ))}
          </select>
          <select
            className="input !w-auto font-semibold"
            aria-label="Año"
            value={periodo.anio}
            onChange={e => cambiarPeriodo(periodo.mes, Number(e.target.value))}
          >
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn-secondary !px-3" onClick={() => moverMes(1)} disabled={esMesActual} aria-label="Mes siguiente">›</button>
          {esMesActual && (
            <span className="text-xs font-semibold text-caution bg-caution-light px-2.5 py-1 rounded-full ml-1">
              Mes en curso: aún puede cambiar
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportar('excel')} disabled={!!exportando || sinDatos}>
            {exportando === 'excel' ? 'Guardando…' : 'Guardar en Excel'}
          </button>
          <button className="btn-primary" onClick={() => exportar('pdf')} disabled={!!exportando || sinDatos}>
            {exportando === 'pdf' ? 'Guardando…' : 'Guardar en PDF'}
          </button>
        </div>
      </div>

      {guardado && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-income-light text-income flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold">El reporte de {nombrePeriodo} quedó guardado</p>
            <p className="text-xs break-all mt-0.5">{guardado.ruta}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="btn-income" onClick={() => abrir(guardado.id)}>Abrir</button>
            <button className="btn-secondary" onClick={() => mostrarEnCarpeta(guardado.id)}>Ver en carpeta</button>
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {!loading && sinDatos && (
        <EstadoVacio
          icono="📄"
          titulo={`No hay cuentas en ${nombrePeriodo}`}
          descripcion="El reporte se arma con las cuentas y sus movimientos. Elige un mes más reciente o crea una cuenta primero."
        />
      )}

      {!loading && reporte && !sinDatos && (
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="titulo-seccion">Vista previa de {nombrePeriodo}</h2>
            <p className="text-sm text-surface-500 mt-0.5">
              {reporte.movimientos.length === 0
                ? 'No hay movimientos anotados en este mes.'
                : `Basado en ${reporte.movimientos.length} movimiento${reporte.movimientos.length !== 1 ? 's' : ''}.`}
              {reporte.cuentas.some(c => c.moneda !== reporte.monedaBase) && ` Los totales suman solo las cuentas en ${reporte.monedaBase}.`}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-5">
              <Cifra titulo="Había al empezar" valor={fmt(reporte.totales.saldo_inicio)} clase="text-ink" />
              <Cifra titulo="Entró" valor={fmt(reporte.totales.ingresos)} clase="text-income" />
              <Cifra titulo="Salió" valor={fmt(reporte.totales.egresos)} clase="text-expense" />
              <Cifra
                titulo="Quedó al terminar"
                valor={fmt(reporte.totales.saldo_fin)}
                clase={reporte.totales.saldo_fin >= 0 ? 'text-ink' : 'text-expense'}
                nota={balance === 0 ? 'Igual que al empezar' : `${balance > 0 ? 'Subió' : 'Bajó'} ${fmt(Math.abs(balance))}`}
              />
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="titulo-seccion px-6 pt-5 pb-3">Cada cuenta en el mes</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-surface-200 bg-surface-50 text-sm text-surface-500">
                  <th className="text-left px-6 py-2.5 font-semibold">Cuenta</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Al empezar</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Entró</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Salió</th>
                  <th className="text-right px-6 py-2.5 font-semibold">Al terminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {reporte.cuentas.map(c => (
                  <tr key={c.id}>
                    <td className="px-6 py-3">
                      <p className="font-semibold text-ink">{c.nombre}{!c.activa && <span className="text-xs font-normal text-surface-500"> (archivada)</span>}</p>
                      <p className="text-xs text-surface-500">{c.banco}</p>
                    </td>
                    <td className="px-4 py-3 text-right cifra !font-normal text-surface-500">{formatMonto(c.saldo_inicio_mes, c.moneda)}</td>
                    <td className="px-4 py-3 text-right cifra !font-normal text-income">{formatMonto(c.ingresos_mes, c.moneda)}</td>
                    <td className="px-4 py-3 text-right cifra !font-normal text-expense">{formatMonto(c.egresos_mes, c.moneda)}</td>
                    <td className="px-6 py-3 text-right cifra text-ink">{formatMonto(c.saldo_fin_mes, c.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['ingreso', 'egreso'] as const).map(tipo => {
              const items = reporte.porCategoria.filter(c => c.tipo === tipo)
              const total = tipo === 'ingreso' ? reporte.totales.ingresos : reporte.totales.egresos
              return (
                <section key={tipo} className="card p-6">
                  <h2 className="titulo-seccion mb-4">
                    {tipo === 'ingreso' ? '¿De dónde vino el dinero?' : '¿En qué se gastó?'}
                  </h2>
                  {items.length === 0 ? (
                    <p className="text-sm text-surface-500">No hay {tipo === 'ingreso' ? 'ingresos' : 'gastos'} en este mes.</p>
                  ) : (
                    <ul className="space-y-3.5">
                      {items.map(c => {
                        const pct = total > 0 ? (c.total / total) * 100 : 0
                        return (
                          <li key={c.nombre}>
                            <div className="flex justify-between items-baseline gap-2 text-sm">
                              <span className="text-ink font-semibold truncate">{c.icono} {c.nombre}</span>
                              <span className="cifra text-ink">{fmt(c.total)}</span>
                            </div>
                            <div className="h-2 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                            </div>
                            <p className="text-xs text-surface-500 mt-1">
                              {pct < 1 ? 'Menos del 1%' : `${Math.round(pct)}%`}, en {c.cantidad} movimiento{c.cantidad !== 1 ? 's' : ''}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}

      {historial && historial.length > 0 && (
        <section className="mt-10">
          <h2 className="titulo-seccion mb-1">Reportes guardados antes</h2>
          <p className="text-sm text-surface-500 mb-3">Quitar uno de esta lista no borra el archivo.</p>
          <ul className="card divide-y divide-surface-100">
            {historial.map(h => (
              <li key={h.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xl" aria-hidden>{h.formato === 'pdf' ? '📄' : '📊'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">
                    {MESES[h.mes - 1]} {h.anio}, en {h.formato === 'pdf' ? 'PDF' : 'Excel'}
                  </p>
                  <p className={`text-xs truncate ${h.existe ? 'text-surface-500' : 'text-expense'}`} title={h.ruta_archivo ?? ''}>
                    {h.existe ? `Guardado el ${formatFecha(h.generado_en.slice(0, 10))}` : 'El archivo se movió o se borró'}
                  </p>
                </div>
                <div className="flex gap-1">
                  {h.existe && (
                    <>
                      <button className="btn-fila" onClick={() => abrir(h.id)}>Abrir</button>
                      <button className="btn-fila" onClick={() => mostrarEnCarpeta(h.id)}>Ver en carpeta</button>
                    </>
                  )}
                  <button className="btn-fila text-surface-500" onClick={() => quitar(h.id)}>Quitar</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Cifra({ titulo, valor, clase, nota }: { titulo: string; valor: string; clase: string; nota?: string }) {
  return (
    <div>
      <p className="text-sm text-surface-500">{titulo}</p>
      <p className={`cifra text-xl mt-0.5 ${clase}`}>{valor}</p>
      {nota && <p className="text-xs text-surface-500 mt-0.5">{nota}</p>}
    </div>
  )
}
