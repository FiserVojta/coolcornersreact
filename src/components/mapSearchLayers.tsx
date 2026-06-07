import { useEffect, useRef } from 'react';
import { CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { MapySearchResult } from '../api/mapy';

type LatLng = { lat: number; lng: number };

/**
 * Auto-fits the map view to every visible point whenever that set changes, so
 * all pins stay comfortably in frame. Refits only when the points actually
 * change (not on every pan/zoom), so it doesn't fight manual map navigation.
 * A single point recenters at `maxZoom`; an empty set leaves the view alone.
 */
export const FitBounds = ({ points, maxZoom = 15 }: { points: LatLng[]; maxZoom?: number }) => {
  const map = useMap();
  // Stringify the points so the effect depends on their values, not the array identity.
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  });

  useEffect(() => {
    const pts = pointsRef.current;
    if (!pts.length) return;
    if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], maxZoom);
      return;
    }
    map.fitBounds(
      pts.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [30, 30], maxZoom }
    );
  }, [key, map, maxZoom]);

  return null;
};

/**
 * Reports the map's current center whenever the user pans/zooms, so searches
 * can be biased toward whatever area is currently in view.
 */
export const MapViewTracker = ({ onChange }: { onChange: (center: { lat: number; lng: number }) => void }) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onChange({ lat: center.lat, lng: center.lng });
    },
  });
  return null;
};

/**
 * Renders Mapy search results as amber pins on the map. Clicking a pin adds
 * that result (via `onPick`); the name shows on hover.
 */
export const SearchResultMarkers = ({
  results,
  onPick,
}: {
  results: MapySearchResult[];
  onPick: (result: MapySearchResult) => void;
}) => (
  <>
    {results.map((result) => (
      <CircleMarker
        key={`search-${result.id}`}
        center={{ lat: result.lat, lng: result.lng }}
        radius={7}
        pathOptions={{ color: '#b45309', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.95 }}
        // Stop the click bubbling to the map, so picking a pin adds only this
        // place and not an extra freeform "Selected location" stop.
        bubblingMouseEvents={false}
        eventHandlers={{ click: () => onPick(result) }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          {result.name}
        </Tooltip>
      </CircleMarker>
    ))}
  </>
);
