// app/api/upload-product/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaImage, uploadZipFile, createWooProduct } from '@/lib/woocommerce'
import { processImage } from '@/lib/imageProcessor'
import { GeneratedCopy } from '@/types'

const CATEGORY_NAMES: Record<string, string> = {
  'festival-wishes':  'Festival Wishes',
  'biker-developer':  'Biker Developer Designs',
  'life-events':      'Telugu Life Events',
  'business':         'Business & Professional',
  'developer-humor':  'Developer Humor',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const imageFile   = formData.get('image') as File | null
    const copyRaw     = formData.get('copy') as string | null
    const fileName    = formData.get('fileName') as string | null
    const price       = formData.get('price') as string | null
    const categorySlug = formData.get('categorySlug') as string | null
    const mode        = (formData.get('mode') as string | null) ?? 'social'

    if (!imageFile || !copyRaw || !fileName || !price || !categorySlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const copy = JSON.parse(copyRaw) as GeneratedCopy

    // Convert File → base64 for the imageProcessor interface
    const arrayBuf = await imageFile.arrayBuffer()
    const imageBase64 = Buffer.from(arrayBuf).toString('base64')

    // Step 1 — Process image server-side
    const processed = await processImage(imageBase64, fileName, mode as 'social' | 'pod' | 'all')

    // Step 2 — Upload watermarked preview to WP Media
    const previewImageId = await uploadMediaImage(
      processed.previewBase64,
      processed.previewFileName,
      copy.altText
    )

    // Step 3 — Upload ZIP directly to Bluehost IP, bypassing Cloudflare 524 timeout
    const zipFileUrl = await uploadZipFile(
      processed.zipBase64,
      processed.zipFileName
    )

    // Step 4 — Create WooCommerce product
    const categoryName = CATEGORY_NAMES[categorySlug] || categorySlug
    const result = await createWooProduct(
      copy,
      processed,
      price,
      categorySlug,
      categoryName,
      previewImageId,
      zipFileUrl
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    console.error('Upload product error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 60
