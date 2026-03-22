import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactElement } from 'react';

interface Props {
  children: ReactElement;
}

export const ProtectedRoute = ({ children }: Props) => {
  const { authenticated, initializing, login } = useAuth();

  if (initializing) return children; // Let child handle its own loading state
  if (!authenticated) {
    login();
    return <Navigate to="/" replace />;
  }

  return children;
};
