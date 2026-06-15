// app/api/personalize/route.ts
//
// Accepts a pre-generated base image + customer inputs and returns
// a watermarked preview and a clean composited image.
//
// Request  (JSON):
// {
//   baseImageBase64: string      — base64 of the festive background image
//   templateId:      string      — which template config to use
//   name:            string      — customer name or business name
//   message?:        string      — optional custom message
//   logoBase64?:     string      — optional logo image base64
//   preview?:        boolean     — if true, return watermarked preview only (fast path)
// }
//
// Response (JSON):
// {
//   success:        true
//   previewBase64:  string   — watermarked JPEG for showing in browser
//   cleanBase64?:   string   — clean JPEG (only returned when preview=false)
// }

import { NextRequest, NextResponse } from 'next/server'
import { personalizeImage, TemplateConfig } from '@/lib/personalize'
import { TEMPLATE_CONFIGS } from '@/lib/templateConfigs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      baseImageBase64: string
      templateId:      string
      name:            string
      message?:        string
      logoBase64?:     string
      preview?:        boolean
    }

    const { baseImageBase64, templateId, name, message, logoBase64, preview = true } = body

    // Validate required fields
    if (!baseImageBase64?.trim()) {
      return NextResponse.json({ error: 'baseImageBase64 is required' }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!templateId?.trim()) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    // Look up template config
    const template: TemplateConfig | undefined = TEMPLATE_CONFIGS[templateId]
    if (!template) {
      return NextResponse.json(
        { error: `Unknown templateId: ${templateId}. Available: ${Object.keys(TEMPLATE_CONFIGS).join(', ')}` },
        { status: 400 }
      )
    }

    const result = await personalizeImage({
      baseImageBase64,
      name,
      message,
      logoBase64,
      template,
      watermark: true,   // always watermark — clean copy delivered after payment
    })

    // In preview mode return only the watermarked version (saves bandwidth)
    if (preview) {
      return NextResponse.json({
        success: true,
        previewBase64: result.previewBase64,
      })
    }

    // Full mode — return both (used server-side after payment to build the ZIP)
    return NextResponse.json({
      success: true,
      previewBase64: result.previewBase64,
      cleanBase64:   result.cleanBase64,
    })

  } catch (error: unknown) {
    console.error('[personalize] error:', error)
    const message = error instanceof Error ? error.message : 'Personalization failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Sharp compositing is fast (~200ms) but font loading adds ~100ms on cold start
export const maxDuration = 30
