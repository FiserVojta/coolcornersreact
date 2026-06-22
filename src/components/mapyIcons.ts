import { DivIcon, Icon } from 'leaflet';
import type { Category } from '../types/place';

// Mapy.com's branded "drop" pins (22×31, point at the bottom centre). These
// assets are public — no API key needed. Available colours: red, blue, yellow.
const MAPY_MARKER_BASE = 'https://api.mapy.com/img/api/marker';

const makeMapyIcon = (color: 'red' | 'blue' | 'yellow') =>
  new Icon({
    iconUrl: `${MAPY_MARKER_BASE}/drop-${color}.png`,
    iconSize: [22, 31],
    iconAnchor: [11, 31],
    tooltipAnchor: [0, -31],
    popupAnchor: [0, -31],
  });

/** Blue Mapy pin — used for places already added to a trip/segment. */
export const stopPinIcon = makeMapyIcon('blue');

// ---------------------------------------------------------------------------
// Category pins for search results.
//
// Mapy's public API only returns a *text* category (e.g. "Coffee house") — its
// own POI pictograms aren't exposed as assets. So we draw our own flat,
// white-on-colour signs (in the spirit of Mapy's) as inline SVG. Each glyph is
// authored in the same 24×32 viewBox as the teardrop, sitting in the pin head
// (centred near 12,11). Stroke glyphs inherit the group's white stroke; solid
// glyphs set fill="#fff" stroke="none" themselves.
// ---------------------------------------------------------------------------

type GlyphKey =
  | 'coffee'
  | 'restaurant'
  | 'bar'
  | 'hotel'
  | 'museum'
  | 'park'
  | 'shop'
  | 'pharmacy'
  | 'parking'
  | 'fuel'
  | 'viewpoint'
  | 'city'
  | 'travel'
  | 'social'
  | 'volunteering'
  | 'presentation'
  | 'mix'
  | 'default';

