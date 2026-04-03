export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  portalUrl: import.meta.env.VITE_PORTAL_URL ?? 'https://coolcorners.org',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'https://coolcorners.org/keycloak',
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'cool-corners',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'angular-client',
  mapyApiKey: import.meta.env.VITE_MAPY_API_KEY,
  mapyTilesUrl:
    import.meta.env.VITE_MAPY_TILES_URL ?? 'https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey={apikey}',
  mapySearchUrl: import.meta.env.VITE_MAPY_SEARCH_URL ?? 'https://api.mapy.com/v1/geocode',
  mapyAttribution: import.meta.env.VITE_MAPY_ATTRIBUTION ?? '© Seznam.cz, a.s.'
};
