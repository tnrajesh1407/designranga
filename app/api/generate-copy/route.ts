// app/api/generate-copy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateSEOCopy } from '@/lib/claude'
import { ProductDetails } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { details, imageBase64 } = body as {
      details: ProductDetails
      imageBase64?: string
    }

    if (!details.festival || !details.language || !details.category) {
      return NextResponse.json(
        { error: 'Missing required fields: festival, language, category' },
        { status: 400 }
      )
    }

    const copy = await generateSEOCopy(details, imageBase64)

    return NextResponse.json({ success: true, copy })
  } catch (error: unknown) {
    console.error('Generate copy error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate copy'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 30
