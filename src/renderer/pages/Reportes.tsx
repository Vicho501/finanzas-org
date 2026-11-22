import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { formatMonto, formatFecha } from '../utils/format'
import Spinner from '../components/Spinner'

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

type Aviso = { tipo: 'ok' | 'error'; texto: string; id?: number } | null

export default function Reportes() {
  const ahora = new Date()
  const [periodo, setPeriodo] = useState({ mes: ahora.getMonth() + 1, anio: ahora.getFullYear() })
  const esMesActual = periodo.mes === ahora.getMonth() + 1 && periodo.anio === ahora.getFullYear()

  const { data: reporte, loading } = useApi<Reporte>(
    () => window.api.getReporteMensual(periodo.mes, periodo.anio),
    [periodo.mes, periodo.anio]
  )
  const { data: historial, reload: recargarHistorial } = useApi<ReporteHistorial[]>(
    () => window.api.getHistorialReportes()
  )

  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)

  function moverMes(delta: number) {
    setAviso(null)
    setPeriodo(p => {
      const d = new Date(p.anio, p.mes - 1 + delta, 1)
      return { mes: d.getMonth() + 1, anio: d.getFullYear() }
    })
  }

  async function exportar(formato: 'pdf' | 'excel') {
    setExportando(formato)
    setAviso(null)
    try {
      const res = await window.api.exportReporte(periodo.mes, periodo.anio, formato)
      if (res.cancelado) return
      if (res.ok) {
        setAviso({ tipo: 'ok', texto: `Reporte guardado en ${res.ruta}`, id: res.id })
        recargarHistorial()
      } else {
        setAviso({ tipo: 'error', texto: res.mensaje ?? 'No se pudo exportar el reporte' })
      }
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e?.message ?? 'Error al exportar' })
    } finally {
      setExportando(null)
    }
  }

  async function abrir(id: number) {
    const res = await window.api.abrirReporte(id)
    if (!res.ok) { setAviso({ tipo: 'error', texto: res.mensaje ?? 'No se pudo abrir' }); recargarHistorial() }
  }

  async function mostrarEnCarpeta(id: number) {
    const res = await window.api.mostrarReporteEnCarpeta(id)
    if (!res.ok) { setAviso({ tipo: 'error', texto: res.mensaje ?? 'No se pudo abrir la carpeta' }); recargarHistorial() }
  }

  async function quitar(id: number) {
    await window.api.quitarReporteDelHistorial(id)
    recargarHistorial()
  }

  const fmt = (n: number) => formatMonto(n, reporte?.monedaBase ?? 'CLP')
  const balance = reporte ? reporte.totales.ingresos - reporte.totales.egresos : 0
  const sinDatos = reporte && reporte.cuentas.length === 0

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Reporte mensual exportable a PDF y Excel</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportar('excel')} disabled={!!exportando || !!sinDatos}>
            {exportando === 'excel' ? 'Generando…' : '📊 Exportar Excel'}
          </button>
          <button className="btn-primary" onClick={() => exportar('pdf')} disabled={!!exportando || !!sinDatos}>
            {exportando === 'pdf' ? 'Generando…' : '📄 Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <div className="card px-4 py-3 mb-5 flex items-center justify-between">
        <button className="btn-secondary !px-3" onClick={() => moverMes(-1)} title="Mes anterior">←</button>
        <div className="flex items-center gap-2">
          <select
            className="input !w-auto font-medium"
            value={periodo.mes}
            onChange={e => { setAviso(null); setPeriodo(p => ({ ...p, mes: Number(e.target.value) })) }}
          >
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input
            type="number"
            className="input !w-24 font-mono"
            value={periodo.anio}
            min={2000}
            max={ahora.getFullYear()}
            onChange={e => {
              const anio = Number(e.target.value)
              if (anio >= 2000 && anio <= ahora.getFullYear()) { setAviso(null); setPeriodo(p => ({ ...p, anio })) }
            }}
          />
          {esMesActual && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Mes en curso</span>}
        </div>
        <button className="btn-secondary !px-3" onClick={() => moverMes(1)} disabled={esMesActual} title="Mes siguiente">→</button>
      </div>

      {aviso && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3 ${
          aviso.tipo === 'ok' ? 'bg-income-light text-income' : 'bg-expense-light text-expense'
        }`}>
          <span className="break-all">{aviso.texto}</span>
          {aviso.id && (
            <div className="flex gap-2 flex-shrink-0">
              <button className="underline" onClick={() => abrir(aviso.id!)}>Abrir</button>
              <button className="underline" onClick={() => mostrarEnCarpeta(aviso.id!)}>Ver en carpeta</button>
            </div>
          )}
        </div>
      )}

      {loading && <Spinner />}

      {!loading && sinDatos && (
        <div className="card p-10 text-center text-sm text-gray-400">
          No hay cuentas creadas a esa fecha. Crea una cuenta para generar reportes.
        </div>
      )}

      {!loading && reporte && !sinDatos && (
        <div className="space-y-5">
          {/* Totales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi titulo="Saldo inicial" valor={fmt(reporte.totales.saldo_inicio)} clase="text-gray-800" />
            <Kpi titulo="Ingresos" valor={fmt(reporte.totales.ingresos)} clase="text-income" />
            <Kpi titulo="Egresos" valor={fmt(reporte.totales.egresos)} clase="text-expense" />
            <Kpi
              titulo="Saldo final"
              valor={fmt(reporte.totales.saldo_fin)}
              clase={reporte.totales.saldo_fin >= 0 ? 'text-gray-800' : 'text-expense'}
              nota={`Balance ${balance >= 0 ? '+' : ''}${fmt(balance)} · ${reporte.movimientos.length} mov.`}
            />
          </div>
          {reporte.cuentas.some(c => c.moneda !== reporte.monedaBase) && (
            <p className="text-xs text-gray-400 -mt-3">Los totales consideran solo cuentas en {reporte.monedaBase}.</p>
          )}

          {/* Cuentas */}
          <div className="card overflow-hidden">
            <h2 className="px-5 pt-4 pb-2 font-medium text-gray-800 text-sm">Saldos por cuenta</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-surface-200 bg-surface-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="text-left px-5 py-2 font-semibold">Cuenta</th>
                  <th className="text-right px-4 py-2 font-semibold">Inicial</th>
                  <th className="text-right px-4 py-2 font-semibold">Ingresos</th>
                  <th className="text-right px-4 py-2 font-semibold">Egresos</th>
                  <th className="text-right px-5 py-2 font-semibold">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 font-mono">
                {reporte.cuentas.map(c => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5 font-sans">
                      <p className="text-gray-800">{c.nombre}{!c.activa && <span className="text-xs text-gray-400"> (archivada)</span>}</p>
                      <p className="text-xs text-gray-400">{c.banco}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatMonto(c.saldo_inicio_mes, c.moneda)}</td>
                    <td className="px-4 py-2.5 text-right text-income">{formatMonto(c.ingresos_mes, c.moneda)}</td>
                    <td className="px-4 py-2.5 text-right text-expense">{formatMonto(c.egresos_mes, c.moneda)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{formatMonto(c.saldo_fin_mes, c.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Categorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(['ingreso', 'egreso'] as const).map(tipo => {
              const items = reporte.porCategoria.filter(c => c.tipo === tipo)
              const total = tipo === 'ingreso' ? reporte.totales.ingresos : reporte.totales.egresos
              return (
                <div key={tipo} className="card p-5">
                  <h2 className="font-medium text-gray-800 text-sm mb-3">
                    {tipo === 'ingreso' ? 'Ingresos' : 'Egresos'} por categoría
                  </h2>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin {tipo === 'ingreso' ? 'ingresos' : 'egresos'} en el período</p>
                  ) : (
                    <div className="space-y-2.5">
                      {items.map(c => {
                        const pct = total > 0 ? (c.total / total) * 100 : 0
                        return (
                          <div key={c.nombre}>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700 truncate">{c.icono} {c.nombre} <span className="text-xs text-gray-400">({c.cantidad})</span></span>
                              <span className="font-mono text-gray-600 ml-2">{fmt(c.total)}</span>
                            </div>
                            <div className="h-1.5 bg-surface-100 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      {historial && historial.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Reportes generados</h2>
          <div className="card divide-y divide-surface-100">
            {historial.map(h => (
              <div key={h.id} className="px-4 py-2.5 flex items-center gap-3 group">
                <span className="text-lg">{h.formato === 'pdf' ? '📄' : '📊'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    {MESES[h.mes - 1]} {h.anio}
                    <span className="text-xs text-gray-400 ml-2 uppercase">{h.formato === 'pdf' ? 'PDF' : 'Excel'}</span>
                  </p>
                  <p className={`text-xs truncate ${h.existe ? 'text-gray-400' : 'text-expense'}`} title={h.ruta_archivo ?? ''}>
                    {h.existe ? h.ruta_archivo : 'Archivo movido o eliminado'} · {formatFecha(h.generado_en.slice(0, 10))}
                  </p>
                </div>
                <div className="flex gap-1 text-xs">
                  {h.existe && (
                    <>
                      <button className="px-2 py-1 rounded text-primary-700 hover:bg-surface-100" onClick={() => abrir(h.id)}>Abrir</button>
                      <button className="px-2 py-1 rounded text-primary-700 hover:bg-surface-100" onClick={() => mostrarEnCarpeta(h.id)}>Carpeta</button>
                    </>
                  )}
                  <button
                    className="px-2 py-1 rounded text-gray-400 hover:bg-surface-100 opacity-0 group-hover:opacity-100"
                    onClick={() => quitar(h.id)}
                    title="Quitar del historial (no borra el archivo)"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ titulo, valor, clase, nota }: { titulo: string; valor: string; clase: string; nota?: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="label">{titulo}</p>
      <p className={`font-mono text-lg font-semibold ${clase}`}>{valor}</p>
      {nota && <p className="text-xs text-gray-400 mt-0.5">{nota}</p>}
    </div>
  )
}
