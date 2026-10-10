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
    expect(screen.getByRole('link', { name: 'Travels' })).toBeInTheDocument();
    // Places and Trips are hidden from the top menu.
    expect(screen.queryByRole('link', { name: 'Places' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Trips' })).not.toBeInTheDocument();
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

  it('hides the administration menu from non-admins', () => {
    renderWithProviders(<Header />, {
      route: '/',
      authValue: { authenticated: true, username: 'ada', isAdmin: false }
    });

    expect(screen.queryByRole('button', { name: 'Administration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('opens an administration menu with a Tags item for admins', () => {
    renderWithProviders(<Header />, {
      route: '/',
      authValue: { authenticated: true, username: 'ada', isAdmin: true }
    });

    const trigger = screen.getByRole('button', { name: 'Administration' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: 'Tags' })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Administration' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Tags' })).toHaveAttribute('href', '/admin/tags');
  });

  it('closes the administration menu on Escape, outside click and item click', () => {
    renderWithProviders(<Header />, {
      route: '/',
      authValue: { authenticated: true, username: 'ada', isAdmin: true }
    });
    const trigger = screen.getByRole('button', { name: 'Administration' });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tags' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marks the administration menu active on admin pages', () => {
    renderWithProviders(<Header />, {
      route: '/admin/tags',
      authValue: { authenticated: true, username: 'ada', isAdmin: true }
    });

    expect(screen.getByRole('button', { name: 'Administration' })).toHaveAttribute('data-active', 'true');
  });
});
