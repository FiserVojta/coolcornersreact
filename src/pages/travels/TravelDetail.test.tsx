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
