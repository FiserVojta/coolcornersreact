import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventsList } from './EventsList';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('EventsList', () => {
  it('filters events by search term', async () => {
    renderWithProviders(<EventsList />, {
      authValue: {
        authenticated: true
      },
      route: '/events'
    });

    expect(await screen.findByText('Lantern Walk')).toBeInTheDocument();
    expect(screen.getByText('Riverside Tasting')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 events')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search by name, venue...'), {
      target: { value: 'Lantern' }
    });

    expect(screen.getByText('Lantern Walk')).toBeInTheDocument();
    expect(screen.queryByText('Riverside Tasting')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 events')).toBeInTheDocument();
  });

  it('filters events by price range', async () => {
    renderWithProviders(<EventsList />, {
      route: '/events'
    });

    expect(await screen.findByText('Lantern Walk')).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    const priceSelect = selects[0];

    fireEvent.change(priceSelect, { target: { value: 'free' } });

    expect(screen.getByText('Lantern Walk')).toBeInTheDocument();
    expect(screen.queryByText('Riverside Tasting')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 events')).toBeInTheDocument();
  });
});
