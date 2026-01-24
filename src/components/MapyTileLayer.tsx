import { TileLayer } from 'react-leaflet';
import { env } from '../config/env';

const getTileUrl = () => {
  if (!env.mapyTilesUrl) return '';
  const key = env.mapyApiKey;
  const placeholders = ['{apikey}', '{API_KEY}', '${API_KEY}'];
  const needsKey = placeholders.some((token) => env.mapyTilesUrl.includes(token));
  if (!key) {
    return needsKey ? env.mapyTilesUrl.replaceAll('{apikey}', '').replaceAll('{API_KEY}', '').replaceAll('${API_KEY}', '') : env.mapyTilesUrl;
  }
  return placeholders.reduce((url, token) => url.replaceAll(token, key), env.mapyTilesUrl);
};

export const MapyTileLayer = () => (
  <TileLayer url={getTileUrl()} attribution={env.mapyAttribution} />
);
