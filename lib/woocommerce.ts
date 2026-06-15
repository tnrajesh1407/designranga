// lib/woocommerce.ts
import { GeneratedCopy, ProcessedImages } from '@/types'

const WOO_BASE = process.env.WOO_BASE_URL!
const WOO_KEY = process.env.WOO_CONSUMER_KEY!
const WOO_SECRET = process.env.WOO_CONSUMER_SECRET!

// WooCommerce REST API auth (for /wc/v3/ endpoints)
const wooAuthHeader = 'Basic ' + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString('base64')

const wooHeaders = {
  'Authorization': wooAuthHeader,
  'Content-Type': 'application/json',
}

// WordPress Application Password auth (for /wp/v2/ endpoints like media)
// Requires WP_USERNAME + WP_APP_PASSWORD in .env.local
function getWpAuthHeader(): string {
  const wpUser = process.env.WP_USERNAME
  const wpPass = process.env.WP_APP_PASSWORD
  if (!wpUser || !wpPass) {
    throw new Error('WP_USERNAME and WP_APP_PASSWORD must be set in .env.local for media uploads')
  }
  return 'Basic ' + Buffer.from(`${wpUser}:${wpPass}`).toString('base64')
}

// ── Upload image to WordPress Media Library ────────────────────────────────

export async function uploadMediaImage(
  imageBase64: string,
  fileName: string,
  altText: string
): Promise<number> {

  const buffer = Buffer.from(imageBase64, 'base64')
  const isJpeg = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
  const mimeType = isJpeg ? 'image/jpeg' : 'image/png'

  const response = await fetch(`${WOO_BASE}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': getWpAuthHeader(),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': mimeType,
    },
    body: buffer,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Media upload failed: ${err}`)
  }

  const data = await response.json()

  // Update alt text
  await fetch(`${WOO_BASE}/wp-json/wp/v2/media/${data.id}`, {
    method: 'POST',
    headers: {
      'Authorization': getWpAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alt_text: altText }),
  })

  return data.id
}

// ── Upload ZIP to WordPress Media Library ─────────────────────────────────
// Uploads directly to Bluehost's IP, bypassing Cloudflare's proxy.
// Cloudflare's 524 timeout fires at ~100s for large uploads. Going direct
// removes Cloudflare from the path entirely — Bluehost handles it end-to-end.

export async function uploadZipFile(
  zipBase64: string,
  fileName: string
): Promise<string> {

  const buffer = Buffer.from(zipBase64, 'base64')

  const bluehostIp = process.env.BLUEHOST_IP
  const domain     = new URL(WOO_BASE).hostname   // designranga.com

  const uploadUrl = bluehostIp
    ? `https://${bluehostIp}/wp-json/wp/v2/media`
    : `${WOO_BASE}/wp-json/wp/v2/media`

  console.log(`[uploadZipFile] url=${uploadUrl} direct=${!!bluehostIp} size=${buffer.length}`)

  // When hitting the raw IP, the SSL cert (issued for the domain, not the IP)
  // would fail hostname verification. We use Node's https module directly so we
  // can pass rejectUnauthorized:false while keeping TLS encryption intact.
  // For the non-direct path we use regular fetch (no TLS workaround needed).
  let responseText: string
  let responseOk: boolean

  if (bluehostIp) {
    const https = await import('https')
    const url   = new URL(uploadUrl)

    responseText = await new Promise<string>((resolve, reject) => {
      const reqOptions: import('https').RequestOptions = {
        hostname: url.hostname,
        port:     443,
        path:     url.pathname,
        method:   'POST',
        rejectUnauthorized: false,    // skip hostname check — IP ≠ domain in cert
        headers: {
          'Host':                domain,
          'Authorization':       getWpAuthHeader(),
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Type':        'application/octet-stream',
          'Content-Length':      String(buffer.length),
        },
      }

      const req = https.default.request(reqOptions, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          responseOk = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300
          resolve(Buffer.concat(chunks).toString('utf-8'))
        })
      })

      req.on('error', reject)
      req.setTimeout(120_000, () => { req.destroy(new Error('ZIP upload timeout')) })
      req.write(buffer)
      req.end()
    })
  } else {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization':       getWpAuthHeader(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type':        'application/octet-stream',
      },
      body: buffer,
    })
    responseOk   = res.ok
    responseText = await res.text()
  }

  if (!responseOk!) {
    throw new Error(`ZIP upload failed: ${responseText!}`)
  }

  const data = JSON.parse(responseText!) as { source_url: string }

  // Bluehost returns the correct domain URL even when hit via direct IP,
  // but replace just in case the IP leaks through on some configurations.
  const rawUrl    = data.source_url
  const publicUrl = bluehostIp
    ? rawUrl.replace(`https://${bluehostIp}`, WOO_BASE)
    : rawUrl

  return publicUrl
}

