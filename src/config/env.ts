export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  portalUrl: import.meta.env.VITE_PORTAL_URL ?? 'https://coolcorners.org',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'https://coolcorners.org/keycloak',
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'cool-corners',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'angular-client',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? 'AIzaSyAPn_eiTUF0gJNM2NZE9SEVCvZhIqLJskA'
};
