// app/api/process-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { processImage } from '@/lib/imageProcessor'

export async function POST(req: NextRequest) {
  try {
    // Use arrayBuffer to bypass Next.js body size limits on large base64 payloads
    const buf = await req.arrayBuffer()
    const body = JSON.parse(Buffer.from(buf).toString('utf-8'))
    const { imageBase64, fileName, mode = 'social' } = body as {
      imageBase64: string
      fileName: string
      mode: 'social' | 'pod' | 'all'
    }

    if (!imageBase64 || !fileName) {
      return NextResponse.json(
        { error: 'Missing imageBase64 or fileName' },
        { status: 400 }
      )
    }

    const result = await processImage(imageBase64, fileName, mode)

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    console.error('Process image error:', error)
    const message = error instanceof Error ? error.message : 'Image processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 30
