// scripts/test-personalize.mjs
//
// Run with: node scripts/test-personalize.mjs
//
// Reads the test image from scripts/test-banner.jpg (save the image there),
// calls the personalizeImage function directly (no HTTP), and writes the
// output to scripts/test-personalize-output.jpg so you can inspect it.

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// ── Inline the personalize logic (avoids TS compilation for quick test) ────

function loadFontAsDataUri(fontFileName) {
  const fontPath = path.join(ROOT, 'fonts', fontFileName)
  const fontBuffer = fs.readFileSync(fontPath)
  return `data:font/truetype;base64,${fontBuffer.toString('base64')}`
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function calcFontSize(text, zone) {
  const hasTelugu = /[\u0C00-\u0C7F]/.test(text)
  const charWidthRatio = hasTelugu ? 0.85 : 0.55
  const estimatedWidth = text.length * zone.fontSize * charWidthRatio
  if (estimatedWidth <= zone.maxWidth) return zone.fontSize
  return Math.floor(zone.fontSize * (zone.maxWidth / estimatedWidth))
}

async function run() {
  // ── Load base image ──────────────────────────────────────────────────────
  // Use test-banner.jpg if present, otherwise fall back to test-telugu-output.jpg
  let imagePath = path.join(__dirname, 'test-banner.jpg')
  if (!fs.existsSync(imagePath)) {
    imagePath = path.join(__dirname, 'test-telugu-output.jpg')
    console.log('ℹ️   test-banner.jpg not found — using test-telugu-output.jpg')
    console.log('    To test with your banner image, save it as scripts/test-banner.jpg\n')
  }

  const imageBuffer = fs.readFileSync(imagePath)
  const meta = await sharp(imageBuffer).metadata()
  console.log(`✅  Loaded image: ${meta.width}×${meta.height} (${meta.format})`)

  const canvasW = meta.width
  const canvasH = meta.height

  // ── For this banner image, place text in the black space at the bottom ───
  // The design elements occupy roughly the middle 60% of the height.
  // Black space starts at ~75% of height — good zone for customer text.
  const textY1 = Math.round(canvasH * 0.82)   // name baseline
  const textY2 = Math.round(canvasH * 0.93)   // message baseline
  const centerX = Math.round(canvasW / 2)

  console.log(`   Canvas: ${canvasW}×${canvasH}`)
  console.log(`   Name zone Y: ${textY1}`)
  console.log(`   Message zone Y: ${textY2}`)

  // ── Load fonts ────────────────────────────────────────────────────────────
  console.log('   Loading fonts...')
  const teluguUri = loadFontAsDataUri('NotoSansTelugu-Regular.ttf')
  const latinUri  = loadFontAsDataUri('NotoSans-Regular.ttf')

  const fontFaces = `
    @font-face {
      font-family: 'NotoSansTelugu';
      src: url('${teluguUri}') format('truetype');
    }
    @font-face {
      font-family: 'NotoSans';
      src: url('${latinUri}') format('truetype');
    }
  `

  // ── Test inputs ───────────────────────────────────────────────────────────
  const testName    = 'కపూర్ జ్యువెలర్స్'           // Telugu business name
  const testMessage = 'దీపావళి సందర్భంగా 30% తగ్గింపు' // Telugu offer message

  const zones = [
    {
      text: testName,
      zone: { x: centerX, y: textY1, maxWidth: Math.round(canvasW * 0.7), fontSize: Math.round(canvasH * 0.09), color: '#FFD700', fontWeight: 'bold' },
    },
    {
      text: testMessage,
      zone: { x: centerX, y: textY2, maxWidth: Math.round(canvasW * 0.75), fontSize: Math.round(canvasH * 0.07), color: '#FFFFFF', fontWeight: 'normal' },
    },
  ]

  // ── Build SVG text overlay ────────────────────────────────────────────────
  const textElements = zones.map(({ zone, text }) => {
    const fontSize = calcFontSize(text, zone)
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text)
    const fontFamily = hasTelugu ? 'NotoSansTelugu, NotoSans' : 'NotoSans, NotoSansTelugu'
    const shadowId = `shadow_${zone.x}_${zone.y}`
    return `
      <filter id="${shadowId}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.8)" />
      </filter>
      <text
        x="${zone.x}"
        y="${zone.y}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="${zone.fontWeight}"
        fill="${zone.color}"
        text-anchor="middle"
        filter="url(#${shadowId})"
      >${escapeXml(text)}</text>
    `
  }).join('\n')

  const svg = `
    <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontFaces}</style>
      </defs>
      ${textElements}
    </svg>
  `

  // ── Composite ─────────────────────────────────────────────────────────────
  console.log('   Compositing text onto image...')
  const outputBuffer = await sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer()

  // ── Write output ──────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, 'test-personalize-output.jpg')
  fs.writeFileSync(outputPath, outputBuffer)

  console.log(`\n✅  Output written to: scripts/test-personalize-output.jpg`)
  console.log(`   Open it to verify text placement and Telugu rendering.\n`)

  // ── Also write a version with just English to compare ─────────────────────
  const engElements = [
    { text: 'Kapoor Jewellers', zone: zones[0].zone },
    { text: '30% Diwali Offer', zone: zones[1].zone },
  ].map(({ zone, text }) => {
    const fontSize = calcFontSize(text, zone)
    const shadowId = `shadow_en_${zone.y}`
    return `
      <filter id="${shadowId}">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.8)" />
      </filter>
      <text x="${zone.x}" y="${zone.y}" font-family="NotoSans" font-size="${fontSize}"
        font-weight="${zone.fontWeight}" fill="${zone.color}" text-anchor="middle"
        filter="url(#${shadowId})">${escapeXml(text)}</text>
    `
  }).join('\n')

  const engSvg = `
    <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs><style>${fontFaces}</style></defs>
      ${engElements}
    </svg>
  `

  const engOutput = await sharp(imageBuffer)
    .composite([{ input: Buffer.from(engSvg), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer()

  const engPath = path.join(__dirname, 'test-personalize-output-english.jpg')
  fs.writeFileSync(engPath, engOutput)
  console.log(`✅  English version: scripts/test-personalize-output-english.jpg\n`)
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
