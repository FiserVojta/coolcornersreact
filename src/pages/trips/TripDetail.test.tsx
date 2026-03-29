import type { ReactNode } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { TripDetail } from './TripDetail';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CircleMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Polyline: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

vi.mock('leaflet', () => ({
  default: {
    latLngBounds: () => ({})
  }
}));

describe('TripDetail', () => {
  it('lets an authenticated user mark the trip as done', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/trips/:id" element={<TripDetail />} />
      </Routes>,
      {
        route: '/trips/301',
        authValue: {
          authenticated: true,
          email: 'ada@example.com',
          username: 'ada',
          name: 'Ada Lovelace'
        }
      }
    );

    expect(await screen.findByRole('button', { name: 'Mark as done' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as done' }));

    expect(await screen.findByRole('button', { name: 'Marked as done' })).toBeDisabled();
    expect(screen.getByText('1 traveler has marked this trip as done.')).toBeInTheDocument();
  });

  it('shows a login action when the user is not authenticated', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/trips/:id" element={<TripDetail />} />
      </Routes>,
      {
        route: '/trips/301'
      }
    );

    expect(await screen.findByText('Login to mark this trip as done.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Login' }).length).toBeGreaterThan(0);
  });

  it('renders already completed state when the current user previously marked the trip as done', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/trips/:id', () =>
        HttpResponse.json({
          id: 301,
          name: 'Prague Dawn Walk',
          description: 'Early morning walk through the old city.',
          duration: 180,
          rating: 4.2,
          category: { id: 2, name: 'trip', main: true, title: 'Trip' },
          creator: 'Ada',
          createdBy: 'ada@example.com',
          tags: [],
          places: [],
          googlePlaces: [],
          comments: [],
          files: [],
          completedByUsers: [
            {
              id: 1,
              email: 'ada@example.com',
              name: 'Ada Lovelace',
              displayName: 'Ada Lovelace',
              rating: null
            }
          ]
        })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/trips/:id" element={<TripDetail />} />
      </Routes>,
      {
        route: '/trips/301',
        authValue: {
          authenticated: true,
          email: 'ada@example.com',
          username: 'ada',
          name: 'Ada Lovelace'
        }
      }
    );

    expect(await screen.findByRole('button', { name: 'Marked as done' })).toBeDisabled();
    expect(screen.getByText('1 traveler has marked this trip as done.')).toBeInTheDocument();
  });
});
