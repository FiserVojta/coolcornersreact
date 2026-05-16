#!/bin/sh
set -eu

# Emit /runtime-config.js read by index.html. Any unset VITE_* var becomes
# an empty string so env.ts falls back to build-time defaults.
CONFIG_FILE="/usr/share/nginx/html/runtime-config.js"

cat > "$CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-}",
  VITE_PORTAL_URL: "${VITE_PORTAL_URL:-}",
  VITE_KEYCLOAK_URL: "${VITE_KEYCLOAK_URL:-}",
  VITE_KEYCLOAK_REALM: "${VITE_KEYCLOAK_REALM:-}",
  VITE_KEYCLOAK_CLIENT_ID: "${VITE_KEYCLOAK_CLIENT_ID:-}",
  VITE_MAPY_API_KEY: "${VITE_MAPY_API_KEY:-}",
  VITE_MAPY_TILES_URL: "${VITE_MAPY_TILES_URL:-}",
  VITE_MAPY_SEARCH_URL: "${VITE_MAPY_SEARCH_URL:-}",
  VITE_MAPY_ATTRIBUTION: "${VITE_MAPY_ATTRIBUTION:-}"
};
EOF

exec "$@"
