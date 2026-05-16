const runtime: AppRuntimeConfig =
  (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

const pick = (key: keyof AppRuntimeConfig, fallback?: string) => {
  const runtimeValue = runtime[key];
  if (runtimeValue !== undefined && runtimeValue !== '' && !runtimeValue.startsWith('__')) {
    return runtimeValue;
  }
  const buildValue = import.meta.env[key];
  if (buildValue !== undefined && buildValue !== '') return buildValue;
  return fallback;
};

export const env = {
  apiUrl: pick('VITE_API_URL', 'http://localhost:8080/api')!,
  portalUrl: pick('VITE_PORTAL_URL', 'https://coolcorners.org')!,
  keycloakUrl: pick('VITE_KEYCLOAK_URL', 'https://coolcorners.org/keycloak')!,
  keycloakRealm: pick('VITE_KEYCLOAK_REALM', 'cool-corners')!,
  keycloakClientId: pick('VITE_KEYCLOAK_CLIENT_ID', 'angular-client')!,
  mapyApiKey: pick('VITE_MAPY_API_KEY'),
  mapyTilesUrl: pick(
    'VITE_MAPY_TILES_URL',
    'https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey={apikey}'
  )!,
  mapySearchUrl: pick('VITE_MAPY_SEARCH_URL', 'https://api.mapy.com/v1/geocode')!,
  mapyAttribution: pick('VITE_MAPY_ATTRIBUTION', '© Seznam.cz, a.s.')!
};
