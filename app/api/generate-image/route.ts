// app/api/generate-image/route.ts
// Two-path image generation via the Cloud Run backend:
//
// Path A — fresh prompt (user typed raw text, no enhanced prompt yet):
//   POST /generate-image  with PromptRequest { raw_prompt, style, aspect_ratio }
//   Backend enhances the prompt and generates the image in one call.
//   Response includes both enhanced_prompt and image_url.
//
// Path B — regenerate (user edited the enhanced prompt and hit Regenerate):
//   POST /generate-image  with GenerateFromEnhancedRequest
//     { enhanced_prompt, original_prompt, style, aspect_ratio }
//   Backend skips re-enhancement and generates directly from the provided prompt.

import { NextRequest, NextResponse } from 'next/server'

const AI_BACKEND = 'https://ai-image-generator-backend-1042667465329.us-central1.run.app'

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,                    // original raw prompt (always required)
      enhancedPrompt,            // present on regenerate — skip re-enhancement
      aspectRatio = '1:1',
    } = await req.json() as {
      prompt:          string
      enhancedPrompt?: string    // optional — sent by client on regenerate
      aspectRatio?:    string
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    let requestBody: Record<string, unknown>

    if (enhancedPrompt?.trim()) {
      // Path B — GenerateFromEnhancedRequest
      // User edited the enhanced prompt; generate directly without re-enhancing.
      requestBody = {
        enhanced_prompt:  enhancedPrompt,
        original_prompt:  prompt,
        style:            'photorealistic',
        aspect_ratio:     aspectRatio,
      }
      console.log('[generate-image] Path B (enhanced prompt), length:', enhancedPrompt.length)
    } else {
      // Path A — PromptRequest
      // First generation: backend enhances raw_prompt then generates.
      requestBody = {
        raw_prompt:    prompt,
        style:         'photorealistic',
        purpose:       null,
        environment:   null,
        mood:          null,
        lighting:      null,
        quality_terms: null,
        aspect_ratio:  aspectRatio,
      }
      console.log('[generate-image] Path A (raw prompt), length:', prompt.length)
    }

    const backendRes = await fetch(`${AI_BACKEND}/generate-image`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(requestBody),
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      console.error('[generate-image] backend error:', backendRes.status, errText.slice(0, 300))
      throw new Error(`Image generation failed (${backendRes.status}): ${errText.slice(0, 120)}`)
    }

    // ImageGenerationResponse:
    // { enhanced_prompt, original_prompt, image_url, parameters, image_properties, error }
    const data = await backendRes.json() as {
      image_url:        string
      enhanced_prompt?: string
      original_prompt?: string
      error?:           string | null
    }

    if (data.error) {
      throw new Error(`Backend error: ${data.error}`)
    }

    if (!data.image_url) {
      throw new Error('Backend returned no image_url')
    }

    // image_url is a data URI: "data:image/png;base64,<b64>"
    // Strip the prefix — page.tsx expects raw base64
    const commaIdx    = data.image_url.indexOf(',')
    const imageBase64 = commaIdx >= 0 ? data.image_url.slice(commaIdx + 1) : data.image_url

    return NextResponse.json({
      success:        true,
      imageBase64,
      // Pass enhanced_prompt back to the client so it can show it
      // in the review screen and send it on regenerate (Path B)
      enhancedPrompt: data.enhanced_prompt ?? enhancedPrompt ?? prompt,
    })

  } catch (error: unknown) {
    console.error('Generate image error:', error)
    const message = error instanceof Error ? error.message : 'Image generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Cloud Run cold start + generation time; allow 60 s
export const maxDuration = 60
