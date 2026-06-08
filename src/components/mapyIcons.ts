import { DivIcon, Icon } from 'leaflet';

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
  default: '<circle cx="12" cy="11" r="2.6" fill="#fff" stroke="none"/>',
};

const CATEGORY_RULES: Array<[RegExp, GlyphKey]> = [
  [/coffee|café|cafe|tea house/, 'coffee'],
  [/restaurant|bistro|canteen|eatery|fast food|grill|food|cake|bakery|pastry|confection|dessert|ice cream/, 'restaurant'],
  [/bar|pub|beer|brewery|wine|cocktail|club/, 'bar'],
  [/hotel|accommodation|hostel|guest|motel|camp/, 'hotel'],
  [/museum|gallery|exhibition|theat|cinema/, 'museum'],
  [/garden|park|nature|forest|meadow|reserve|zoo/, 'park'],
  [/pharmacy/, 'pharmacy'],
  [/hospital|clinic|medical|health|doctor/, 'pharmacy'],
  [/parking/, 'parking'],
  [/fuel|petrol|gas station|charging/, 'fuel'],
  [/lookout|viewpoint|observation|tower|mountain|hill|peak|castle|chateau|palace|monument|ruin/, 'viewpoint'],
  [/shop|store|market|mall|supermarket|boutique|bank|atm/, 'shop'],
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

const TEARDROP =
  '<path d="M12 1C6 1 1 5.9 1 12c0 7.7 11 19 11 19s11-11.3 11-19C23 5.9 18 1 12 1z" fill="#c2410c" stroke="#fff" stroke-width="1.4"/>';

const categoryIconCache = new Map<GlyphKey, DivIcon>();

/**
 * A flat teardrop pin carrying a category sign (☕ coffee, 🍴 restaurant, …)
 * derived from the place's Mapy category label. Drawn as inline SVG so it's
 * crisp at any DPI and visually consistent across platforms.
 */
export const categoryPinIcon = (category?: string) => {
  const key = glyphKeyForCategory(category);
  let icon = categoryIconCache.get(key);
  if (!icon) {
    const html =
      `<svg class="mapy-poi-pin" viewBox="0 0 24 32" width="24" height="32">${TEARDROP}` +
      `<g fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[key]}</g></svg>`;
    icon = new DivIcon({
      className: 'mapy-poi-pin-wrap',
      html,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      tooltipAnchor: [0, -30],
      popupAnchor: [0, -30],
    });
    categoryIconCache.set(key, icon);
  }
  return icon;
};