const GLYPHS: Record<GlyphKey, string> = {
  coffee:
    '<path d="M8.2 9.3h5.6v2.3a2.8 2.8 0 0 1-5.6 0z" fill="#fff" stroke="none"/>' +
    '<path d="M13.9 10c1.4 0 1.4 2.3 0 2.3"/>' +
    '<path d="M7.6 15.1h6.8"/>' +
    '<path d="M9.5 7.9c.5-.7.2-1.4 0-1.9M11.5 7.9c.5-.7.2-1.4 0-1.9"/>',
  restaurant:
    '<path d="M9 6.8v10.4"/>' +
    '<path d="M7.7 6.8v2.7M10.3 6.8v2.7M7.7 9.5c0 .9.5 1.3 1.3 1.3s1.3-.4 1.3-1.3"/>' +
    '<path d="M14.7 6.8c-1.3 0-1.8 2.2-1.8 3.4 0 .9.7 1.1 1 1.1v5.9"/>',
  bar:
    '<path d="M8.4 8h5.2v7.8a1 1 0 0 1-1 1H9.4a1 1 0 0 1-1-1z" fill="#fff" stroke="none"/>' +
    '<path d="M13.6 9.6h1.5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1.5"/>',
  hotel:
    '<path d="M7 8v9"/>' +
    '<path d="M7 12.2h10V17"/>' +
    '<path d="M8.7 12.2v-1.7h2.5a1.6 1.6 0 0 1 1.6 1.7"/>',
  museum:
    '<path d="M6.5 10l5.5-3 5.5 3"/>' +
    '<path d="M7.9 11v4.6M10.3 11v4.6M13.7 11v4.6M16.1 11v4.6"/>' +
    '<path d="M6.6 16.6h10.8"/>',
  park:
    '<circle cx="12" cy="9.8" r="3" fill="#fff" stroke="none"/>' +
    '<path d="M12 12.6V17"/>',
  shop:
    '<path d="M8.2 9.6h7.6l-.6 7.1H8.8z" fill="#fff" stroke="none"/>' +
    '<path d="M9.9 9.6a2.1 2.1 0 0 1 4.2 0"/>',
  pharmacy: '<path d="M10.4 6.2h3.2v3.2h3.2v3.2h-3.2v3.2h-3.2v-3.2H7.2V9.4h3.2z" fill="#fff" stroke="none"/>',
  parking:
    '<text x="12" y="14.6" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#fff" stroke="none">P</text>',
  fuel:
    '<path d="M8 7.6h4.6v9H8z"/>' +
    '<path d="M8 11.1h4.6"/>' +
    '<path d="M12.6 9.1l2.1 1.6v4a1.1 1.1 0 0 0 2.2 0v-3.3l-1.5-1.4"/>',
  viewpoint: '<path d="M6.5 16.2l3.3-5.6 2.1 3.2 1.3-1.9 3.8 4.3z" fill="#fff" stroke="none"/>',
  city: '<path d="M7 16.5V9.6l3-1.5v8.4M13 16.5V8l4 2.2v6.3M6.6 16.5h10.8"/>',
  travel:
    '<path d="M12 6.6c.6 0 .9.8.9 1.8V11l3.7 2.4v1l-3.7-1.1v2.1l1.1.9v.6L12 16.4l-2 .5v-.6l1.1-.9v-2.1L7.4 14.4v-1L11.1 11V8.4c0-1 .3-1.8.9-1.8z" fill="#fff" stroke="none"/>',
  social:
    '<circle cx="9" cy="9.3" r="1.6"/>' +
    '<path d="M6.5 15.8v-.9a2.5 2.5 0 0 1 5 0v.9"/>' +
    '<circle cx="15" cy="9.3" r="1.6"/>' +
    '<path d="M12.5 15.8v-.9a2.5 2.5 0 0 1 5 0v.9"/>',
  volunteering:
    '<path d="M12 16s-4.5-3.5-4.5-6.2A2.25 2.25 0 0 1 12 8.3a2.25 2.25 0 0 1 4.5 1.5C16.5 12.5 12 16 12 16z" fill="#fff" stroke="none"/>',
  presentation:
    '<rect x="6.8" y="6.8" width="10.4" height="6.6" rx="0.8"/>' +
    '<path d="M12 13.4v2.1M10 15.9h4"/>' +
    '<path d="M9.2 11.3l1.9-1.8 1.5 1.1 2.3-2.4"/>',
  mix:
    '<circle cx="9.6" cy="8.8" r="1.5" fill="#fff" stroke="none"/>' +
    '<circle cx="14.4" cy="8.8" r="1.5" fill="#fff" stroke="none"/>' +
    '<circle cx="9.6" cy="13.3" r="1.5" fill="#fff" stroke="none"/>' +
    '<circle cx="14.4" cy="13.3" r="1.5" fill="#fff" stroke="none"/>',
  default: '<circle cx="12" cy="11" r="2.6" fill="#fff" stroke="none"/>',
};

// Order matters: the first matching rule wins. Keep the more specific food
// rules (restaurant) above 'bar' so e.g. "Snack bar" maps to food, not beer.
// Tokens reflect the real English labels Mapy returns (verified live), e.g.
// "Coffee shop", "Filling station", "Lookout tower, viewpoint".
const CATEGORY_RULES: Array<[RegExp, GlyphKey]> = [
  [/coffee|café|cafe|tea house|roastery|espresso/, 'coffee'],
  [/restaurant|bistro|canteen|eatery|fast food|snack|grill|food|cake|bakery|pastry|confection|dessert|ice cream/, 'restaurant'],
  [/bar|pub|beer|brewery|wine|cocktail|club/, 'bar'],
  [/hotel|accommodation|hostel|guest|motel|camp/, 'hotel'],
  [/museum|gallery|exhibition|theat|cinema/, 'museum'],
  [/garden|park|nature|forest|meadow|reserve|zoo/, 'park'],
  [/pharmacy/, 'pharmacy'],
  [/hospital|clinic|medical|health|doctor/, 'pharmacy'],
  [/parking/, 'parking'],
  [/fuel|petrol|gas station|filling station|charging/, 'fuel'],
  [/lookout|viewpoint|observation|tower|mountain|hill|peak|castle|chateau|palace|monument|ruin/, 'viewpoint'],
  [/shop|store|market|mall|supermarket|hypermarket|grocery|convenience|boutique|bank|atm/, 'shop'],
  [/town|city|municipalit|village|region/, 'city'],
];

