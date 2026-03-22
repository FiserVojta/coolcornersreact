import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { EventDetail } from './EventDetail';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('EventDetail', () => {
  it('renders event details from the mocked backend API', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>,
      {
        route: '/events/1'
      }
    );

    expect(await screen.findByText('Lantern Walk')).toBeInTheDocument();
    expect(screen.getAllByText('Old Town Square')).toHaveLength(2);
    expect(screen.getByText('Capacity 20')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Evening city walk with local guides.')).toBeInTheDocument();
  });

  it('shows edit actions when the current user can edit the event', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>,
      {
        route: '/events/1',
        authValue: {
          authenticated: true,
          canEdit: () => true
        }
      }
    );

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides edit actions when the current user cannot edit the event', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>,
      {
        route: '/events/1',
        authValue: {
          authenticated: true,
          canEdit: () => false
        }
      }
    );

    expect(await screen.findByText('Lantern Walk')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('renders an error state for an invalid event id', () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>,
      {
        route: '/events/not-a-number'
      }
    );

    expect(screen.getByText('Invalid event id')).toBeInTheDocument();
  });
});
