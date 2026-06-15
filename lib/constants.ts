// lib/constants.ts

export const FESTIVALS = [
  // Telugu Festivals
  { value: 'diwali',            label: 'దీపావళి — Diwali',              group: 'Telugu Festivals' },
  { value: 'holi',              label: 'హోలీ — Holi',                   group: 'Telugu Festivals' },
  { value: 'ugadi',             label: 'ఉగాది — Ugadi',                 group: 'Telugu Festivals' },
  { value: 'sankranti',         label: 'సంక్రాంతి — Sankranti',         group: 'Telugu Festivals' },
  { value: 'navratri',          label: 'నవరాత్రి — Navratri',           group: 'Telugu Festivals' },
  { value: 'dasara',            label: 'దసరా — Dasara',                  group: 'Telugu Festivals' },
  { value: 'ganesh_chaturthi',  label: 'వినాయక చవితి — Ganesh Chaturthi', group: 'Telugu Festivals' },
  { value: 'raksha_bandhan',    label: 'రాఖీ — Raksha Bandhan',         group: 'Telugu Festivals' },
  { value: 'christmas',         label: 'క్రిస్మస్ — Christmas',         group: 'Telugu Festivals' },
  { value: 'new_year',          label: 'నూతన సంవత్సరం — New Year',      group: 'Telugu Festivals' },
  // Life Events
  { value: 'seemantham',        label: 'సీమంతం — Baby Shower',          group: 'Life Events' },
  { value: 'annaprashana',      label: 'అన్నప్రాశన — First Rice',       group: 'Life Events' },
  { value: 'upanayanam',        label: 'ఉపనయనం — Thread Ceremony',      group: 'Life Events' },
  { value: 'gruhapravesha',     label: 'గృహప్రవేశం — Housewarming',     group: 'Life Events' },
  { value: 'wedding_anniversary', label: 'వివాహ వార్షికోత్సవం — Anniversary', group: 'Life Events' },
  { value: 'birthday',          label: 'పుట్టినరోజు — Birthday',        group: 'Life Events' },
  // Business
  { value: 'shop_inauguration', label: 'దుకాణం ప్రారంభం — Shop Opening', group: 'Business' },
  // Biker & Developer
  { value: 'biker_developer',   label: 'Biker Developer — BikeAdda',    group: 'BikeAdda' },
  { value: 'general',           label: 'General / Other',               group: 'Other' },
]

export const LANGUAGES = [
  { value: 'telugu',      label: 'తెలుగు — Telugu' },
  { value: 'hindi',       label: 'हिंदी — Hindi' },
  { value: 'tamil',       label: 'தமிழ் — Tamil' },
  { value: 'kannada',     label: 'ಕನ್ನಡ — Kannada' },
  { value: 'english',     label: 'English' },
  { value: 'multilingual', label: 'Multi-language' },
]

export const STYLES = [
  { value: 'wishes',      label: 'Festival Wishes' },
  { value: 'vintage',     label: 'Vintage / Distressed' },
  { value: 'neon',        label: 'Neon / Cyberpunk' },
  { value: 'pixel',       label: 'Pixel / 8-bit' },
  { value: 'typography',  label: 'Typography / Text Art' },
  { value: 'minimalist',  label: 'Minimalist' },
  { value: 'biker',       label: 'Biker Style' },
  { value: 'developer',   label: 'Developer Humor' },
  { value: 'humor',       label: 'Humor / Meme' },
]

export const CATEGORIES = [
  { value: 'festival-wishes',  label: 'Festival Wishes',     id: null },
  { value: 'biker-developer',  label: 'Biker Developer',     id: null },
  { value: 'life-events',      label: 'Telugu Life Events',  id: null },
  { value: 'business',         label: 'Business / Professional', id: null },
  { value: 'developer-humor',  label: 'Developer Humor',     id: null },
]

export const PRICES = [
  { value: '49',   label: '₹49 — Intro / Launch' },
  { value: '99',   label: '₹99 — Standard' },
  { value: '149',  label: '₹149 — Premium' },
  { value: '199',  label: '₹199 — Bundle/Set' },
  { value: '499',  label: '₹499 — Pack' },
  { value: '999',  label: '₹999 — Complete Bundle' },
]

export const WATERMARK_TEXT = 'designranga.com'

// ── Tags applied to every product regardless of festival ─────────────────
export const DEFAULT_TAGS = [
  'Digital Download',
  'Facebook',
  'Instagram',
  'Instagram Story',
  'print',
  'Telugu Wishes',
  'WhatsApp',
  'YouTube Thumbnail',
] as const

// ── Festival / life-event specific tags ───────────────────────────────────
// Keyed by the festival `value` used in FESTIVALS above.
// Each entry lists only the tags relevant to that occasion.
// navratri, christmas, new_year, biker_developer, general → DEFAULT_TAGS only.
export const FESTIVAL_TAGS: Record<string, string[]> = {
  // ── Telugu Festivals ────────────────────────────────────────────────
  ugadi:             ['Ugadi', 'ఉగాది'],
  dasara:            ['Dasara', 'విజయదశమి'],
  holi:              ['holi', 'హోలీ'],
  sankranti:         ['Sankranti', 'సంక్రాంతి'],
  diwali:            ['Diwali', 'దీపావళి'],
  ganesh_chaturthi:  ['Ganesh Chaturthi', 'vinayaka chavithi', 'వినాయక చవితి'],
  raksha_bandhan:    ['raksha bandhan', 'రక్షా బంధన్'],
  // ── Life Events ─────────────────────────────────────────────────────
  seemantham:        ['seemantham', 'సీమంతం', 'babyshower'],
  gruhapravesha:     ['gruhapravesam'],
  annaprashana:      ['annaprashana'],
  upanayanam:        ['upanayanam'],
  wedding_anniversary: ['wedding_anniversary'],
  birthday:          ['birthday'],
  shop_inauguration: ['shop_inauguration'],
}

/**
 * Returns the full tag set for a product:
 * DEFAULT_TAGS + any festival-specific tags for the given festival value.
 */
export function getProductTags(festivalValue: string): string[] {
  const festivalSpecific = FESTIVAL_TAGS[festivalValue] ?? []
  // Use a Set to avoid duplicates, then spread back to array
  return [...new Set([...DEFAULT_TAGS, ...festivalSpecific])]
}
