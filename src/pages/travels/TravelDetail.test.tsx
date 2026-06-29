import type { ReactNode } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { TravelDetail } from './TravelDetail';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CircleMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Polyline: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({}),
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
