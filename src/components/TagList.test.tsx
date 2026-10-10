import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TagList } from './TagList';
import { renderWithProviders } from '../test/renderWithProviders';

describe('TagList', () => {
  it('renders plain chips when no link target is given', () => {
    renderWithProviders(<TagList tags={[{ id: 1, name: 'quiet' }]} />);

    expect(screen.getByText('quiet')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links chips to a filtered list using the normalized name', () => {
    renderWithProviders(
      <TagList
        basePath="/places"
        tags={[
          { id: 1, name: 'Low Cost', normalizedName: 'lowcost' },
          { id: 2, name: 'Night Swim' }
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Low Cost' })).toHaveAttribute('href', '/places?tags=lowcost');
    expect(screen.getByRole('link', { name: 'Night Swim' })).toHaveAttribute('href', '/places?tags=nightswim');
  });
});
