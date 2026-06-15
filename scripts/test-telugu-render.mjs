// Quick test: renders long Telugu text with textLength clamping — no cutoff
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const teluguFont = readFileSync(resolve('fonts/NotoSansTelugu-Regular.ttf'))
const latinFont  = readFileSync(resolve('fonts/NotoSans-Regular.ttf'))
const teluguB64  = teluguFont.toString('base64')
const latinB64   = latinFont.toString('base64')

const W = 1080, H = 1080
// Use the exact long string from the bug screenshot
const mainText = 'రంగుల పండుగ మీ జీవితంలో సంతోషం నింపాలని'
const subText  = 'Happy Holi — Wishing you joy and colour always'

const bg = await sharp({
  create: { width: W, height: H, channels: 3, background: { r: 20, g: 10, b: 40 } }
}).png().toBuffer()

const bannerH      = Math.round(H * 0.15)
const bannerY      = H - bannerH
const padX         = Math.round(W * 0.04)
const maxTextW     = W - padX * 2           // 1080 - 2*43 = 994 px

const fontSizeBase = Math.round(bannerH * 0.40)
const subSizeBase  = Math.round(bannerH * 0.26)

// Estimate rendered width; Telugu glyphs ≈ 0.9× font-size wide on average
const estMainW = mainText.length * fontSizeBase * 0.9
const estSubW  = subText.length  * subSizeBase  * 0.65

const mainTextLength = estMainW > maxTextW ? maxTextW : null
const subTextLength  = estSubW  > maxTextW ? maxTextW : null

console.log(`bannerH=${bannerH}  fontSizeBase=${fontSizeBase}  maxTextW=${maxTextW}`)
console.log(`mainText est=${Math.round(estMainW)}  clamp=${mainTextLength ?? 'none'}`)
console.log(`subText  est=${Math.round(estSubW)}   clamp=${subTextLength  ?? 'none'}`)

const mainTLAttr = mainTextLength ? `textLength="${mainTextLength}" lengthAdjust="spacingAndGlyphs"` : ''
const subTLAttr  = subTextLength  ? `textLength="${subTextLength}" lengthAdjust="spacingAndGlyphs"` : ''

const mainY = Math.round(bannerH * 0.42)
const subY  = Math.round(bannerH * 0.80)

const svg = `<svg width="${W}" height="${bannerH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face { font-family: 'NotoTelugu'; src: url('data:font/ttf;base64,${teluguB64}'); }
      @font-face { font-family: 'NotoSans';   src: url('data:font/ttf;base64,${latinB64}'); }
    </style>
  </defs>
  <rect width="${W}" height="${bannerH}" fill="rgba(0,0,0,0.72)" rx="0"/>
  <text x="${W/2}" y="${mainY}"
        font-family="NotoTelugu, NotoSans, sans-serif"
        font-size="${fontSizeBase}"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
        ${mainTLAttr}>${mainText}</text>
  <text x="${W/2}" y="${subY}"
        font-family="NotoSans, sans-serif"
        font-size="${subSizeBase}"
        fill="rgba(255,255,255,0.75)"
        text-anchor="middle"
        dominant-baseline="middle"
        ${subTLAttr}>${subText}</text>
</svg>`

const overlay = await sharp(Buffer.from(svg)).png().toBuffer()

const result = await sharp(bg)
  .composite([{ input: overlay, top: bannerY, left: 0 }])
  .jpeg({ quality: 90 })
  .toBuffer()

writeFileSync('scripts/test-telugu-output.jpg', result)
console.log('✅ Saved scripts/test-telugu-output.jpg —', result.length, 'bytes')
