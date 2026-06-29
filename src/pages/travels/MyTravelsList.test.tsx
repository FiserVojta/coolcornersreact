import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { MyTravelsList } from './MyTravelsList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('MyTravelsList', () => {
  it('renders the current user travels from the mocked API', async () => {
    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New travel' })).toBeInTheDocument();
  });

  it('shows an empty state when the user has no travels', async () => {
    server.use(http.get('http://localhost:8080/api/travels/my', () => HttpResponse.json([])));

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText("You haven't added any travels yet.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first travel' })).toBeInTheDocument();
  });
});
