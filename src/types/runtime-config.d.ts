export {};

declare global {
  interface AppRuntimeConfig {
    VITE_API_URL?: string;
    VITE_PORTAL_URL?: string;
    VITE_KEYCLOAK_URL?: string;
    VITE_KEYCLOAK_REALM?: string;
    VITE_KEYCLOAK_CLIENT_ID?: string;
    VITE_MAPY_API_KEY?: string;
    VITE_MAPY_TILES_URL?: string;
    VITE_MAPY_SEARCH_URL?: string;
    VITE_MAPY_ATTRIBUTION?: string;
  }

  interface Window {
    __APP_CONFIG__?: AppRuntimeConfig;
  }
}
