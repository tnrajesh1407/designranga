// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'
import { ProductDetails, GeneratedCopy } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateSEOCopy(
  details: ProductDetails,
  imageBase64?: string
): Promise<GeneratedCopy> {

  const festivalLabel = details.festival.replace(/_/g, ' ')
  const isTeluguFestival = details.language === 'telugu'
  const isBikerDesign = details.category === 'biker-developer'
  const isLifeEvent = details.category === 'life-events'
  const isBusiness = details.category === 'business'

  const contextPrompt = isBikerDesign
    ? `This is a biker-developer crossover design for BikeAdda brand targeting software developers who ride motorcycles. English language. Style: ${details.style}.`
    : isLifeEvent
    ? `This is a Telugu life event celebration image for ${festivalLabel} in ${details.language} language. Style: ${details.style}. Target audience: Telugu families in Andhra Pradesh and Telangana.`
    : isBusiness
    ? `This is a professional Telugu business occasion image for ${festivalLabel} in ${details.language} language. Target: small businesses in AP/Telangana.`
    : `This is a Telugu festival wishes image for ${festivalLabel} in ${details.language} language. Style: ${details.style}. Target audience: Telugu-speaking people in India and diaspora.`

  const prompt = `You are an expert WooCommerce SEO copywriter specializing in Indian festival images, Telugu cultural content, and developer niche products.

${contextPrompt}

Generate complete WooCommerce product SEO copy for this digital download image product on designranga.com.

Requirements:
- Product is a digital download (instant ZIP with multiple platform sizes)
- ZIP includes: WhatsApp/Instagram (1080x1080), Facebook/LinkedIn (1200x630), Story (1080x1920), Twitter (1200x675), Print 300DPI (4096x4096), Web (800x800)
- Transparent PNG for biker/developer designs, JPG for festival images
- Price: ₹${details.price}
- Commercial use license included

Return ONLY a valid JSON object with these exact fields:
{
  "title": "product title under 70 chars, SEO optimized",
  "shortDescription": "2-3 sentences, mentions instant download and what's included, under 160 chars",
  "fullDescription": "full HTML product description with sections, benefits, file details, perfect for section. Use <h3>, <ul>, <li>, <strong> tags. 300-500 words.",
  "metaDescription": "SEO meta description under 155 chars, includes primary keyword naturally",
  "slug": "url-friendly-slug-with-hyphens-only",
  "tags": ["array", "of", "10-15", "relevant", "tags"],
  "altText": "image alt text under 125 chars",
  "focusKeyword": "primary SEO keyword phrase"
}

Important for Telugu content:
- Include Telugu script in title if festival/life event (e.g. దీపావళి శుభాకాంక్షలు)
- Include both Telugu and English keywords in tags
- Target Telugu diaspora as well (NRI market)
- Mention WhatsApp sharing specifically (huge in Telugu community)

Important for BikeAdda designs:
- Target developer bikers specifically
- Mention POD use cases (t-shirts, stickers, mugs)
- Include developer humor keywords
- International appeal (English language)`

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

  // Clean JSON response
  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(clean) as GeneratedCopy
  return parsed
}
