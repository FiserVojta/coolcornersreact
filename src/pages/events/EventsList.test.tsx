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
    expect(screen.getByRole('searchbox', { name: 'Search events' })).toBeInTheDocument();
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

  describe('cotravel-style search options', () => {
    const captureEventRequests = () => {
      const requests: URLSearchParams[] = [];
      server.use(
        http.get('http://localhost:8080/api/public/events', ({ request }) => {
          requests.push(new URL(request.url).searchParams);
          return HttpResponse.json({ totalItems: 0, data: [] });
        }),
        http.get('http://localhost:8080/api/public/users', () =>
          HttpResponse.json({
            totalItems: 2,
            data: [
              { id: 1, keycloakId: 'kc-1', email: 'guide@example.com', username: 'guide', displayName: 'Guide One', createdAt: '2024-01-15T08:00:00Z' },
              { id: 2, keycloakId: 'kc-2', email: 'host@example.com', username: 'host', displayName: 'Host Two', createdAt: '2024-01-16T08:00:00Z' }
            ]
          })
        )
      );
      return requests;
    };

    it('shows date range and organizer filters next to search and categories', async () => {
      captureEventRequests();
      renderWithProviders(<EventsList />, { route: '/events' });

      expect(await screen.findByRole('searchbox', { name: 'Search events' })).toBeInTheDocument();
      expect(screen.getByLabelText('Starts from')).toHaveAttribute('type', 'date');
      expect(screen.getByLabelText('Starts until')).toHaveAttribute('type', 'date');
      expect(screen.getByRole('button', { name: 'Created By' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select categories/i })).toBeInTheDocument();
    });

    it('sends the search text to the backend and resets paging', async () => {
      const requests = captureEventRequests();
      renderWithProviders(<EventsList />, { route: '/events' });
      const searchbox = await screen.findByRole('searchbox', { name: 'Search events' });

      fireEvent.change(searchbox, { target: { value: '  jazz ' } });

      await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('jazz'));
      expect(requests.at(-1)?.get('page')).toBe('0');
    });

    it('sends the date range as local start and end of day and shows removable chips', async () => {
      const requests = captureEventRequests();
      renderWithProviders(<EventsList />, { route: '/events' });
      await screen.findByRole('searchbox', { name: 'Search events' });

      fireEvent.change(screen.getByLabelText('Starts from'), { target: { value: '2026-03-20' } });
      fireEvent.change(screen.getByLabelText('Starts until'), { target: { value: '2026-03-25' } });

      await waitFor(() => {
        expect(requests.at(-1)?.get('startsFrom')).toBe(new Date(2026, 2, 20, 0, 0, 0, 0).toISOString());
        expect(requests.at(-1)?.get('startsUntil')).toBe(new Date(2026, 2, 25, 23, 59, 59, 999).toISOString());
      });

      fireEvent.click(screen.getByRole('button', { name: /remove.*starts from/i }));

      await waitFor(() => expect(requests.at(-1)?.get('startsFrom')).toBeNull());
      expect(requests.at(-1)?.get('startsUntil')).not.toBeNull();
    });

    it('filters by organizer email', async () => {
      const requests = captureEventRequests();
      renderWithProviders(<EventsList />, { route: '/events' });
      await screen.findByRole('searchbox', { name: 'Search events' });

      fireEvent.click(screen.getByRole('button', { name: 'Created By' }));
      fireEvent.click(await screen.findByRole('option', { name: 'Host Two' }));

      await waitFor(() => expect(requests.at(-1)?.get('createdBy')).toBe('host@example.com'));
      expect(screen.getByRole('button', { name: /remove.*created by host two/i })).toBeInTheDocument();
    });

    it('clears every filter at once', async () => {
      const requests = captureEventRequests();
      renderWithProviders(<EventsList />, { route: '/events' });
      const searchbox = await screen.findByRole('searchbox', { name: 'Search events' });

      fireEvent.change(searchbox, { target: { value: 'jazz' } });
      fireEvent.change(screen.getByLabelText('Starts from'), { target: { value: '2026-03-20' } });
      fireEvent.click(screen.getByRole('button', { name: 'Created By' }));
      fireEvent.click(await screen.findByRole('option', { name: 'Host Two' }));
      await waitFor(() => expect(requests.at(-1)?.get('createdBy')).toBe('host@example.com'));

      fireEvent.click(screen.getAllByRole('button', { name: /clear/i })[0]);

      await waitFor(() => {
        const last = requests.at(-1);
        expect(last?.get('search')).toBeNull();
        expect(last?.get('startsFrom')).toBeNull();
        expect(last?.get('createdBy')).toBeNull();
      });
      expect(searchbox).toHaveValue('');
    });
  });
});
