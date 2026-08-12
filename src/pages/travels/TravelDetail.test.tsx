import type { ReactNode } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { TravelDetail } from './TravelDetail';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CircleMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Polyline: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
  useMapEvents: () => null
}));

vi.mock('leaflet', () => ({ default: { latLngBounds: () => ({}) } }));

describe('TravelDetail', () => {
  it('renders the travel and lets the owner copy a share link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      {
        route: '/travels/501',
        authValue: { authenticated: true, email: 'me@example.com' }
      }
    );

    expect(await screen.findByRole('heading', { name: 'Patagonia 2026' })).toBeInTheDocument();

    const shareButton = await screen.findByRole('button', { name: 'Share link' });
    fireEvent.click(shareButton);

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/travels/share/share-token-501'));
    expect(await screen.findByText('Share link copied to clipboard!')).toBeInTheDocument();
  });

  it('lets the viewer rate the travel', async () => {
    server.use(
      http.patch('http://localhost:8080/api/travels/:id/rate', async ({ request }) => {
        const payload = (await request.json()) as { rating: number };
        return HttpResponse.json({
          id: 501,
          title: 'Patagonia 2026',
          visibility: 'PRIVATE',
          shareToken: 'share-token-501',
          owner: { id: 99, displayName: 'Test Me' },
          photos: [],
          rating: payload.rating,
          myRating: payload.rating
        });
      })
    );

    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      {
        route: '/travels/501',
        authValue: { authenticated: true, email: 'me@example.com' }
      }
    );

    expect(await screen.findByText('Rate this travel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rate 4 out of 5' }));

    expect(await screen.findByText('You rated this travel 4/5.')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
  });

  it('renders a public travel for anonymous visitors without owner or rating actions', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/:id', () =>
        HttpResponse.json({
          id: 501,
          title: 'Patagonia 2026',
          visibility: 'PUBLIC',
          shareToken: null,
          owner: { id: 99, displayName: 'Test Me' },
          photos: [],
          rating: 4.5,
          myRating: null
        })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      {
        route: '/travels/501',
        authValue: { authenticated: false }
      }
    );

    expect(await screen.findByRole('heading', { name: 'Patagonia 2026' })).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('Log in to rate this travel.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rate 4 out of 5' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('offers to add your own version of the trip and shows how often it was done', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/:id', () =>
        HttpResponse.json({
          id: 501,
          title: 'Patagonia 2026',
          visibility: 'PUBLIC',
          shareToken: null,
          owner: { id: 99, displayName: 'Test Me' },
          photos: [],
          timesDone: 3,
          otherVersions: [
            {
              id: 502,
              title: 'Patagonia 2026',
              startDate: '2026-03-01',
              endDate: '2026-03-10',
              photoCount: 12,
              owner: { id: 7, displayName: 'Ada Lovelace' }
            }
          ]
        })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      {
        route: '/travels/501',
        authValue: { authenticated: true, email: 'me@example.com' }
      }
    );

    const versionLink = await screen.findByRole('link', { name: 'Make a copy' });
    expect(versionLink).toHaveAttribute('href', '/travels/create?basedOn=501');

    expect(screen.getByText('Done 3 times')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ada Lovelace/ })).toHaveAttribute('href', '/travels/502');
    expect(screen.getByText(/12 photos/)).toBeInTheDocument();
  });

  it('records the trip as done without any photos', async () => {
    let payload: Record<string, unknown> | null = null;
    server.use(
      http.get('http://localhost:8080/api/public/travels/:id', () =>
        HttpResponse.json({
          id: 501,
          title: 'Patagonia 2026',
          location: 'Argentina',
          visibility: 'PUBLIC',
          shareToken: null,
          owner: { id: 99, displayName: 'Test Me' },
          photos: [],
          places: [{ id: 3, name: 'El Chaltén', latitude: -49.33, longitude: -72.88 }],
          category: { id: 8, name: 'Hiking' },
          tags: [{ id: 4, name: 'mountains' }],
          timesDone: 1,
          otherVersions: []
        })
      ),
      http.post('http://localhost:8080/api/travels', async ({ request }) => {
        payload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 777,
          title: 'Patagonia 2026',
          visibility: 'PRIVATE',
          shareToken: 'share-token-777',
          photos: []
        });
      })
    );

    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      {
        route: '/travels/501',
        authValue: { authenticated: true, email: 'me@example.com' }
      }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as done' }));

    expect(await screen.findByText(/Noted — this trip is now on your travels/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open it to add photos' })).toHaveAttribute(
      'href',
      '/travels/777'
    );
    expect(payload).toMatchObject({
      title: 'Patagonia 2026',
      location: 'Argentina',
      visibility: 'PRIVATE',
      categoryId: 8,
      tags: [4],
      originTravelId: 501,
      photos: []
    });
    expect(payload).toMatchObject({
      places: [{ name: 'El Chaltén', latitude: -49.33, longitude: -72.88 }]
    });
  });

  it('hides the version prompt from anonymous visitors', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/travels/:id', () =>
        HttpResponse.json({
          id: 501,
          title: 'Patagonia 2026',
          visibility: 'PUBLIC',
          shareToken: null,
          owner: { id: 99, displayName: 'Test Me' },
          photos: [],
          timesDone: 1,
          otherVersions: []
        })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      { route: '/travels/501', authValue: { authenticated: false } }
    );

    expect(await screen.findByRole('heading', { name: 'Patagonia 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Make a copy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as done' })).not.toBeInTheDocument();
    // A trip nobody has repeated yet doesn't need the "who else did this" section at all.
    expect(screen.queryByText('Who else did this trip')).not.toBeInTheDocument();
  });

  it('shows owner edit and delete actions', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/travels/:id" element={<TravelDetail />} />
      </Routes>,
      {
        route: '/travels/501',
        authValue: { authenticated: true, email: 'me@example.com' }
      }
    );

    expect(await screen.findByRole('link', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
