import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { MyTravelsList } from './MyTravelsList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('MyTravelsList', () => {
  it('renders the accessible travels from the mocked API', async () => {
    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New travel' })).toBeInTheDocument();
  });

  it('shows an empty state when the user has no accessible travels', async () => {
    server.use(http.get('http://localhost:8080/api/public/travels/accessible', () => HttpResponse.json([])));

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText("You haven't added any travels yet.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first travel' })).toBeInTheDocument();
  });

  it('renders public travels for anonymous visitors without create actions', async () => {
    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: false }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New travel' })).not.toBeInTheDocument();
  });

  it('filters travels by the search query and can clear it', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/accessible', () =>
        HttpResponse.json([
          {
            id: 501,
            title: 'Patagonia 2026',
            location: 'Argentina',
            visibility: 'PRIVATE',
            photoCount: 0,
            owner: { id: 99, displayName: 'Test Me' }
          },
          {
            id: 502,
            title: 'Iceland Ring Road',
            location: 'Iceland',
            visibility: 'PUBLIC',
            photoCount: 0,
            owner: { id: 1, displayName: 'Ada Lovelace' }
          }
        ])
      )
    );

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox', { name: 'Search travels' });
    fireEvent.change(searchInput, { target: { value: 'iceland' } });

    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();
    expect(screen.queryByText('Patagonia 2026')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'nowhere' } });
    expect(screen.getByText('No travels match these filters.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();
  });

  it('filters travels by minimum rating', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/accessible', () =>
        HttpResponse.json([
          {
            id: 501,
            title: 'Patagonia 2026',
            visibility: 'PRIVATE',
            photoCount: 0,
            owner: { id: 99, displayName: 'Test Me' },
            rating: 4.5
          },
          {
            id: 502,
            title: 'Iceland Ring Road',
            visibility: 'PUBLIC',
            photoCount: 0,
            owner: { id: 1, displayName: 'Ada Lovelace' },
            rating: 2.0
          }
        ])
      )
    );

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filter to rating 4 or higher' }));

    expect(screen.getByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.queryByText('Iceland Ring Road')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filter to rating 5 or higher' }));
    expect(screen.getByText('No travels match these filters.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();
  });

  it('filters travels by author', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/accessible', () =>
        HttpResponse.json([
          {
            id: 501,
            title: 'Patagonia 2026',
            visibility: 'PRIVATE',
            photoCount: 0,
            owner: { id: 99, displayName: 'Test Me' }
          },
          {
            id: 502,
            title: 'Iceland Ring Road',
            visibility: 'PUBLIC',
            photoCount: 0,
            owner: { id: 1, displayName: 'Ada Lovelace' }
          }
        ])
      )
    );

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Select authors'));
    fireEvent.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();
    expect(screen.queryByText('Patagonia 2026')).not.toBeInTheDocument();
    expect(screen.getByText('1 author selected')).toBeInTheDocument();

    // Deselecting the author brings every travel back.
    fireEvent.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    expect(screen.getByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();
  });

  it('shows an anonymous empty state without create actions', async () => {
    server.use(http.get('http://localhost:8080/api/public/travels/accessible', () => HttpResponse.json([])));

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: false }
    });

    expect(await screen.findByText('There are no public travels to show yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create your first travel' })).not.toBeInTheDocument();
  });
});
