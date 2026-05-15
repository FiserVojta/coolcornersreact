import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { UserDetail } from './UserDetail';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

describe('UserDetail', () => {
  it('renders profile and related sections from mocked backend APIs', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>,
      {
        route: '/users/1'
      }
    );

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Hidden Courtyard')).toBeInTheDocument();
    expect(screen.getByText('Prague Dawn Walk')).toBeInTheDocument();
    expect(screen.getByText('Weekend riverside wander')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Signed-up CoTravels' })).toBeInTheDocument();
  });

  it('renders signed-up cotravels from the user detail payload without a separate wanders request', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/users/:id/wanders', () =>
        HttpResponse.json({ message: 'unused endpoint' }, { status: 500 })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>,
      {
        route: '/users/1'
      }
    );

    expect(await screen.findByText('Weekend riverside wander')).toBeInTheDocument();
    expect(screen.getByText('Signed-up CoTravels')).toBeInTheDocument();
  });

  it('shows self badge for the current user', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me', () =>
        HttpResponse.json({
          id: 1,
          keycloakId: 'kc-1',
          email: 'ada@example.com',
          username: 'ada',
          displayName: 'Ada Lovelace',
          createdAt: '2024-01-15T08:00:00Z',
          followers: [],
          following: []
        })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>,
      {
        route: '/users/1',
        authValue: {
          authenticated: true,
          username: 'ada'
        }
      }
    );

    expect(await screen.findByText('This is you')).toBeInTheDocument();
  });

  it('shows follow actions for another authenticated user', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>,
      {
        route: '/users/1',
        authValue: {
          authenticated: true,
          username: 'grace'
        }
      }
    );

    expect(await screen.findByRole('button', { name: 'Follow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument();
    expect(screen.queryByText('This is you')).not.toBeInTheDocument();
  });

  it('renders an error state when the user API fails', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/users/:id', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 })
      )
    );

    renderWithProviders(
      <Routes>
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>,
      {
        route: '/users/1'
      }
    );

    expect(await screen.findByText('Unable to load this user right now.')).toBeInTheDocument();
  });
});
