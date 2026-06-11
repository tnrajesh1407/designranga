# designranga Admin Tool

Internal product upload dashboard for designranga.com.
Built with Next.js + Tailwind, deployed on Vercel.

## What it does

1. Upload image (drag & drop)
2. Select festival, language, style, category, price
3. Claude generates SEO copy automatically
4. Edit copy if needed
5. Click Publish → uploads to WooCommerce with watermarked preview + ZIP bundle

## Setup

### 1. Install
```bash
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local`:
```
ANTHROPIC_API_KEY=         # console.anthropic.com
WOO_BASE_URL=              # https://designranga.com
WOO_CONSUMER_KEY=          # WooCommerce REST API key
WOO_CONSUMER_SECRET=       # WooCommerce REST API secret
ADMIN_PASSWORD=            # your chosen password
```

### 3. WooCommerce API Keys
WP Admin → WooCommerce → Settings → Advanced → REST API
→ Add Key → Read/Write permissions

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
npx vercel
```
Add all env variables in Vercel dashboard.

### 6. Custom domain
Add CNAME in Bluehost DNS:
- Name: admin
- Value: cname.vercel-dns.com

## Processing Modes

| Mode   | Use for                  | Output                                    |
|--------|--------------------------|-------------------------------------------|
| Social | Festival wishes          | WhatsApp, Instagram, Facebook, Story, Web |
| POD    | BikeAdda/developer designs | T-Shirt, Mug, Sticker, Poster, Tote     |
| All    | Both                     | Everything in one ZIP                     |