// ── Get or Create Category ─────────────────────────────────────────────────

export async function getOrCreateCategory(
  categorySlug: string,
  categoryName: string
): Promise<number> {

  // Check if exists
  const res = await fetch(
    `${WOO_BASE}/wp-json/wc/v3/products/categories?slug=${categorySlug}`,
    { headers: wooHeaders }
  )
  const existing = await res.json()

  if (existing.length > 0) {
    return existing[0].id
  }

  // Create new
  const createRes = await fetch(`${WOO_BASE}/wp-json/wc/v3/products/categories`, {
    method: 'POST',
    headers: wooHeaders,
    body: JSON.stringify({
      name: categoryName,
      slug: categorySlug,
    }),
  })

  const created = await createRes.json()
  return created.id
}

// ── Create WooCommerce Product ─────────────────────────────────────────────

export async function createWooProduct(
  copy: GeneratedCopy,
  images: ProcessedImages,
  price: string,
  categorySlug: string,
  categoryName: string,
  previewImageId: number,
  zipFileUrl: string
): Promise<{ productId: number; productUrl: string; editUrl: string }> {

  const categoryId = await getOrCreateCategory(categorySlug, categoryName)

  const productData = {
    name: copy.title,
    slug: copy.slug,
    type: 'simple',
    status: 'publish',
    virtual: true,
    downloadable: true,
    regular_price: price,

    description: copy.fullDescription,
    short_description: `${copy.shortDescription}\n\n🔒 Watermark-free HD file delivered instantly after purchase.\n💾 Instant ZIP download — no waiting, no shipping.`,

    downloads: [
      {
        name: 'designranga_bundle.zip',
        file: zipFileUrl,
      },
    ],
    download_limit: 5,
    download_expiry: 15,

    categories: [{ id: categoryId }],

    tags: copy.tags.map(tag => ({ name: tag })),

    images: [
      {
        id: previewImageId,
        alt: copy.altText,
      },
    ],

    meta_data: [
      // ── Yoast SEO ──────────────────────────────────────────────────────
      // Title: send without site name — Yoast appends " - Site Name" via its own template
      { key: '_yoast_wpseo_title',                value: copy.title },
      { key: '_yoast_wpseo_metadesc',             value: copy.metaDescription },
      // Focus keyword: short phrase Yoast uses for readability/SEO scoring
      { key: '_yoast_wpseo_focuskw',              value: copy.focusKeyword },
      // Canonical: explicit self-referencing canonical prevents duplicate-URL issues
      // WooCommerce sometimes creates ?add-to-cart= variants; this locks the canonical
      { key: '_yoast_wpseo_canonical',            value: `${WOO_BASE}/product/${copy.slug}/` },
      // Open Graph — controls how the product looks when shared on Facebook/WhatsApp
      { key: '_yoast_wpseo_opengraph-title',       value: copy.title },
      { key: '_yoast_wpseo_opengraph-description', value: copy.metaDescription },
      // Twitter Card — controls Twitter/X share preview
      { key: '_yoast_wpseo_twitter-title',         value: copy.title },
      { key: '_yoast_wpseo_twitter-description',   value: copy.metaDescription },
      // ── RankMath SEO (fallback if RankMath is active instead of Yoast) ──
      { key: 'rank_math_title',                   value: copy.title },
      { key: 'rank_math_description',             value: copy.metaDescription },
      { key: 'rank_math_focus_keyword',           value: copy.focusKeyword },
      { key: 'rank_math_canonical_url',           value: `${WOO_BASE}/product/${copy.slug}/` },
      // ── Custom designranga fields ───────────────────────────────────────
      { key: '_is_ai_generated',                  value: 'yes' },
      { key: '_designranga_category',             value: categorySlug },
    ],
  }

  const response = await fetch(`${WOO_BASE}/wp-json/wc/v3/products`, {
    method: 'POST',
    headers: wooHeaders,
    body: JSON.stringify(productData),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Product creation failed: ${err}`)
  }

  const product = await response.json()

  return {
    productId: product.id,
    productUrl: product.permalink,
    editUrl: `${WOO_BASE}/wp-admin/post.php?post=${product.id}&action=edit`,
  }
}

// ── Fetch existing categories for dropdown ─────────────────────────────────

export async function fetchCategories() {
  const res = await fetch(
    `${WOO_BASE}/wp-json/wc/v3/products/categories?per_page=50`,
    { headers: wooHeaders }
  )
  return res.json()
}
