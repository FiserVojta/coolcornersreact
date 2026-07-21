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

  it('filters travels by category and tags', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/accessible', () =>
        HttpResponse.json([
          {
            id: 501,
            title: 'Patagonia 2026',
            visibility: 'PRIVATE',
            photoCount: 0,
            owner: { id: 99, displayName: 'Test Me' },
            category: { id: 1, name: 'place', main: true, title: 'Place' },
            tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }]
          },
          {
            id: 502,
            title: 'Iceland Ring Road',
            visibility: 'PUBLIC',
            photoCount: 0,
            owner: { id: 1, displayName: 'Ada Lovelace' },
            category: { id: 2, name: 'trip', main: true, title: 'Trip' },
            tags: []
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

    fireEvent.click(screen.getByText('Select categories'));
    fireEvent.click(await screen.findByRole('button', { name: 'Place' }));

    expect(screen.getByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.queryByText('Iceland Ring Road')).not.toBeInTheDocument();

    // Deselect the category, then narrow by tag instead.
    fireEvent.click(screen.getByRole('button', { name: 'Place' }));
    expect(screen.getByText('Iceland Ring Road')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Select tags'));
    fireEvent.click(await screen.findByRole('button', { name: 'Quiet' }));

    expect(screen.getByText('Patagonia 2026')).toBeInTheDocument();
    expect(screen.queryByText('Iceland Ring Road')).not.toBeInTheDocument();
  });

  it('orders travels by rating and by travel date', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/accessible', () =>
        HttpResponse.json([
          {
            id: 501,
            title: 'Patagonia 2026',
            startDate: '2026-01-10',
            visibility: 'PRIVATE',
            photoCount: 0,
            owner: { id: 99, displayName: 'Test Me' },
            rating: 3.0
          },
          {
            id: 502,
            title: 'Iceland Ring Road',
            startDate: '2025-06-01',
            visibility: 'PUBLIC',
            photoCount: 0,
            owner: { id: 1, displayName: 'Ada Lovelace' },
            rating: 4.5
          },
          {
            id: 503,
            title: 'Sahara Crossing',
            startDate: '2026-03-05',
            visibility: 'PUBLIC',
            photoCount: 0,
            owner: { id: 1, displayName: 'Ada Lovelace' },
            rating: null
          }
        ])
      )
    );

    renderWithProviders(<MyTravelsList />, {
      route: '/travels',
      authValue: { authenticated: true, email: 'me@example.com' }
    });

    expect(await screen.findByText('Patagonia 2026')).toBeInTheDocument();

    const titles = () => screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);

    // Default keeps the API order.
    expect(titles()).toEqual(['Patagonia 2026', 'Iceland Ring Road', 'Sahara Crossing']);

    fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
    fireEvent.click(screen.getByRole('option', { name: 'Highest rated' }));
    // Unrated travels go last.
    expect(titles()).toEqual(['Iceland Ring Road', 'Patagonia 2026', 'Sahara Crossing']);

    fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
    fireEvent.click(screen.getByRole('option', { name: 'Travel date — newest' }));
    expect(titles()).toEqual(['Sahara Crossing', 'Patagonia 2026', 'Iceland Ring Road']);

    fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
    fireEvent.click(screen.getByRole('option', { name: 'Travel date — oldest' }));
    expect(titles()).toEqual(['Iceland Ring Road', 'Patagonia 2026', 'Sahara Crossing']);
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
