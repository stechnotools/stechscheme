// One-off generator for the customer-portal PWA icon set.
// Pure Node (zlib only, no image deps) — draws a faceted gem mark on a
// navy-to-teal gradient, matching the customer login/dashboard palette.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdr = chunk('IHDR', ihdrData)

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = chunk('IDAT', deflateSync(raw, { level: 9 }))
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function mixColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

// Brand palette, matching CustomerPortalLoginPage gradient.
const NAVY = [15, 23, 42] // #0f172a
const TEAL = [15, 118, 110] // #0f766e
const AMBER = [245, 158, 11] // #f59e0b
const AMBER_LIGHT = [253, 211, 130]
const WHITE = [255, 255, 255]

function drawGem({ size, maskable }) {
  const buf = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2

  // Maskable icons must keep all meaningful content inside the inner ~80% safe zone.
  const contentScale = maskable ? 0.62 : 0.74
  const gemHalf = (size * contentScale) / 2
  const cornerRadius = maskable ? 0 : size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const t = (x + y) / (size * 2)
      let [r, g, b] = mixColor(NAVY, TEAL, t)
      let a = 255

      if (!maskable) {
        // Rounded-square backplate so the "any" purpose icon reads well on light/dark launchers.
        const dx = Math.max(Math.abs(x - cx) - (cx - cornerRadius), 0)
        const dy = Math.max(Math.abs(y - cy) - (cy - cornerRadius), 0)
        const outside = Math.sqrt(dx * dx + dy * dy) > cornerRadius
        if (outside) a = 0
      }

      // Diamond / gem facet shape (Manhattan-distance diamond) in amber, centered.
      const dx = Math.abs(x - cx)
      const dy = Math.abs(y - cy)
      const manhattan = dx + dy
      const topHalf = y < cy

      if (manhattan <= gemHalf) {
        const depth = 1 - manhattan / gemHalf
        const base = topHalf ? AMBER_LIGHT : AMBER
        ;[r, g, b] = mixColor(base, AMBER, 1 - depth * 0.5)

        // Thin facet outline near the gem's edge for a cut-gem highlight.
        if (manhattan > gemHalf - size * 0.012) {
          ;[r, g, b] = mixColor([r, g, b], WHITE, 0.55)
        }

        // Center vertical facet line.
        if (dx < size * 0.01 && manhattan < gemHalf * 0.92) {
          ;[r, g, b] = mixColor([r, g, b], WHITE, 0.35)
        }
      }

      buf[i] = Math.round(r)
      buf[i + 1] = Math.round(g)
      buf[i + 2] = Math.round(b)
      buf[i + 3] = a
    }
  }

  return buf
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180.png', size: 180, maskable: false }
]

for (const target of targets) {
  const pixels = drawGem(target)
  const png = encodePng(target.size, target.size, pixels)
  writeFileSync(path.join(outDir, target.name), png)
  console.log(`wrote ${target.name} (${png.length} bytes)`)
}
