import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { SharedTravel } from './SharedTravel';
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

describe('SharedTravel', () => {
  it('renders a travel opened via a public share link without auth', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/travels/share/:token" element={<SharedTravel />} />
      </Routes>,
      {
        route: '/travels/share/share-token-501'
      }
    );

    expect(await screen.findByRole('heading', { name: 'Patagonia 2026' })).toBeInTheDocument();
    expect(screen.getByText(/Shared with you/)).toBeInTheDocument();
    // The share view must not expose owner-only controls.
    expect(screen.queryByRole('button', { name: 'Share link' })).not.toBeInTheDocument();
  });
});
