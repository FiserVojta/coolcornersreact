import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { MapyTileLayer } from './MapyTileLayer';
import { env } from '../config/env';
import type { TravelPhoto, TravelPlace } from '../types/travel';

const mapContainerStyle = { width: '100%', height: '280px', borderRadius: '16px', overflow: 'hidden' };

/** Read-only map of a travel: visited-place pins (dark) + geotagged photo markers (amber, with thumbnail). */
export const TravelMap = ({
  places,
  photos,
  getPhotoHref
}: {
  places?: TravelPlace[];
  photos?: TravelPhoto[];
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
        .map((place) => ({ lat: place.latitude, lng: place.longitude, name: place.name ?? '' })),
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
  const bounds = all.length > 1 ? L.latLngBounds(all.map((c) => [c.lat, c.lng])) : undefined;

  return (
    <Section>
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <MapContainer
          center={center}
          zoom={10}
          style={mapContainerStyle}
          bounds={bounds}
          boundsOptions={{ padding: [24, 24] }}
          scrollWheelZoom={false}
        >
          <MapyTileLayer />
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
          {placeCoords.length > 1 && (
            <Polyline positions={placeCoords.map((c) => [c.lat, c.lng])} pathOptions={{ color: '#2d75f5', weight: 4 }} />
          )}
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

const Section = ({ children }: { children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="font-display text-xl font-semibold text-ink-strong">Travel map</h2>
    {children}
  </section>
);
