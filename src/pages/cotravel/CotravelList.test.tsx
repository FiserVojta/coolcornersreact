import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { CotravelList } from './CotravelList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('CotravelList', () => {
  it('renders dropdown filter triggers for categories and tags', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/categories', () =>
        HttpResponse.json([
          { id: 31, name: 'cotravel', main: true, title: 'CoTravel' },
          { id: 32, name: 'hiking', main: false, title: 'Hiking' }
        ])
      ),
      http.get('http://localhost:8080/api/public/users', () =>
        HttpResponse.json({
          totalItems: 2,
          data: [
            { id: 1, keycloakId: 'kc-1', email: 'guide@example.com', username: 'guide', firstName: 'Guide', lastName: 'One', displayName: 'Guide One', createdAt: '2024-01-15T08:00:00Z' },
            { id: 2, keycloakId: 'kc-2', email: 'host@example.com', username: 'host', firstName: 'Host', lastName: 'Two', displayName: 'Host Two', createdAt: '2024-01-16T08:00:00Z' }
          ]
        })
      ),
      http.get('http://localhost:8080/api/public/tags', () =>
        HttpResponse.json([
          { id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' },
          { id: 12, name: 'group', title: 'Group', value: 'group', creator: 'test' }
        ])
      ),
      http.get('http://localhost:8080/api/public/wanders', () =>
        HttpResponse.json({
          totalItems: 1,
          data: [
            {
              id: 401,
              createdBy: { id: 1, email: 'guide@example.com', username: 'guide', firstName: 'Guide', lastName: 'One', displayName: 'Guide One' },
              description: 'Weekend riverside wander',
              capacity: 8,
              startTime: '2099-06-20T09:00:00Z',
              wanderers: [],
              tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
              category: { id: 31, name: 'cotravel', main: true, title: 'CoTravel' }
            }
          ]
        })
      )
    );

    renderWithProviders(<CotravelList />, { route: '/cotravel' });

    expect((await screen.findAllByText('Weekend riverside wander')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /select categories/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /select tags/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Created By')).toBeInTheDocument();
  });

  it('applies highlighted category and tag selections from overlay dropdowns', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/categories', () =>
        HttpResponse.json([
          { id: 31, name: 'cotravel', main: true, title: 'CoTravel' },
          { id: 32, name: 'hiking', main: false, title: 'Hiking' }
        ])
      ),
      http.get('http://localhost:8080/api/public/users', () =>
        HttpResponse.json({
          totalItems: 2,
          data: [
            { id: 1, keycloakId: 'kc-1', email: 'guide@example.com', username: 'guide', firstName: 'Guide', lastName: 'One', displayName: 'Guide One', createdAt: '2024-01-15T08:00:00Z' },
            { id: 2, keycloakId: 'kc-2', email: 'host@example.com', username: 'host', firstName: 'Host', lastName: 'Two', displayName: 'Host Two', createdAt: '2024-01-16T08:00:00Z' }
          ]
        })
      ),
      http.get('http://localhost:8080/api/public/tags', () =>
        HttpResponse.json([
          { id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' },
          { id: 12, name: 'group', title: 'Group', value: 'group', creator: 'test' }
        ])
      ),
      http.get('http://localhost:8080/api/public/wanders', ({ request }) => {
        const url = new URL(request.url);
        const categories = url.searchParams.getAll('categories');
        const tags = url.searchParams.getAll('tags');
        const createdBy = url.searchParams.get('createdBy');
        const filtered = categories.includes('32') && tags.includes('12') && createdBy === '2'
          ? [
              {
                id: 402,
                createdBy: { id: 2, email: 'host@example.com', username: 'host', firstName: 'Host', lastName: 'Two', displayName: 'Host Two' },
                description: 'Mountain hiking weekend',
                capacity: 6,
                startTime: '2099-07-10T08:00:00Z',
                wanderers: [],
                tags: [{ id: 12, name: 'group', title: 'Group', value: 'group', creator: 'test' }],
                category: { id: 32, name: 'hiking', main: false, title: 'Hiking' }
              }
            ]
          : [
              {
                id: 401,
                createdBy: { id: 1, email: 'guide@example.com', username: 'guide', firstName: 'Guide', lastName: 'One', displayName: 'Guide One' },
                description: 'Weekend riverside wander',
                capacity: 8,
                startTime: '2099-06-20T09:00:00Z',
                wanderers: [],
                tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
                category: { id: 31, name: 'cotravel', main: true, title: 'CoTravel' }
              },
              {
                id: 402,
                createdBy: { id: 2, email: 'host@example.com', username: 'host', firstName: 'Host', lastName: 'Two', displayName: 'Host Two' },
                description: 'Mountain hiking weekend',
                capacity: 6,
                startTime: '2099-07-10T08:00:00Z',
                wanderers: [],
                tags: [{ id: 12, name: 'group', title: 'Group', value: 'group', creator: 'test' }],
                category: { id: 32, name: 'hiking', main: false, title: 'Hiking' }
              }
            ];

        return HttpResponse.json({
          totalItems: filtered.length,
          data: filtered
        });
      })
    );

    renderWithProviders(<CotravelList />, { route: '/cotravel' });

    expect((await screen.findAllByText('Weekend riverside wander')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /select categories/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Hiking' }));
    fireEvent.click(screen.getByRole('button', { name: /select tags/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Group' }));
    fireEvent.change(screen.getByLabelText('Created By'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(screen.queryAllByText('Weekend riverside wander')).toHaveLength(0);
      expect(screen.getAllByText('Mountain hiking weekend').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /hiking/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Created By')).toHaveValue('2');
    });
  });
});
