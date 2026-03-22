import type { ReactElement, PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '../auth/AuthContext';

const defaultAuthValue: AuthContextValue = {
  keycloak: null,
  authenticated: false,
  initializing: false,
  login: () => undefined,
  logout: () => undefined,
  token: undefined,
  refreshToken: async () => undefined,
  canEdit: () => false,
  username: undefined,
  name: undefined,
  email: undefined
};

type Options = {
  authValue?: Partial<AuthContextValue>;
  route?: string;
};

export const renderWithProviders = (ui: ReactElement, options: Options = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  const authValue = { ...defaultAuthValue, ...options.authValue };

  const Wrapper = ({ children }: PropsWithChildren) => (
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[options.route ?? '/']}>{children}</MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  );

  return render(ui, { wrapper: Wrapper });
};
