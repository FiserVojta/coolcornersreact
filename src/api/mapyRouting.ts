import { env } from '../config/env';

export type LatLngTuple = [number, number];

/** Mapy.com routing profiles; public transport isn't supported there, so callers map it to `car_fast`. */
export type MapyRouteType = 'car_fast' | 'foot_fast';

const MAPY_ROUTING_URL = 'https://api.mapy.com/v1/routing/route';

type GeoJsonLine = { type?: string; coordinates?: [number, number][] };

interface MapyRouteResponse {
  geometry?: GeoJsonLine & { geometry?: GeoJsonLine };
}

/**
 * Road/footpath geometry for one leg between two points, as [lat, lng] pairs.
 * Throws when routing fails so the caller can fall back to a straight line.
 */
export const fetchMapyRoute = async (
  from: LatLngTuple,
  to: LatLngTuple,
  routeType: MapyRouteType,
  signal?: AbortSignal
): Promise<LatLngTuple[]> => {
  if (!env.mapyApiKey) throw new Error('Missing Mapy API key');

  const params = new URLSearchParams({
    start: `${from[1]},${from[0]}`,
    end: `${to[1]},${to[0]}`,
    routeType,
    format: 'geojson',
    apikey: env.mapyApiKey
  });
  const res = await fetch(`${MAPY_ROUTING_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Mapy routing failed: ${res.status}`);

  const data = (await res.json()) as MapyRouteResponse;
  // The geometry is a GeoJSON Feature wrapping a LineString; tolerate a bare LineString too.
  const coords = data.geometry?.geometry?.coordinates ?? data.geometry?.coordinates;
  if (!coords?.length) throw new Error('Mapy routing returned no geometry');
  return coords.map(([lng, lat]) => [lat, lng]);
};
