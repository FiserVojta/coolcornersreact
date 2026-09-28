import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L, { type PathOptions } from 'leaflet';
import { MapyTileLayer } from './MapyTileLayer';
import { env } from '../config/env';
import { fetchMapyRoute, type LatLngTuple } from '../api/mapyRouting';
import { routeTypeFor } from '../lib/travelRoutes';
import {
  TRANSPORT_MODE_LABELS,
  type TravelPhoto,
  type TravelPlace,
  type TravelTransportMode
} from '../types/travel';

const mapContainerStyle = { width: '100%', height: '280px', borderRadius: '16px', overflow: 'hidden' };

/** Keeps the map fitted to all points; MapContainer only honors center/bounds on mount. */
const FitToPoints = ({ points }: { points: { lat: number; lng: number }[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [24, 24] });
  }, [map, points]);
  return null;
};

const ROUTE_STYLES: Record<TravelTransportMode | 'NONE', PathOptions> = {
  NONE: { color: '#2d75f5', weight: 4 },
  WALKING: { color: '#16a34a', weight: 4, dashArray: '1 8', lineCap: 'round' },
  DRIVING: { color: '#2d75f5', weight: 4 },
  PUBLIC_TRANSPORT: { color: '#7c3aed', weight: 4, dashArray: '10 6' },
  FLYING: { color: '#0f172a', weight: 3, opacity: 0.7, dashArray: '6 8' }
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle arc between two points, so flights curve like they do on real flight maps. */
const greatCircle = (from: LatLngTuple, to: LatLngTuple, segments = 64): LatLngTuple[] => {
  const [lat1, lng1, lat2, lng2] = [from[0], from[1], to[0], to[1]].map(toRad);
  const d =
    2 *
    Math.asin(
      Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2)
    );
  if (d === 0) return [from, to];

  const points: LatLngTuple[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  // Keep longitudes continuous so arcs crossing the antimeridian don't streak across the map.
  for (let i = 1; i < points.length; i++) {
    const delta = points[i][1] - points[i - 1][1];
    if (delta > 180) points[i][1] -= 360;
    else if (delta < -180) points[i][1] += 360;
  }
  return points;
};

type Stop = { point: LatLngTuple; mode?: TravelTransportMode | null; cachedRoute?: LatLngTuple[] | null };
type RouteLeg = { positions: LatLngTuple[]; mode: TravelTransportMode | null };

/**
 * One polyline per leg between consecutive places. Each leg uses the mode stored on the place it
 * arrives at, falling back to the travel's default mode.
 */
const useRouteLegs = (
  stops: Stop[],
  defaultMode: TravelTransportMode | null | undefined,
  enabled: boolean
): RouteLeg[] => {
  const straightLegs = useMemo(
    () =>
      stops.slice(1).map((to, idx) => ({
        from: stops[idx].point,
        to: to.point,
        mode: to.mode ?? defaultMode ?? null,
        cachedRoute: to.cachedRoute
      })),
    [stops, defaultMode]
  );

  // Only road/footpath legs without a line cached at save time need the routing API.
  const toRoute = useMemo(
    () =>
      straightLegs.flatMap((leg, idx) => {
        const routeType = routeTypeFor(leg.mode);
        return routeType && !leg.cachedRoute?.length ? [{ idx, from: leg.from, to: leg.to, routeType }] : [];
      }),
    [straightLegs]
  );

  const routed = useQuery({
    queryKey: ['mapy-route', toRoute.map(({ from, to, routeType }) => [from, to, routeType])],
    enabled: enabled && toRoute.length > 0,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const results = await Promise.allSettled(
        toRoute.map(({ from, to, routeType }) => fetchMapyRoute(from, to, routeType, signal))
      );
      // A leg that can't be routed (e.g. across the sea) keeps its straight line.
      return new Map(
        results.flatMap((result, i) => (result.status === 'fulfilled' ? [[toRoute[i].idx, result.value] as const] : []))
      );
    }
  });

  return useMemo(
    () =>
      straightLegs.map((leg, idx) => ({
        mode: leg.mode,
        positions:
          leg.mode === 'FLYING'
            ? greatCircle(leg.from, leg.to)
            : (routeTypeFor(leg.mode) && leg.cachedRoute?.length ? leg.cachedRoute : undefined) ??
              routed.data?.get(idx) ?? [leg.from, leg.to]
      })),
    [straightLegs, routed.data]
  );
};

