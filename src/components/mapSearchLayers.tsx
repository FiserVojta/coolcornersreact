import { CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import type { MapySearchResult } from '../api/mapy';

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
        eventHandlers={{
          click: (event) => {
            event.originalEvent.stopPropagation();
            onPick(result);
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          {result.name}
        </Tooltip>
      </CircleMarker>
    ))}
  </>
);
