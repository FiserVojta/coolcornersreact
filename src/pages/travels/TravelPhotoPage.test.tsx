import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { TravelPhotoPage } from './TravelPhotoPage';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('TravelPhotoPage', () => {
  it('renders a single travel photo full-page with a back link', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/travels/:id/photos/:photoId" element={<TravelPhotoPage />} />
      </Routes>,
      {
        route: '/travels/501/photos/2',
        authValue: { authenticated: true, email: 'me@example.com' }
      }
    );

    const image = await screen.findByRole('img', { name: 'photo.jpg' });
    expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(screen.getByRole('link', { name: '← Back to travel' })).toBeInTheDocument();
    expect(screen.getByText(/Photo 1 of 1/)).toBeInTheDocument();
  });
});
