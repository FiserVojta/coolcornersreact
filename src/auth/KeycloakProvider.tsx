import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import type { KeycloakInstance, KeycloakTokenParsed } from 'keycloak-js';
import { env } from '../config/env';
import { setAuthTokenGetter } from '../api/client';

interface CustomToken extends KeycloakTokenParsed {
  preferred_username?: string;
  email?: string;
  name?: string;
}

interface AuthContextValue {
  keycloak: KeycloakInstance | null;
  authenticated: boolean;
  initializing: boolean;
  login: () => void;
  logout: () => void;
  token: string | undefined;
  refreshToken: (minValidity?: number) => Promise<void>;
  canEdit: (createdBy?: string | null) => boolean;
  username?: string;
  name?: string;
  email?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [keycloak] = useState(
    () =>
      new Keycloak({
        url: env.keycloakUrl,
        realm: env.keycloakRealm,
        clientId: env.keycloakClientId
      })
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        checkLoginIframe: false
      })
      .then((auth) => {
        setAuthenticated(auth);
        setAuthTokenGetter(() => keycloak.token ?? undefined);
      })
      .catch((err) => {
        console.error('[Keycloak] Failed to initialize', err);
      })
      .finally(() => setInitializing(false));
  }, [keycloak]);

  const refreshToken = async (minValidity = 30) => {
    if (!keycloak?.token) return;
    await keycloak.updateToken(minValidity);
  };

  const value: AuthContextValue = useMemo(() => {
    const tokenParsed = keycloak.tokenParsed as CustomToken | undefined;
    const canEdit = (createdBy?: string | null) => {
      if (!createdBy || !tokenParsed) return false;
      const email = tokenParsed.email || tokenParsed.preferred_username;
      return !!email && email === createdBy;
    };

    return {
      keycloak,
      authenticated,
      initializing,
      login: () => keycloak.login(),
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
      token: keycloak.token,
      refreshToken,
      canEdit,
      username: tokenParsed?.preferred_username,
      name: tokenParsed?.name,
      email: tokenParsed?.email
    };
  }, [authenticated, initializing, keycloak]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
