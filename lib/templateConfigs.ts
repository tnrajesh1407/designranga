// lib/templateConfigs.ts
//
// Zone definitions for each pre-generated template.
//
// How to add a new template:
// 1. Generate the base image using the admin tool (no text in the image).
// 2. Open the image in any editor, note the pixel coordinates of where
//    name/message/logo should appear.
// 3. Add an entry here with those coordinates.
// 4. Use the same templateId when calling POST /api/personalize.
//
// Canvas coordinates assume the image was resized to canvas.width × canvas.height
// before compositing. If your generated image is 1024×1024, set canvas accordingly.
//
// All x values for text zones are the CENTER point (text-anchor: middle).
// All y values are the BASELINE of the text (bottom of the first line).

import { TemplateConfig } from '@/lib/personalize'

export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {

  // ── Diwali — square format ────────────────────────────────────────────────
  'diwali-square-01': {
    id:     'diwali-square-01',
    name:   'Diwali Wishes — Square',
    canvas: { width: 1024, height: 1024 },
    nameZone: {
      x:         512,   // center of 1024px canvas
      y:         880,   // near bottom
      maxWidth:  800,
      fontSize:  64,
      color:     '#FFD700',  // gold
      align:     'center',
      fontWeight: 'bold',
    },
    messageZone: {
      x:         512,
      y:         960,
      maxWidth:  800,
      fontSize:  40,
      color:     '#FFFFFF',
      align:     'center',
    },
    logoZone: {
      x:      412,   // centered: (1024 - 200) / 2
      y:      700,
      width:  200,
      height: 80,
      fit:    'contain',
    },
  },

  // ── Sankranti — square format ─────────────────────────────────────────────
  'sankranti-square-01': {
    id:     'sankranti-square-01',
    name:   'Sankranti Wishes — Square',
    canvas: { width: 1024, height: 1024 },
    nameZone: {
      x:         512,
      y:         870,
      maxWidth:  820,
      fontSize:  62,
      color:     '#FF6B00',  // saffron/orange
      align:     'center',
      fontWeight: 'bold',
    },
    messageZone: {
      x:         512,
      y:         950,
      maxWidth:  820,
      fontSize:  38,
      color:     '#FFF8E7',  // warm white
      align:     'center',
    },
    logoZone: {
      x:      412,
      y:      690,
      width:  200,
      height: 80,
      fit:    'contain',
    },
  },

  // ── Ugadi — square format ─────────────────────────────────────────────────
  'ugadi-square-01': {
    id:     'ugadi-square-01',
    name:   'Ugadi Wishes — Square',
    canvas: { width: 1024, height: 1024 },
    nameZone: {
      x:         512,
      y:         875,
      maxWidth:  820,
      fontSize:  60,
      color:     '#2ECC71',  // festive green
      align:     'center',
      fontWeight: 'bold',
    },
    messageZone: {
      x:         512,
      y:         955,
      maxWidth:  820,
      fontSize:  38,
      color:     '#FFFFFF',
      align:     'center',
    },
    logoZone: {
      x:      412,
      y:      695,
      width:  200,
      height: 80,
      fit:    'contain',
    },
  },

  // ── Ganesh Chaturthi — square format ──────────────────────────────────────
  'ganesh-square-01': {
    id:     'ganesh-square-01',
    name:   'Vinayaka Chavithi Wishes — Square',
    canvas: { width: 1024, height: 1024 },
    nameZone: {
      x:         512,
      y:         870,
      maxWidth:  820,
      fontSize:  60,
      color:     '#FFD700',
      align:     'center',
      fontWeight: 'bold',
    },
    messageZone: {
      x:         512,
      y:         950,
      maxWidth:  820,
      fontSize:  38,
      color:     '#FFFFFF',
      align:     'center',
    },
    logoZone: {
      x:      412,
      y:      690,
      width:  200,
      height: 80,
      fit:    'contain',
    },
  },

  // ── Birthday — square format ───────────────────────────────────────────────
  'birthday-square-01': {
    id:     'birthday-square-01',
    name:   'Birthday Wishes — Square',
    canvas: { width: 1024, height: 1024 },
    nameZone: {
      x:         512,
      y:         860,
      maxWidth:  820,
      fontSize:  64,
      color:     '#FF1493',  // pink
      align:     'center',
      fontWeight: 'bold',
    },
    messageZone: {
      x:         512,
      y:         945,
      maxWidth:  820,
      fontSize:  40,
      color:     '#FFFFFF',
      align:     'center',
    },
    // No logo zone for birthday — personal use typically
  },

  // ── Business offer — square format ────────────────────────────────────────
  // Used for shop/business Diwali/festival offer posters
  'business-offer-square-01': {
    id:     'business-offer-square-01',
    name:   'Business Festival Offer — Square',
    canvas: { width: 1024, height: 1024 },
    nameZone: {
      x:         512,
      y:         820,
      maxWidth:  860,
      fontSize:  58,
      color:     '#FFD700',
      align:     'center',
      fontWeight: 'bold',
    },
    messageZone: {
      x:         512,
      y:         910,
      maxWidth:  860,
      fontSize:  44,
      color:     '#FFFFFF',
      align:     'center',
      fontWeight: 'bold',
    },
    logoZone: {
      x:      362,   // centered: (1024 - 300) / 2
      y:      640,
      width:  300,
      height: 120,
      fit:    'contain',
    },
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns all template IDs grouped by festival for the customer picker UI */
export function getTemplatesByFestival(): Record<string, TemplateConfig[]> {
  const grouped: Record<string, TemplateConfig[]> = {}
  for (const config of Object.values(TEMPLATE_CONFIGS)) {
    // Derive festival from the id prefix e.g. "diwali-square-01" → "diwali"
    const festival = config.id.split('-')[0]
    if (!grouped[festival]) grouped[festival] = []
    grouped[festival].push(config)
  }
  return grouped
}