/** Read-only map of a travel: visited-place pins (dark) + geotagged photo markers (amber, with thumbnail). */
export const TravelMap = ({
  places,
  photos,
  transportMode,
  getPhotoHref
}: {
  places?: TravelPlace[];
  photos?: TravelPhoto[];
  transportMode?: TravelTransportMode | null;
  getPhotoHref?: (photo: TravelPhoto) => string | undefined;
}) => {
  const needsTileKey =
    env.mapyTilesUrl.includes('{apikey}') ||
    env.mapyTilesUrl.includes('{API_KEY}') ||
    env.mapyTilesUrl.includes('${API_KEY}');
  const hasTiles = !!env.mapyApiKey || !needsTileKey;

  const placeCoords = useMemo(
    () =>
      (places ?? [])
        .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
        .map((place) => ({
          lat: place.latitude,
          lng: place.longitude,
          name: place.name ?? '',
          mode: place.transportMode,
          cachedRoute: place.routeGeometry
        })),
    [places]
  );

  const photoCoords = useMemo(
    () =>
      (photos ?? [])
        .filter((photo) => Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude))
        .map((photo) => ({
          lat: photo.latitude as number,
          lng: photo.longitude as number,
          name: photo.name ?? 'Photo',
          url: photo.url ?? undefined,
          href: getPhotoHref?.(photo)
        })),
    [photos, getPhotoHref]
  );

  const all = useMemo(() => [...placeCoords, ...photoCoords], [placeCoords, photoCoords]);

  const stops = useMemo(
    () => placeCoords.map((c) => ({ point: [c.lat, c.lng] as LatLngTuple, mode: c.mode, cachedRoute: c.cachedRoute })),
    [placeCoords]
  );
  const routeLegs = useRouteLegs(stops, transportMode, hasTiles);
  const usedModes = useMemo(
    () => [...new Set(routeLegs.flatMap((leg) => (leg.mode ? [leg.mode] : [])))],
    [routeLegs]
  );

  if (!all.length) return null;

  if (!hasTiles) {
    return (
      <Section>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="text-sm text-ink-muted">
            Provide <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs">VITE_MAPY_API_KEY</code> to render the map.
          </p>
        </div>
      </Section>
    );
  }

  const center = all[0];

  return (
    <Section modes={usedModes}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <MapContainer center={center} zoom={10} style={mapContainerStyle} scrollWheelZoom={false}>
          <MapyTileLayer />
          <FitToPoints points={all} />
          {placeCoords.map((pos, idx) => (
            <CircleMarker
              key={`place-${pos.lat}-${pos.lng}-${idx}`}
              center={pos}
              radius={7}
              pathOptions={{ color: '#0f172a', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]}>{pos.name || `Place ${idx + 1}`}</Tooltip>
            </CircleMarker>
          ))}
          {routeLegs.map((leg, idx) => (
            <Polyline
              key={`leg-${idx}-${leg.mode ?? 'none'}`}
              positions={leg.positions}
              pathOptions={ROUTE_STYLES[leg.mode ?? 'NONE']}
            />
          ))}
          {photoCoords.map((pos, idx) => (
            <CircleMarker
              key={`photo-${pos.lat}-${pos.lng}-${idx}`}
              center={pos}
              radius={8}
              pathOptions={{ color: '#b45309', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }}
            >
              <Popup>
                <div className="flex flex-col gap-1">
                  {pos.url ? (
                    pos.href ? (
                      <Link to={pos.href}>
                        <img src={pos.url} alt={pos.name} style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 8 }} />
                      </Link>
                    ) : (
                      <img src={pos.url} alt={pos.name} style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 8 }} />
                    )
                  ) : null}
                  <span style={{ fontSize: 12 }}>{pos.name}</span>
                  {pos.href ? (
                    <Link to={pos.href} style={{ fontSize: 12, fontWeight: 600 }}>
                      Open photo →
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </Section>
  );
};

const Section = ({ children, modes = [] }: { children: React.ReactNode; modes?: TravelTransportMode[] }) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="mr-1 font-display text-xl font-semibold text-ink-strong">Travel map</h2>
      {/* Doubles as the legend: one chip per mode used on the route, in its line color. */}
      {modes.map((mode) => (
        <span
          key={mode}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-ink-muted"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ROUTE_STYLES[mode].color }} />
          {TRANSPORT_MODE_LABELS[mode]}
        </span>
      ))}
    </div>
    {children}
  </section>
);
