// lib/imageProcessor.ts
import sharp from 'sharp'
import JSZip from 'jszip'

const WATERMARK_TEXT = 'designranga.com'

// ── Generate watermark SVG overlay ────────────────────────────────────────

function generateWatermarkSVG(width: number, height: number): Buffer {
  const fontSize = Math.max(24, Math.floor(width / 20))
  const textWidth = fontSize * WATERMARK_TEXT.length * 0.6
  const spacing = textWidth + width / 5

  let texts = ''
  for (let y = -height; y < height * 2; y += fontSize * 3) {
    for (let x = -width; x < width * 2; x += spacing) {
      const offset = Math.floor(y / (fontSize * 3)) % 2 === 1 ? spacing / 2 : 0
      texts += `<text x="${x + offset}" y="${y}" transform="rotate(-30, ${x + offset}, ${y})">${WATERMARK_TEXT}</text>`
    }
  }

  const svg = `
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
        x="${width - fontSize * WATERMARK_TEXT.length * 0.55}"
        y="${height - fontSize}"
        style="fill: rgba(255,255,255,0.65); font-size: ${fontSize * 0.9}px;"
      >${WATERMARK_TEXT}</text>
    </svg>`

  return Buffer.from(svg)
}

// ── Smart crop to target dimensions ───────────────────────────────────────

async function smartCrop(
  input: Buffer,
  targetW: number,
  targetH: number,
  mode: 'cover' | 'contain' | 'fill' = 'cover'
): Promise<Buffer> {
  return sharp(input)
    .resize(targetW, targetH, {
      fit: mode,
      position: 'centre',
    })
    .toBuffer()
}

// ── Portrait with blurred background (for Stories and landscape formats) ──────

async function withBlurBg(
  input: Buffer,
  targetW: number,
  targetH: number
): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  const srcW = meta.width!
  const srcH = meta.height!

  // Blurred background fills the target canvas
  const bg = await sharp(input)
    .resize(targetW, targetH, { fit: 'cover' })
    .blur(24)
    .modulate({ brightness: 0.75 })
    .toBuffer()

  // Scale foreground to fit entirely within target (contain)
  const scaleW = targetW / srcW
  const scaleH = targetH / srcH
  const scale = Math.min(scaleW, scaleH)
  const fgW = Math.round(srcW * scale)
  const fgH = Math.round(srcH * scale)

  const fg = await sharp(input)
    .resize(fgW, fgH)
    .toBuffer()

  // Center composite
  const left = Math.round((targetW - fgW) / 2)
  const top  = Math.round((targetH - fgH) / 2)

  return sharp(bg)
    .composite([{ input: fg, top, left }])
    .toBuffer()
}

// ── Story: tighter crop — fills height, centers horizontally ──────────────

async function storyWithBlurBg(
  input: Buffer,
  targetW: number,
  targetH: number
): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  const srcW = meta.width!
  const srcH = meta.height!

  // Blurred background
  const bg = await sharp(input)
    .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
    .blur(28)
    .modulate({ brightness: 0.65 })
    .toBuffer()

  // Scale foreground to fill the full width (may overflow height — that's fine for stories)
  const scale = targetW / srcW
  const fgW = targetW
  const fgH = Math.round(srcH * scale)

  const fg = await sharp(input)
    .resize(fgW, fgH)
    .toBuffer()

  // Vertically center, allow slight overflow at bottom
  const top = Math.max(0, Math.round((targetH - fgH) / 2))

  return sharp(bg)
    .composite([{ input: fg, top, left: 0 }])
    .toBuffer()
}

// ── Add watermark to image ─────────────────────────────────────────────────

async function addWatermark(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  const w = meta.width!
  const h = meta.height!

  const watermarkSvg = generateWatermarkSVG(w, h)

  return sharp(input)
    .composite([{ input: watermarkSvg, blend: 'over' }])
    .toBuffer()
}

// applySafeZone — reserved for POD support (coming later)
// async function applySafeZone(input: Buffer, pct: number): Promise<Buffer> { ... }

// ── Main processor ─────────────────────────────────────────────────────────

export interface ProcessResult {
  previewBase64: string
  previewFileName: string
  zipBase64: string
  zipFileName: string
  originalSize: { width: number; height: number }
}

export async function processImage(
  imageBase64: string,
  fileName: string,
  mode: 'social' | 'pod' | 'all' = 'social' // POD support coming later
): Promise<ProcessResult> {

  const baseName = fileName.replace(/\.[^/.]+$/, '')
  const inputBuffer = Buffer.from(imageBase64, 'base64')

  const meta = await sharp(inputBuffer).metadata()
  const originalSize = { width: meta.width!, height: meta.height! }

  const zip = new JSZip()

  // ── Social sizes ──────────────────────────────────────────────────────

  if (mode === 'social' || mode === 'all') {
    const socialFolder = zip.folder('01_Social_Digital')!

    // Print quality
    const print = await smartCrop(inputBuffer, 4096, 4096, 'contain')
    const printPng = await sharp(print).png().toBuffer()
    socialFolder.file(`${baseName}_Print_4096x4096_300dpi.png`, printPng)

    // WhatsApp/Instagram
    const wa = await smartCrop(inputBuffer, 1080, 1080, 'cover')
    const waJpg = await sharp(wa).jpeg({ quality: 95 }).toBuffer()
    socialFolder.file(`${baseName}_WhatsApp_Instagram_1080x1080.jpg`, waJpg)

    // Facebook/LinkedIn — landscape, blurred bg preserves full design + typography
    const fb = await withBlurBg(inputBuffer, 1200, 630)
    const fbJpg = await sharp(fb).jpeg({ quality: 95 }).toBuffer()
    socialFolder.file(`${baseName}_Facebook_LinkedIn_1200x630.jpg`, fbJpg)

    // Story — fills width, blurred bg top/bottom, better for portrait canvas
    const story = await storyWithBlurBg(inputBuffer, 1080, 1920)
    const storyJpg = await sharp(story).jpeg({ quality: 92 }).toBuffer()
    socialFolder.file(`${baseName}_Story_1080x1920.jpg`, storyJpg)

    // Twitter/X — landscape, blurred bg preserves full design + typography
    const tw = await withBlurBg(inputBuffer, 1200, 675)
    const twJpg = await sharp(tw).jpeg({ quality: 95 }).toBuffer()
    socialFolder.file(`${baseName}_Twitter_X_1200x675.jpg`, twJpg)

    // Web
    const web = await smartCrop(inputBuffer, 800, 800, 'cover')
    const webJpg = await sharp(web).jpeg({ quality: 90 }).toBuffer()
    socialFolder.file(`${baseName}_Web_800x800.jpg`, webJpg)
  }

  // POD sizes — coming in future version
  // if (mode === 'pod' || mode === 'all') { ... }

  // README
  zip.file('README.txt', `Thank you for purchasing from designranga.com!
Your download includes platform-optimized files for social media and print.
License: Personal & Commercial Use
Website: https://designranga.com
Support: support@designranga.com`)

  // Generate ZIP
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // Watermarked preview (1200x1200)
  const preview = await smartCrop(inputBuffer, 1200, 1200, 'cover')
  const watermarked = await addWatermark(preview)
  const previewJpg = await sharp(watermarked).jpeg({ quality: 88 }).toBuffer()

  const previewFileName = `${baseName}_PREVIEW_watermarked_1200x1200.jpg`
  const zipFileName = `${baseName}_designranga_bundle.zip`

  return {
    previewBase64: previewJpg.toString('base64'),
    previewFileName,
    zipBase64: zipBuffer.toString('base64'),
    zipFileName,
    originalSize,
  }
}
