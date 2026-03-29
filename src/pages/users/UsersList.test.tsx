import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { UsersList } from './UsersList';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('UsersList', () => {
  it('renders users from the mocked backend API', async () => {
    renderWithProviders(<UsersList />, {
      route: '/users'
    });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Found 1 users.')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('filters users by search term and rating', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/users', ({ request }) => {
        const url = new URL(request.url);
        const search = (url.searchParams.get('search') ?? '').toLowerCase();
        const users = [
          {
            id: 1,
            keycloakId: 'kc-1',
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            displayName: 'Ada Lovelace',
            rating: 5,
            createdAt: '2024-01-15T08:00:00Z',
            followers: [],
            following: []
          },
          {
            id: 2,
            keycloakId: 'kc-2',
            email: 'grace@example.com',
            firstName: 'Grace',
            lastName: 'Hopper',
            displayName: 'Grace Hopper',
            rating: 3,
            createdAt: '2024-01-16T08:00:00Z',
            followers: [],
            following: []
          }
        ].filter((user) => !search || user.displayName.toLowerCase().includes(search));

        return HttpResponse.json({
          totalItems: users.length,
          data: users
        });
      })
    );

    renderWithProviders(<UsersList />, {
      route: '/users'
    });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search by name...'), {
      target: { value: 'Ada' }
    });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search by name...'), {
      target: { value: '' }
    });
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by rating'), {
      target: { value: '4' }
    });

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();
    expect(screen.getByText('Found 1 users.')).toBeInTheDocument();
  });

  it('renders an error state when the users API fails', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/users', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
    );

    renderWithProviders(<UsersList />, {
      route: '/users'
    });

    expect(await screen.findByText('Unable to load users right now.')).toBeInTheDocument();
  });
});
