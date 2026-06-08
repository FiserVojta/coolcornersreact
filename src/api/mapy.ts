import { env } from '../config/env';

export interface MapySearchResult {
  id: string;
  name: string;
  /** Mapy place category, e.g. "Coffee house" or "Museum" — used to pick a map sign. */
  category?: string;
  lat: number;
  lng: number;
}

export interface MapySearchOptions {
  /** Max results to return (Mapy caps this server-side). */
  limit?: number;
  /** Bias results toward this point — typically the current map view center. */
  near?: { lat: number; lng: number } | null;
  signal?: AbortSignal;
}

const pickString = (value: unknown) => (typeof value === 'string' ? value : null);

const extractCoords = (item: Record<string, unknown>) => {
  const geometry = item.geometry as { coordinates?: unknown } | undefined;
  if (Array.isArray(geometry?.coordinates) && geometry.coordinates.length >= 2) {
    const [lng, lat] = geometry.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
  }

  const position = item.position as { lat?: unknown; lon?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown } | undefined;
  const lat = typeof position?.lat === 'number' ? position.lat : typeof position?.latitude === 'number' ? position.latitude : null;
  const lng =
    typeof position?.lon === 'number'
      ? position.lon
      : typeof position?.lng === 'number'
        ? position.lng
        : typeof position?.longitude === 'number'
          ? position.longitude
          : null;
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };

  const latRaw = item.lat ?? item.latitude;
  const lngRaw = item.lng ?? item.lon ?? item.longitude;
  if (typeof latRaw === 'number' && typeof lngRaw === 'number') return { lat: latRaw, lng: lngRaw };

  return null;
};

const extractName = (item: Record<string, unknown>) => {
  return (
    pickString(item.name) ||
    pickString(item.label) ||
    pickString(item.title) ||
    pickString(item.formatted) ||
    pickString(item.address) ||
    pickString((item.address as { label?: unknown } | undefined)?.label) ||
    'Selected place'
  );
};

const extractId = (item: Record<string, unknown>, fallback: string) =>
  pickString(item.id) || pickString(item.placeId) || pickString(item.value) || fallback;

// Mapy returns the place category in `label` (e.g. "Coffee house", "Museum").
const extractCategory = (item: Record<string, unknown>) => pickString(item.label);

const parseResults = (data: unknown): MapySearchResult[] => {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const candidates = (record.features ||
    record.items ||
    record.results ||
    record.result ||
    record.data) as unknown;
  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      const coords = extractCoords(item);
      if (!coords) return null;
      const name = extractName(item);
      const rawCategory = extractCategory(item);
      const category = rawCategory && rawCategory !== name ? rawCategory : undefined;
      const id = extractId(item, `${coords.lat},${coords.lng}`);
      return { id, name, category, ...coords };
    })
    .filter(Boolean) as MapySearchResult[];
};

export const searchMapyPlaces = async (
  query: string,
  options: MapySearchOptions = {}
): Promise<MapySearchResult[]> => {
  if (!env.mapySearchUrl) return [];
  if (!env.mapyApiKey) throw new Error('Missing Mapy API key.');
  if (!query.trim()) return [];

  const url = new URL(env.mapySearchUrl);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('apikey', env.mapyApiKey);
  url.searchParams.set('limit', String(options.limit ?? 15));
  if (options.near) {
    // Mapy expects "lon,lat"; this biases (not filters) results toward the
    // point, so a category query like "coffee shops" surfaces nearby ones.
    url.searchParams.set('preferNear', `${options.near.lng},${options.near.lat}`);
    url.searchParams.set('preferNearPrecision', '5000');
  }

  const response = await fetch(url.toString(), { signal: options.signal });
  if (!response.ok) {
    throw new Error('Mapy search failed.');
  }
  const data = (await response.json()) as unknown;
  return parseResults(data);
};