const glyphKeyForCategory = (category?: string): GlyphKey => {
  if (!category) return 'default';
  const c = category.toLowerCase();
  for (const [pattern, key] of CATEGORY_RULES) {
    if (pattern.test(c)) return key;
  }
  return 'default';
};

/** Coerce an arbitrary string (e.g. a stored `category.icon`) to a known glyph key. */
const asGlyphKey = (icon?: string): GlyphKey =>
  icon && icon in GLYPHS ? (icon as GlyphKey) : 'default';

/** Default teardrop fill — Mapy-ish burnt orange. */
const DEFAULT_PIN_COLOR = '#c2410c';

const teardrop = (color: string) =>
  `<path d="M12 1C6 1 1 5.9 1 12c0 7.7 11 19 11 19s11-11.3 11-19C23 5.9 18 1 12 1z" fill="${color}" stroke="#fff" stroke-width="1.4"/>`;

// Cache by glyph + colour so distinct categories don't share an icon instance.
const categoryIconCache = new Map<string, DivIcon>();

/**
 * Build a flat teardrop pin carrying a category sign, drawn as inline SVG so
 * it's crisp at any DPI and visually consistent across platforms. Cached per
 * (glyph, colour) pair.
 */
const buildPin = (key: GlyphKey, color: string = DEFAULT_PIN_COLOR) => {
  const cacheKey = `${key}:${color}`;
  let icon = categoryIconCache.get(cacheKey);
  if (!icon) {
    const html =
      `<svg class="mapy-poi-pin" viewBox="0 0 24 32" width="24" height="32">${teardrop(color)}` +
      `<g fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[key]}</g></svg>`;
    icon = new DivIcon({
      className: 'mapy-poi-pin-wrap',
      html,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      tooltipAnchor: [0, -30],
      popupAnchor: [0, -30],
    });
    categoryIconCache.set(cacheKey, icon);
  }
  return icon;
};

/**
 * Pin for a Mapy search result: the glyph is *guessed* from Mapy's free-text
 * category label (☕ coffee, 🍴 restaurant, …) via regex, since Mapy exposes
 * nothing more structured. Best-effort fallback path.
 */
export const categoryPinIcon = (category?: string) => buildPin(glyphKeyForCategory(category));

/**
 * Pin for our own saved data: the glyph (and optional colour) come straight
 * from the place/trip `Category`, so it's exact rather than guessed. Unknown
 * or absent icon keys fall back to the 'default' glyph.
 */
export const categoryPinIconByKey = (icon?: string, color?: string) =>
  buildPin(asGlyphKey(icon), color || DEFAULT_PIN_COLOR);

/** Blue used for trip stops, keeping them visually distinct from amber search pins. */
export const STOP_PIN_COLOR = '#2563eb';

/**
 * Pin for a saved trip stop: a blue teardrop carrying its category glyph (or
 * the default glyph when the stop has no category yet).
 */
export const stopCategoryIcon = (icon?: string) => buildPin(asGlyphKey(icon), STOP_PIN_COLOR);

// When a Mapy label maps to a fine glyph our coarse categories don't carry
// (e.g. coffee, viewpoint), fall back to a related glyph that they do, so the
// guess still lands on a sensible category instead of nothing.
const GUESS_AFFINITY: Partial<Record<GlyphKey, GlyphKey[]>> = {
  coffee: ['restaurant'],
  viewpoint: ['museum'],
  city: ['museum'],
  hotel: ['museum'],
};

/**
 * Best-effort guess of which of our own categories a Mapy label belongs to.
 * Maps the label to a glyph, then finds a category whose stored `icon` matches
 * that glyph (or an affinity fallback). Returns undefined when nothing fits —
 * the caller leaves it unset and the creator can pick manually.
 */
export const guessCategoryId = (
  label: string | undefined,
  categories: Category[]
): number | undefined => {
  if (!label || !categories.length) return undefined;
  const glyph = glyphKeyForCategory(label);
  if (glyph === 'default') return undefined;
  const keys: GlyphKey[] = [glyph, ...(GUESS_AFFINITY[glyph] ?? [])];
  for (const key of keys) {
    const match = categories.find((c) => c.icon === key);
    if (match) return match.id;
  }
  return undefined;
};
