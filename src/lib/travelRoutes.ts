import L from 'leaflet';
import { fetchMapyRoute, type LatLngTuple, type MapyRouteType } from '../api/mapyRouting';
import type { TravelPlace, TravelTransportMode } from '../types/travel';

/** Road-following profiles; public transport has no Mapy profile, so it follows roads by car. */
const ROUTE_TYPES: Partial<Record<TravelTransportMode, MapyRouteType>> = {
  WALKING: 'foot_fast',
  DRIVING: 'car_fast',
  PUBLIC_TRANSPORT: 'car_fast'
};

export const routeTypeFor = (mode: TravelTransportMode | null | undefined): MapyRouteType | undefined =>
  mode ? ROUTE_TYPES[mode] : undefined;

/** Identifies a routed leg; a cached line is only reused while its endpoints and profile are unchanged. */
const legKey = (from: LatLngTuple, to: LatLngTuple, routeType: MapyRouteType) =>
  `${routeType}:${from[0]},${from[1]}>${to[0]},${to[1]}`;

/** ~10 m tolerance in degrees; drops most of Mapy's points without visibly changing the line. */
const SIMPLIFY_TOLERANCE = 0.0001;

const simplify = (line: LatLngTuple[]): LatLngTuple[] =>
  L.LineUtil.simplify(
    line.map(([lat, lng]) => L.point(lng, lat)),
    SIMPLIFY_TOLERANCE
  ).map((p) => [Math.round(p.y * 1e5) / 1e5, Math.round(p.x * 1e5) / 1e5]);

const pointOf = (place: TravelPlace): LatLngTuple => [place.latitude, place.longitude];

/** Cached lines already stored on these places, keyed by the leg they were routed for. */
export const cachedRoutesOf = (places: TravelPlace[], defaultMode: TravelTransportMode | null | undefined) => {
  const cache = new Map<string, LatLngTuple[]>();
  places.forEach((place, idx) => {
    const routeType = routeTypeFor(place.transportMode ?? defaultMode);
    if (idx === 0 || !routeType || !place.routeGeometry?.length) return;
    cache.set(legKey(pointOf(places[idx - 1]), pointOf(place), routeType), place.routeGeometry);
  });
  return cache;
};

/**
 * Attaches the routed line of the arriving leg to every place, reusing `cache` and calling Mapy
 * only for legs it doesn't cover. Unroutable legs (flying, unspecified, or a failed request) get
 * null, and the map then draws them itself.
 */
export const withRouteGeometry = async (
  places: TravelPlace[],
  defaultMode: TravelTransportMode | null | undefined,
  cache: Map<string, LatLngTuple[]>
): Promise<TravelPlace[]> =>
  Promise.all(
    places.map(async (place, idx) => {
      const routeType = routeTypeFor(place.transportMode ?? defaultMode);
      if (idx === 0 || !routeType) return { ...place, routeGeometry: null };

      const from = pointOf(places[idx - 1]);
      const to = pointOf(place);
      const key = legKey(from, to, routeType);
      let line = cache.get(key);
      if (!line) {
        try {
          line = simplify(await fetchMapyRoute(from, to, routeType));
          cache.set(key, line);
        } catch {
          line = undefined;
        }
      }
      return { ...place, routeGeometry: line ?? null };
    })
  );
