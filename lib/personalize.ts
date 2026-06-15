// lib/personalize.ts
//
// Composites customer-provided text and optional logo onto a pre-generated
// base image using Sharp + SVG text rendering.
//
// Font files in /fonts/ are loaded at runtime so they work on both
// local dev and Vercel/Cloud Run without any system font dependency.

import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

// ── Font loading ───────────────────────────────────────────────────────────

// Embed fonts as base64 data URIs so the SVG renderer (librsvg inside Sharp)
// can use them without relying on system fonts.
function loadFontAsDataUri(fontFileName: string): string {
  const fontPath = path.join(process.cwd(), 'fonts', fontFileName)
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Font not found: ${fontPath}`)
  }
  const fontBuffer = fs.readFileSync(fontPath)
  return `data:font/truetype;base64,${fontBuffer.toString('base64')}`
}

// Loaded once — cached in module scope across requests
let _teluguFontUri: string | null = null
let _latinFontUri:  string | null = null

function getTeluguFontUri(): string {
  if (!_teluguFontUri) _teluguFontUri = loadFontAsDataUri('NotoSansTelugu-Regular.ttf')
  return _teluguFontUri
}

function getLatinFontUri(): string {
  if (!_latinFontUri) _latinFontUri = loadFontAsDataUri('NotoSans-Regular.ttf')
  return _latinFontUri
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface TextZone {
  x: number          // center x on the canvas
  y: number          // baseline y on the canvas
  maxWidth: number   // text wraps or scales down if wider
  fontSize: number   // in pixels
  color: string      // CSS color e.g. "#FFD700"
  align?: 'left' | 'center' | 'right'
  fontWeight?: 'normal' | 'bold'
}

export interface LogoZone {
  x: number          // top-left x
  y: number          // top-left y
  width: number
  height: number
  fit?: 'contain' | 'cover'
}

export interface TemplateConfig {
  id: string
  name: string
  /** Canvas dimensions — must match base image dimensions */
  canvas: { width: number; height: number }
  nameZone: TextZone
  messageZone?: TextZone   // optional — not all templates have a message zone
  logoZone?: LogoZone      // optional
}

export interface PersonalizeInput {
  /** Base image as base64 (the pre-generated festive design) */
  baseImageBase64: string
  /** Customer name or business name */
  name: string
  /** Optional custom message e.g. "30% Diwali Offer" */
  message?: string
  /** Optional logo as base64 */
  logoBase64?: string
  /** Template config that defines zones */
  template: TemplateConfig
  /** Whether to add watermark (true for preview, false for paid download) */
  watermark?: boolean
}

export interface PersonalizeResult {
  /** Watermarked preview JPEG base64 */
  previewBase64: string
  /** Clean full-res JPEG base64 (for paid download) */
  cleanBase64: string
}

// ── Text measurement helper ────────────────────────────────────────────────
// SVG has no native text measurement. We approximate character width at
// a given font size and scale down if the text is too wide.

function calcFontSize(text: string, zone: TextZone): number {
  // Rough average: Telugu glyphs ~0.85x wide, Latin ~0.55x wide
  const hasTelugu = /[\u0C00-\u0C7F]/.test(text)
  const charWidthRatio = hasTelugu ? 0.85 : 0.55
  const estimatedWidth = text.length * zone.fontSize * charWidthRatio
  if (estimatedWidth <= zone.maxWidth) return zone.fontSize
  // Scale down proportionally
  return Math.floor(zone.fontSize * (zone.maxWidth / estimatedWidth))
}

// ── Build SVG text overlay ─────────────────────────────────────────────────

function buildTextSVG(
  canvasW: number,
  canvasH: number,
  zones: Array<{ zone: TextZone; text: string }>
): Buffer {
  const teluguUri = getTeluguFontUri()
  const latinUri  = getLatinFontUri()

  const fontFaces = `
    @font-face {
      font-family: 'NotoSansTelugu';
      src: url('${teluguUri}') format('truetype');
      font-weight: normal;
    }
    @font-face {
      font-family: 'NotoSans';
      src: url('${latinUri}') format('truetype');
      font-weight: normal;
    }
  `

  const textElements = zones.map(({ zone, text }) => {
    const fontSize = calcFontSize(text, zone)
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text)
    // Use Telugu font if text contains Telugu characters, Latin otherwise.
    // Both fonts cover Latin too, but NotoSansTelugu has better Telugu shaping.
    const fontFamily = hasTelugu ? 'NotoSansTelugu, NotoSans' : 'NotoSans, NotoSansTelugu'
    const fontWeight = zone.fontWeight ?? 'normal'
    const anchor = zone.align === 'left' ? 'start' : zone.align === 'right' ? 'end' : 'middle'

    // Drop shadow for readability on busy backgrounds
    const shadowId = `shadow_${zone.x}_${zone.y}`

    return `
      <filter id="${shadowId}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.7)" />
      </filter>
      <text
        x="${zone.x}"
        y="${zone.y}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        fill="${zone.color}"
        text-anchor="${anchor}"
        filter="url(#${shadowId})"
      >${escapeXml(text)}</text>
    `
  }).join('\n')

  const svg = `
    <svg
      width="${canvasW}"
      height="${canvasH}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>${fontFaces}</style>
      </defs>
      ${textElements}
    </svg>
  `

  return Buffer.from(svg)
}

// ── Watermark overlay (reuses pattern from imageProcessor.ts) ─────────────

function buildWatermarkSVG(width: number, height: number): Buffer {
  const WATERMARK = 'designranga.com'
  const fontSize = Math.max(24, Math.floor(width / 20))
  const textWidth = fontSize * WATERMARK.length * 0.6
  const spacing = textWidth + width / 5

  let texts = ''
  for (let y = -height; y < height * 2; y += fontSize * 3) {
    for (let x = -width; x < width * 2; x += spacing) {
      const offset = Math.floor(y / (fontSize * 3)) % 2 === 1 ? spacing / 2 : 0
      texts += `<text x="${x + offset}" y="${y}" transform="rotate(-30, ${x + offset}, ${y})">${WATERMARK}</text>`
    }
  }

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: rgba(255,255,255,0.18);
        }
      </style>
      ${texts}
      <text
        x="${width - fontSize * WATERMARK.length * 0.55}"
        y="${height - fontSize}"
        style="fill: rgba(255,255,255,0.65); font-size: ${fontSize * 0.9}px;"
      >${WATERMARK}</text>
    </svg>
  `)
}

