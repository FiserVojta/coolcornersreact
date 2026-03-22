import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { PlacesList } from './PlacesList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('PlacesList', () => {
  it('renders places from the mocked backend API', async () => {
    renderWithProviders(<PlacesList />, {
      authValue: {
        authenticated: true
      },
      route: '/places'
    });

    expect(await screen.findByText('Hidden Courtyard')).toBeInTheDocument();
    expect(screen.getByText('Fetched from 1 entries.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create place' })).toBeInTheDocument();
  });

  it('shows login action when the user is not authenticated', async () => {
    renderWithProviders(<PlacesList />, {
      authValue: {
        authenticated: false
      },
      route: '/places'
    });

    expect(await screen.findByText('Hidden Courtyard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login to create' })).toBeInTheDocument();
  });

  it('renders an error state when the places API fails', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/places', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
    );

    renderWithProviders(<PlacesList />, {
      route: '/places'
    });

    expect(await screen.findByText('Unable to load places right now.')).toBeInTheDocument();
  });
});
