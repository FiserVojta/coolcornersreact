import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { TripsList } from './TripsList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('TripsList', () => {
  it('renders trips from the mocked backend API', async () => {
    renderWithProviders(<TripsList />, {
      route: '/trips'
    });

    expect(await screen.findByText('Prague Dawn Walk')).toBeInTheDocument();
    expect(screen.getByText('Found 1 trips.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login to create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select categories/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /select tags/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows create action for authenticated users', async () => {
    renderWithProviders(<TripsList />, {
      route: '/trips',
      authValue: {
        authenticated: true
      }
    });

    expect(await screen.findByRole('link', { name: 'Create trip' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login to create' })).not.toBeInTheDocument();
  });

  it('sends minRating when a star is selected and clears it on second click', async () => {
    const minRatingValues: (string | null)[] = [];
    server.use(
      http.get('http://localhost:8080/api/public/trips', ({ request }) => {
        const url = new URL(request.url);
        minRatingValues.push(url.searchParams.get('minRating'));
        const minRating = Number(url.searchParams.get('minRating') ?? '0');
        const all = [
          {
            id: 401,
            name: 'Low Rated Trip',
            description: 'A so-so trip.',
            duration: 60,
            rating: 2.5,
            tags: [],
            images: []
          },
          {
            id: 402,
            name: 'High Rated Trip',
            description: 'A great trip.',
            duration: 90,
            rating: 4.6,
            tags: [],
            images: []
          }
        ];
        const filtered = minRating > 0 ? all.filter((trip) => trip.rating >= minRating) : all;
        return HttpResponse.json({ totalItems: filtered.length, data: filtered });
      })
    );

    renderWithProviders(<TripsList />, {
      route: '/trips'
    });

    expect(await screen.findByText('Low Rated Trip')).toBeInTheDocument();
    expect(screen.getByText('High Rated Trip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filter to rating 4 or higher' }));

    await waitFor(() => {
      expect(screen.queryByText('Low Rated Trip')).not.toBeInTheDocument();
      expect(screen.getByText('High Rated Trip')).toBeInTheDocument();
      expect(screen.getByText('Found 1 trips.')).toBeInTheDocument();
    });
    expect(minRatingValues).toContain('4');

    fireEvent.click(screen.getByRole('button', { name: 'Filter to rating 4 or higher' }));

    await waitFor(() => {
      expect(screen.getByText('Low Rated Trip')).toBeInTheDocument();
      expect(screen.getByText('High Rated Trip')).toBeInTheDocument();
      expect(screen.getByText('Found 2 trips.')).toBeInTheDocument();
    });
  });

  it('requests filtered trips when a category and tag are selected', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/categories', () =>
        HttpResponse.json([
          { id: 2, name: 'trip', main: true, title: 'Trip' },
          { id: 3, name: 'weekend', main: false, title: 'Weekend' }
        ])
      ),
      http.get('http://localhost:8080/api/public/tags', () =>
        HttpResponse.json([
          { id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' },
          { id: 12, name: 'food', title: 'Food', value: 'food', creator: 'test' }
        ])
      ),
      http.get('http://localhost:8080/api/public/trips', ({ request }) => {
        const url = new URL(request.url);
        const categories = url.searchParams.getAll('categories');
        const tags = url.searchParams.getAll('tags');
        const filtered = categories.includes('3') && tags.includes('12')
          ? [
              {
                id: 302,
                name: 'Brunch Escape',
                description: 'A weekend food-focused trip.',
                duration: 120,
                rating: 4.8,
                tags: [{ id: 12, name: 'food', title: 'Food', value: 'food', creator: 'test' }],
                images: ['https://example.com/trip-food.jpg']
              }
            ]
          : [
              {
                id: 301,
                name: 'Prague Dawn Walk',
                description: 'Early morning walk through the old city.',
                duration: 180,
                rating: 4.2,
                tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
                images: ['https://example.com/trip.jpg']
              },
              {
                id: 302,
                name: 'Brunch Escape',
                description: 'A weekend food-focused trip.',
                duration: 120,
                rating: 4.8,
                tags: [{ id: 12, name: 'food', title: 'Food', value: 'food', creator: 'test' }],
                images: ['https://example.com/trip-food.jpg']
              }
            ];

        return HttpResponse.json({
          totalItems: filtered.length,
          data: filtered
        });
      })
    );

    renderWithProviders(<TripsList />, {
      route: '/trips'
    });

    expect(await screen.findByText('Prague Dawn Walk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /select categories/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Weekend' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /select tags/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /select tags/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Food' }));

    await waitFor(() => {
      expect(screen.queryByText('Prague Dawn Walk')).not.toBeInTheDocument();
      expect(screen.getByText('Brunch Escape')).toBeInTheDocument();
      expect(screen.getByText('Found 1 trips.')).toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: 'Weekend' }).some((button) => button.getAttribute('aria-pressed') === 'true')
      ).toBe(true);
      expect(
        screen.getAllByRole('button', { name: 'Food' }).some((button) => button.getAttribute('aria-pressed') === 'true')
      ).toBe(true);
    });
  });
});