// ── Logo composite ─────────────────────────────────────────────────────────

async function prepareLogoBuffer(
  logoBase64: string,
  zone: LogoZone
): Promise<{ input: Buffer; top: number; left: number }> {
  const logoBuffer = Buffer.from(logoBase64, 'base64')
  const resized = await sharp(logoBuffer)
    .resize(zone.width, zone.height, {
      fit: zone.fit ?? 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent background
    })
    .png()  // keep transparency
    .toBuffer()

  return { input: resized, top: zone.y, left: zone.x }
}

// ── Main export ────────────────────────────────────────────────────────────

export async function personalizeImage(input: PersonalizeInput): Promise<PersonalizeResult> {
  const { baseImageBase64, name, message, logoBase64, template, watermark = false } = input
  const { canvas } = template

  const baseBuffer = Buffer.from(baseImageBase64, 'base64')

  // Ensure base image matches canvas size
  const base = await sharp(baseBuffer)
    .resize(canvas.width, canvas.height, { fit: 'cover', position: 'centre' })
    .toBuffer()

  // Build composite layers
  const layers: sharp.OverlayOptions[] = []

  // 1. Text overlay (name + optional message)
  const textZones: Array<{ zone: TextZone; text: string }> = [
    { zone: template.nameZone, text: name.trim() },
  ]
  if (message?.trim() && template.messageZone) {
    textZones.push({ zone: template.messageZone, text: message.trim() })
  }

  const textSvg = buildTextSVG(canvas.width, canvas.height, textZones)
  layers.push({ input: textSvg, top: 0, left: 0 })

  // 2. Logo overlay (if provided and template has a logo zone)
  if (logoBase64?.trim() && template.logoZone) {
    const logoLayer = await prepareLogoBuffer(logoBase64, template.logoZone)
    layers.push(logoLayer)
  }

  // Composite text + logo onto base
  const composited = await sharp(base)
    .composite(layers)
    .toBuffer()

  // Clean version (for paid download) — full quality JPEG
  const cleanJpeg = await sharp(composited)
    .jpeg({ quality: 95 })
    .toBuffer()
  const cleanBase64 = cleanJpeg.toString('base64')

  // Preview version — watermarked
  let previewBase64: string
  if (watermark) {
    const wmSvg = buildWatermarkSVG(canvas.width, canvas.height)
    const watermarked = await sharp(composited)
      .composite([{ input: wmSvg, blend: 'over' }])
      .jpeg({ quality: 85 })
      .toBuffer()
    previewBase64 = watermarked.toString('base64')
  } else {
    previewBase64 = cleanBase64
  }

  return { previewBase64, cleanBase64 }
}

// ── Utility ────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
