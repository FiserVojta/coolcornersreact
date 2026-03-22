import { screen } from '@testing-library/react';
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
