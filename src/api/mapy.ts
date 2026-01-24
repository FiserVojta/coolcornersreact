import { env } from '../config/env';

export interface MapySearchResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
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
      const id = extractId(item, `${coords.lat},${coords.lng}`);
      return { id, name, ...coords };
    })
    .filter(Boolean) as MapySearchResult[];
};

export const searchMapyPlaces = async (query: string): Promise<MapySearchResult[]> => {
  if (!env.mapySearchUrl) return [];
  if (!env.mapyApiKey) throw new Error('Missing Mapy API key.');
  if (!query.trim()) return [];

  const url = new URL(env.mapySearchUrl);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('apikey', env.mapyApiKey);
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Mapy search failed.');
  }
  const data = (await response.json()) as unknown;
  return parseResults(data);
};
