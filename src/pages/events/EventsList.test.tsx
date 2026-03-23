import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { EventsList } from './EventsList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('EventsList', () => {
  it('renders the same filter layout pattern as trips', async () => {
    renderWithProviders(<EventsList />, {
      authValue: {
        authenticated: true
      },
      route: '/events'
    });

    expect(await screen.findByText('Lantern Walk')).toBeInTheDocument();
    expect(screen.getByText('Riverside Tasting')).toBeInTheDocument();
    expect(screen.getByText('Found 2 events.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create event' })).toBeInTheDocument();
    expect(screen.getByText('Select categories')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.getByText('Page size')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select categories/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('requests filtered events when a category is selected', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/categories', () =>
        HttpResponse.json([
          { id: 21, name: 'event', main: true, title: 'Event' },
          { id: 22, name: 'food', main: false, title: 'Food' }
        ])
      ),
      http.get('http://localhost:8080/api/public/events', ({ request }) => {
        const url = new URL(request.url);
        const categories = url.searchParams.getAll('categories');
        const filtered = categories.includes('22')
          ? [
              {
                id: 2,
                name: 'Riverside Tasting',
                description: 'Small-group tasting menu by the river.',
                venue: 'River Dock',
                startTime: '2099-06-25T19:00:00Z',
                createdAt: '2099-05-02T09:00:00Z',
                category: { id: 22, name: 'food', main: false, title: 'Food' },
                capacity: 12,
                price: 60,
                duration: 120,
                createdBy: 'organizer@example.com'
              }
            ]
          : [
              {
                id: 1,
                name: 'Lantern Walk',
                description: 'Evening city walk with local guides.',
                venue: 'Old Town Square',
                startTime: '2099-06-18T18:00:00Z',
                createdAt: '2099-05-01T09:00:00Z',
                category: { id: 21, name: 'event', main: true, title: 'Event' },
                capacity: 20,
                price: 0,
                duration: 90,
                createdBy: 'organizer@example.com'
              },
              {
                id: 2,
                name: 'Riverside Tasting',
                description: 'Small-group tasting menu by the river.',
                venue: 'River Dock',
                startTime: '2099-06-25T19:00:00Z',
                createdAt: '2099-05-02T09:00:00Z',
                category: { id: 22, name: 'food', main: false, title: 'Food' },
                capacity: 12,
                price: 60,
                duration: 120,
                createdBy: 'organizer@example.com'
              }
            ];

        return HttpResponse.json({
          totalItems: filtered.length,
          data: filtered
        });
      })
    );

    renderWithProviders(<EventsList />, {
      route: '/events'
    });

    expect(await screen.findByText('Lantern Walk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /select categories/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Food' }));

    await waitFor(() => {
      expect(screen.queryByText('Lantern Walk')).not.toBeInTheDocument();
      expect(screen.getByText('Riverside Tasting')).toBeInTheDocument();
      expect(screen.getByText('Found 1 events.')).toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: 'Food' }).some((button) => button.getAttribute('aria-pressed') === 'true')
      ).toBe(true);
    });
  });
});
