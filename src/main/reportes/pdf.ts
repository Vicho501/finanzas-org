import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ReporteMensual, MESES, formatMonto, formatFecha } from './datos'

// Paleta alineada con tailwind.config.js
const PRIMARIO: [number, number, number] = [30, 77, 107]   // primary-800
const INGRESO: [number, number, number] = [45, 122, 91]
const EGRESO: [number, number, number] = [139, 46, 46]
const GRIS: [number, number, number] = [107, 114, 128]
const FONDO: [number, number, number] = [247, 246, 242]    // surface-100

// Helvetica estándar solo cubre Latin-1 (+ €): se eliminan emojis y otros símbolos
function limpiar(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .replace(/[−–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\u0000-ÿ€]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pctTexto(f: number): string {
  const p = f * 100
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`
}

export function generarPdf(r: ReporteMensual): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const M = 15
  const titulo = `${MESES[r.mes - 1]} ${r.anio}`
  const fmt = (n: number) => formatMonto(n, r.monedaBase)

  // Encabezado
  doc.setFillColor(...PRIMARIO)
  doc.rect(0, 0, ancho, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(limpiar(r.organizacion), M, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Reporte mensual - ${titulo}`, M, 21)
  doc.setFontSize(8)
  const generado = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
  doc.text(`Generado: ${generado}`, ancho - M, 21, { align: 'right' })

  // Tarjetas de resumen
  let y = 36
  const tarjetas: { label: string; valor: number; color: [number, number, number] }[] = [
    { label: 'Saldo inicial', valor: r.totales.saldo_inicio, color: PRIMARIO },
    { label: 'Ingresos', valor: r.totales.ingresos, color: INGRESO },
    { label: 'Egresos', valor: r.totales.egresos, color: EGRESO },
    { label: 'Saldo final', valor: r.totales.saldo_fin, color: r.totales.saldo_fin >= 0 ? PRIMARIO : EGRESO },
  ]
  const gap = 4
  const wT = (ancho - 2 * M - gap * 3) / 4
  tarjetas.forEach((t, i) => {
    const x = M + i * (wT + gap)
    doc.setFillColor(...FONDO)
    doc.roundedRect(x, y, wT, 18, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text(t.label.toUpperCase(), x + 4, y + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...t.color)
    doc.text(fmt(t.valor), x + 4, y + 13.5)
    doc.setFont('helvetica', 'normal')
  })
  y += 18

  const balance = r.totales.ingresos - r.totales.egresos
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  doc.text(
    `Balance del mes: ${fmt(balance)} · ${r.movimientos.length} movimiento(s)` +
    (r.cuentas.some(c => c.moneda !== r.monedaBase) ? ` · Totales consideran solo cuentas en ${r.monedaBase}` : ''),
    M, y + 6,
  )
  y += 10

  const estiloBase = {
    theme: 'striped' as const,
    margin: { left: M, right: M, bottom: 18 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: [55, 65, 81] as [number, number, number] },
    headStyles: { fillColor: PRIMARIO, textColor: 255, fontStyle: 'bold' as const, fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 248] as [number, number, number] },
  }

  const seccion = (texto: string) => {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 18 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PRIMARIO)
    doc.text(texto, M, y + 6)
    doc.setFont('helvetica', 'normal')
    y += 9
  }
  const finTabla = () => { y = (doc as any).lastAutoTable.finalY + 8 }

  // Cuentas
  seccion('Saldos por cuenta')
  autoTable(doc, {
    ...estiloBase,
    startY: y,
    head: [['Cuenta', 'Banco', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final']],
    body: r.cuentas.map(c => [
      limpiar(c.nombre) + (c.activa ? '' : ' (archivada)'),
      limpiar(c.banco),
      formatMonto(c.saldo_inicio_mes, c.moneda),
      formatMonto(c.ingresos_mes, c.moneda),
      formatMonto(c.egresos_mes, c.moneda),
      formatMonto(c.saldo_fin_mes, c.moneda),
    ]),
    foot: [['Total', '', fmt(r.totales.saldo_inicio), fmt(r.totales.ingresos), fmt(r.totales.egresos), fmt(r.totales.saldo_fin)]],
    footStyles: { fillColor: FONDO, textColor: [31, 41, 55], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', textColor: INGRESO }, 4: { halign: 'right', textColor: EGRESO }, 5: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: d => { if (d.section !== 'body' && d.column.index >= 2) d.cell.styles.halign = 'right' },
  })
  finTabla()

  // Categorías
  if (r.porCategoria.length > 0) {
    seccion('Resumen por categoría')
    const totalTipo = { ingreso: r.totales.ingresos, egreso: r.totales.egresos }
    autoTable(doc, {
      ...estiloBase,
      startY: y,
      head: [['Categoría', 'Tipo', 'N°', 'Total', '% del tipo']],
      body: r.porCategoria.map(c => [
        limpiar(c.nombre),
        c.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        String(c.cantidad),
        fmt(c.total),
        totalTipo[c.tipo] > 0 ? pctTexto(c.total / totalTipo[c.tipo]) : '-',
      ]),
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 1) {
          d.cell.styles.textColor = d.cell.raw === 'Ingreso' ? INGRESO : EGRESO
        }
        if (d.section === 'head' && d.column.index >= 3) d.cell.styles.halign = 'right'
      },
    })
    finTabla()
  }

  // Movimientos
  seccion('Detalle de movimientos')
  if (r.movimientos.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text('No hay movimientos registrados en este mes.', M, y + 4)
  } else {
    autoTable(doc, {
      ...estiloBase,
      startY: y,
      head: [['Fecha', 'Descripción', 'Cuenta', 'Categoría', 'Monto']],
      body: r.movimientos.map(m => [
        formatFecha(m.fecha),
        limpiar(m.descripcion) || '-',
        limpiar(m.cuenta_nombre),
        limpiar(m.categoria_nombre) || '-',
        (m.tipo === 'ingreso' ? '+' : '-') + formatMonto(m.monto, m.moneda),
      ]),
      columnStyles: { 0: { cellWidth: 20 }, 4: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 4) {
          d.cell.styles.textColor = r.movimientos[d.row.index].tipo === 'ingreso' ? INGRESO : EGRESO
        }
        if (d.section === 'head' && d.column.index === 4) d.cell.styles.halign = 'right'
      },
    })
  }

  // Pie de página con numeración
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    const alto = doc.internal.pageSize.getHeight()
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text(`${limpiar(r.organizacion)} · Reporte ${titulo}`, M, alto - 8)
    doc.text(`Página ${i} de ${paginas}`, ancho - M, alto - 8, { align: 'right' })
  }

  return Buffer.from(doc.output('arraybuffer'))
}
