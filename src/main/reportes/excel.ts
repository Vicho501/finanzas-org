import ExcelJS from 'exceljs'
import { ReporteMensual, MESES } from './datos'

const COLOR_PRIMARIO = 'FF1E4D6B'
const COLOR_INGRESO = 'FF2D7A5B'
const COLOR_EGRESO = 'FF8B2E2E'
const COLOR_FONDO = 'FFF7F6F2'

function formatoMoneda(moneda: string): string {
  if (moneda === 'CLP') return '"$"#,##0;[Red]-"$"#,##0'
  return `#,##0.00 "${moneda}";[Red]-#,##0.00 "${moneda}"`
}

function estilarEncabezado(fila: ExcelJS.Row) {
  fila.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } }
    c.alignment = { vertical: 'middle' }
  })
  fila.height = 20
}

export async function generarExcel(r: ReporteMensual): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'FinanzasOrg'
  wb.created = new Date()
  const titulo = `${MESES[r.mes - 1]} ${r.anio}`
  const fmtBase = formatoMoneda(r.monedaBase)

  // ── Hoja 1: Resumen ──────────────────────────────────────────
  const res = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
  res.columns = [
    { key: 'a', width: 30 }, { key: 'b', width: 20 }, { key: 'c', width: 18 },
    { key: 'd', width: 18 }, { key: 'e', width: 18 }, { key: 'f', width: 18 },
  ]
  res.mergeCells('A1:F1')
  res.getCell('A1').value = r.organizacion
  res.getCell('A1').font = { bold: true, size: 16, color: { argb: COLOR_PRIMARIO } }
  res.mergeCells('A2:F2')
  res.getCell('A2').value = `Reporte mensual — ${titulo}`
  res.getCell('A2').font = { size: 12, color: { argb: 'FF6B7280' } }

  const kpis: [string, number, string][] = [
    ['Saldo inicial', r.totales.saldo_inicio, COLOR_PRIMARIO],
    ['Ingresos', r.totales.ingresos, COLOR_INGRESO],
    ['Egresos', r.totales.egresos, COLOR_EGRESO],
    ['Balance del mes', r.totales.ingresos - r.totales.egresos, COLOR_PRIMARIO],
    ['Saldo final', r.totales.saldo_fin, COLOR_PRIMARIO],
  ]
  kpis.forEach(([label, valor, color], i) => {
    const fila = res.getRow(4 + i)
    fila.getCell(1).value = label
    fila.getCell(1).font = { color: { argb: 'FF6B7280' } }
    fila.getCell(2).value = valor
    fila.getCell(2).numFmt = fmtBase
    fila.getCell(2).font = { bold: true, color: { argb: color } }
  })
  if (r.cuentas.some(c => c.moneda !== r.monedaBase)) {
    res.getCell('A10').value = `Los totales consideran solo cuentas en ${r.monedaBase}.`
    res.getCell('A10').font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
  }

  const filaCab = 12
  res.getCell(`A${filaCab - 1}`).value = 'Saldos por cuenta'
  res.getCell(`A${filaCab - 1}`).font = { bold: true, size: 12, color: { argb: COLOR_PRIMARIO } }
  const cab = res.getRow(filaCab)
  cab.values = ['Cuenta', 'Banco', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final']
  estilarEncabezado(cab)

  r.cuentas.forEach((c, i) => {
    const n = filaCab + 1 + i
    const fila = res.getRow(n)
    fila.values = [
      c.nombre + (c.activa ? '' : ' (archivada)'), c.banco,
      c.saldo_inicio_mes, c.ingresos_mes, c.egresos_mes,
      { formula: `C${n}+D${n}-E${n}`, result: c.saldo_fin_mes },
    ]
    const fmt = formatoMoneda(c.moneda)
    for (let col = 3; col <= 6; col++) fila.getCell(col).numFmt = fmt
    fila.getCell(4).font = { color: { argb: COLOR_INGRESO } }
    fila.getCell(5).font = { color: { argb: COLOR_EGRESO } }
  })

  const nTotal = filaCab + 1 + r.cuentas.length
  const total = res.getRow(nTotal)
  total.getCell(1).value = 'Total'
  ;(['saldo_inicio', 'ingresos', 'egresos', 'saldo_fin'] as const).forEach((k, i) => {
    const cell = total.getCell(3 + i)
    cell.value = r.totales[k]
    cell.numFmt = fmtBase
  })
  total.eachCell(c => {
    c.font = { bold: true }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FONDO } }
    c.border = { top: { style: 'thin', color: { argb: 'FFCCC6B8' } } }
  })

  // ── Hoja 2: Categorías ───────────────────────────────────────
  const cat = wb.addWorksheet('Por categoría')
  cat.columns = [
    { header: 'Categoría', key: 'nombre', width: 28 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'N° movimientos', key: 'cantidad', width: 16 },
    { header: 'Total', key: 'total', width: 18, style: { numFmt: fmtBase } },
    { header: '% del tipo', key: 'pct', width: 12, style: { numFmt: '0.0%' } },
  ]
  estilarEncabezado(cat.getRow(1))
  const totalTipo = { ingreso: r.totales.ingresos, egreso: r.totales.egresos }
  r.porCategoria.forEach(c => {
    const fila = cat.addRow({
      nombre: c.nombre,
      tipo: c.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      cantidad: c.cantidad,
      total: c.total,
      pct: totalTipo[c.tipo] > 0 ? c.total / totalTipo[c.tipo] : null,
    })
    fila.getCell('tipo').font = { color: { argb: c.tipo === 'ingreso' ? COLOR_INGRESO : COLOR_EGRESO } }
  })
  cat.views = [{ state: 'frozen', ySplit: 1 }]

  // ── Hoja 3: Movimientos ──────────────────────────────────────
  const mov = wb.addWorksheet('Movimientos')
  mov.columns = [
    { header: 'Fecha', key: 'fecha', width: 12, style: { numFmt: 'dd-mm-yyyy' } },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Cuenta', key: 'cuenta', width: 22 },
    { header: 'Categoría', key: 'categoria', width: 22 },
    { header: 'Moneda', key: 'moneda', width: 9 },
    { header: 'Monto', key: 'monto', width: 16 },
    { header: 'Monto con signo', key: 'signo', width: 18 },
  ]
  estilarEncabezado(mov.getRow(1))
  r.movimientos.forEach(m => {
    const [y, mm, d] = m.fecha.split('-').map(Number)
    const fila = mov.addRow({
      fecha: new Date(Date.UTC(y, mm - 1, d)),
      tipo: m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      descripcion: m.descripcion ?? '',
      cuenta: m.cuenta_nombre,
      categoria: m.categoria_nombre ?? 'Sin categoría',
      moneda: m.moneda,
      monto: m.monto,
      signo: m.tipo === 'ingreso' ? m.monto : -m.monto,
    })
    const fmt = formatoMoneda(m.moneda)
    fila.getCell('monto').numFmt = fmt
    fila.getCell('signo').numFmt = fmt
    const color = m.tipo === 'ingreso' ? COLOR_INGRESO : COLOR_EGRESO
    fila.getCell('tipo').font = { color: { argb: color } }
    fila.getCell('monto').font = { color: { argb: color } }
  })
  mov.views = [{ state: 'frozen', ySplit: 1 }]
  if (r.movimientos.length > 0) {
    mov.autoFilter = { from: 'A1', to: `H${r.movimientos.length + 1}` }
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf as ArrayBuffer)
}
