import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripsList } from './TripsList';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('TripsList', () => {
  it('renders trips from the mocked backend API', async () => {
    renderWithProviders(<TripsList />, {
      route: '/trips'
    });

    expect(await screen.findByText('Prague Dawn Walk')).toBeInTheDocument();
    expect(screen.getByText('Found 1 trips.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login to create' })).toBeInTheDocument();
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
});
