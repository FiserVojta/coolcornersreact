import { createContext, useContext } from 'react';
import type { KeycloakInstance } from 'keycloak-js';

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
