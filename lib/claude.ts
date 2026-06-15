// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'
import { ProductDetails, GeneratedCopy } from '@/types'
import { getProductTags } from '@/lib/constants'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateSEOCopy(
  details: ProductDetails,
  imageBase64?: string
): Promise<GeneratedCopy> {

  const festivalLabel = details.festival.replace(/_/g, ' ')
  const isBikerDesign = details.category === 'biker-developer'
  const isLifeEvent   = details.category === 'life-events'
  const isBusiness    = details.category === 'business'

  // ── Build a rich, specific image description block ────────────────────
  // Prefer the AI-enhanced prompt (most descriptive), fall back to original,
  // then fall back to festival+style context. The more specific this is,
  // the more unique the copy will be.
  const imageDescription = details.enhancedPrompt?.trim()
    || details.originalPrompt?.trim()
    || `${festivalLabel} themed design in ${details.style} style`

  // ── Audience / category context ───────────────────────────────────────
  const audienceContext = isBikerDesign
    ? `Target audience: software developers who ride motorcycles (BikeAdda brand). English language. International appeal.`
    : isLifeEvent
    ? `Target audience: Telugu families in Andhra Pradesh, Telangana, and diaspora celebrating ${festivalLabel}. Language: ${details.language}.`
    : isBusiness
    ? `Target audience: small business owners in AP/Telangana using this for ${festivalLabel} greetings. Language: ${details.language}.`
    : `Target audience: Telugu-speaking people in India and diaspora celebrating ${festivalLabel}. Language: ${details.language}.`

  const prompt = `You are an expert WooCommerce SEO copywriter for designranga.com — a Telugu digital design marketplace.

## The specific image you are writing copy for:
${imageDescription}

## Product context:
- Occasion: ${festivalLabel}
- Style: ${details.style}
- Category: ${details.category}
- ${audienceContext}
- Price: ₹${details.price}
- Digital download — instant ZIP with platform-optimised files:
  WhatsApp/Instagram (1080×1080), Facebook/LinkedIn (1200×630), Story (1080×1920), Twitter/X (1200×675), Print 300DPI (4096×4096), Web (800×800)
- Commercial use license included

## Your task:
Write WooCommerce product copy that is SPECIFIC to this exact image. Every sentence must reference something unique about this design — its visual elements, colors, mood, subject matter, or cultural significance. DO NOT write generic festival-product boilerplate that could apply to any ${festivalLabel} product.

If an image is attached, study it carefully and describe what you actually see — specific colors, elements, composition, text visible, artistic style, mood.

## Rules:
- Title must name the specific subject/theme of THIS image (not just "Holi wishes digital download")
- fullDescription must have at least one paragraph describing the visual content specifically
- altText must describe what a visually impaired person would see in THIS image
- Slug must be unique — derived from the specific subject matter

Return ONLY a valid JSON object:
{
  "title": "specific product title MAX 60 CHARS — names THIS image's subject, no filler words",
  "shortDescription": "2-3 sentences describing this specific design + instant download mention, under 160 chars",
  "fullDescription": "full HTML — MUST include: (1) paragraph describing what's in this specific image, (2) perfect-for section, (3) file details. Use <h3>, <ul>, <li>, <strong>. 300-500 words.",
  "metaDescription": "SEO meta STRICTLY under 155 chars — specific to this image's content, includes focus keyword naturally",
  "slug": "specific-subject-slug-with-hyphens",
  "tags": [],
  "altText": "describes THIS specific image under 125 chars",
  "focusKeyword": "short 2-4 word phrase — the single most important keyword for this specific image"
}

${details.language === 'telugu' || details.language === 'multilingual' ? `Telugu content rules:
- Include Telugu script in title (e.g. హోలీ శుభాకాంక్షలు, దీపావళి, etc.)
- Mix Telugu + English tags
- Mention WhatsApp sharing (huge in Telugu community)
- Target NRI diaspora too` : ''}

${isBikerDesign ? `BikeAdda rules:
- Reference specific biker/developer elements visible in the design
- Mention POD use cases (t-shirts, stickers, mugs, laptop skins)
- Developer humor keywords if applicable` : ''}`

  const messages: Anthropic.MessageParam[] = []

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    })
  } else {
    messages.push({
      role: 'user',
      content: prompt,
    })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages,
  })

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as Anthropic.TextBlock).text)
    .join('')

  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(clean) as GeneratedCopy

  // ── Hard caps — Claude occasionally ignores length instructions ────────

  // Title: max 60 chars, truncate at last word boundary
  if (parsed.title.length > 60) {
    parsed.title = parsed.title.slice(0, 60).replace(/\s+\S*$/, '').trim()
  }

  // Meta description: Yoast/Google show ~155 chars; hard cap at 155
  if (parsed.metaDescription.length > 155) {
    parsed.metaDescription = parsed.metaDescription.slice(0, 155).replace(/\s+\S*$/, '').trim()
  }

  // Focus keyword: Yoast uses this for readability checks — keep it short (max 50 chars)
  if (parsed.focusKeyword.length > 50) {
    parsed.focusKeyword = parsed.focusKeyword.slice(0, 50).replace(/\s+\S*$/, '').trim()
  }

  // ── Tags are fully deterministic — not left to Claude ────────────────
  // DEFAULT_TAGS always applied; festival-specific tags added based on the
  // festival value the user selected. No AI involvement in tag selection.
  parsed.tags = getProductTags(details.festival)

  return parsed
}
