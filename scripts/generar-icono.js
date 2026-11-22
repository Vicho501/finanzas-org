// Genera build/icon.png (512x512): cuadrado redondeado azul petróleo con una "F" blanca.
// Sin dependencias: rasteriza con supermuestreo y escribe el PNG con zlib.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const N = 512, SS = 4
const FONDO = [0x1e, 0x4d, 0x6b], LETRA = [0xff, 0xff, 0xff]
const MARGEN = 16, RADIO = 104

function dentroRedondeado(x, y) {
  const a = MARGEN, b = N - MARGEN
  if (x < a || x > b || y < a || y > b) return false
  const cx = Math.min(Math.max(x, a + RADIO), b - RADIO)
  const cy = Math.min(Math.max(y, a + RADIO), b - RADIO)
  return (x - cx) ** 2 + (y - cy) ** 2 <= RADIO ** 2
}
// "F" con trazos rectangulares
const rects = [
  [172, 128, 236, 384], // asta vertical
  [172, 128, 348, 188], // brazo superior
  [172, 230, 320, 288], // brazo medio
]
const enLetra = (x, y) => rects.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1)

const filas = []
for (let y = 0; y < N; y++) {
  const fila = Buffer.alloc(1 + N * 4)
  for (let x = 0; x < N; x++) {
    let cubre = 0, letra = 0
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS
      if (dentroRedondeado(px, py)) { cubre++; if (enLetra(px, py)) letra++ }
    }
    const total = SS * SS
    const t = cubre ? letra / cubre : 0
    const o = 1 + x * 4
    for (let c = 0; c < 3; c++) fila[o + c] = Math.round(FONDO[c] * (1 - t) + LETRA[c] * t)
    fila[o + 3] = Math.round((cubre / total) * 255)
  }
  filas.push(fila)
}

function chunk(tipo, datos) {
  const len = Buffer.alloc(4); len.writeUInt32BE(datos.length)
  const td = Buffer.concat([Buffer.from(tipo), datos])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0)
  return Buffer.concat([len, td, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4)
ihdr[8] = 8; ihdr[9] = 6 // 8 bits, RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(Buffer.concat(filas), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
const salida = path.join(__dirname, '..', 'build', 'icon.png')
fs.writeFileSync(salida, png)
console.log('Ícono generado:', salida, png.length, 'bytes')
