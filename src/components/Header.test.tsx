import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';
import { renderWithProviders } from '../test/renderWithProviders';

describe('Header', () => {
  it('shows login action when unauthenticated', () => {
    renderWithProviders(<Header />, {
      route: '/'
    });

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Places' })).toBeInTheDocument();
  });

  it('shows greeting and logout action when authenticated', () => {
    const logout = vi.fn();

    renderWithProviders(<Header />, {
      route: '/',
      authValue: {
        authenticated: true,
        username: 'ada',
        logout
      }
    });

    expect(screen.getByText('Hi, ada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
