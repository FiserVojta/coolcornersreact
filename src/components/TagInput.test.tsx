import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { TagInput } from './TagInput';
import type { Tag, TagSuggestion } from '../types/place';
import { renderWithProviders } from '../test/renderWithProviders';
import { server } from '../test/msw/server';

const apiUrl = 'http://localhost:8080/api';

const suggestion = (id: number, name: string, normalizedName: string, usageCount = 0): TagSuggestion => ({
  id,
  name,
  normalizedName,
  usageCount
});

const Harness = ({
  initial = [],
  max,
  onChange
}: {
  initial?: Tag[];
  max?: number;
  onChange?: (tags: Tag[]) => void;
}) => {
  const [tags, setTags] = useState<Tag[]>(initial);
  return (
    <TagInput
      value={tags}
      max={max}
      onChange={(next) => {
        setTags(next);
        onChange?.(next);
      }}
    />
  );
};

const typeInto = (value: string) => {
  const input = screen.getByRole('combobox', { name: 'Tags' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  return input;
};

describe('TagInput', () => {
  it('renders selected tags as chips and removes one', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <Harness
        initial={[
          { id: 1, name: 'Quiet' },
          { id: 2, name: 'Sunset' }
        ]}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Quiet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Quiet' }));

    expect(onChange).toHaveBeenLastCalledWith([{ id: 2, name: 'Sunset' }]);
    expect(screen.queryByText('Quiet')).not.toBeInTheDocument();
  });

  it('searches as the user types and adds a picked suggestion, hiding already selected tags', async () => {
    const queries: (string | null)[] = [];
    server.use(
      http.get(`${apiUrl}/public/tags/search`, ({ request }) => {
        queries.push(new URL(request.url).searchParams.get('q'));
        return HttpResponse.json([
          suggestion(1, 'Quiet', 'quiet', 4),
          suggestion(5, 'Quiet Morning', 'quietmorning', 2)
        ]);
      })
    );
    const onChange = vi.fn();
    renderWithProviders(<Harness initial={[{ id: 1, name: 'Quiet' }]} onChange={onChange} />);

    typeInto('qui');

    const option = await screen.findByRole('option', { name: /quiet morning/i });
    expect(queries).toContain('qui');
    expect(screen.queryByRole('option', { name: /^quiet$/i })).not.toBeInTheDocument();

    fireEvent.click(option);

    expect(onChange).toHaveBeenLastCalledWith([
      { id: 1, name: 'Quiet' },
      expect.objectContaining({ id: 5, name: 'Quiet Morning' })
    ]);
    expect(screen.getByRole('combobox', { name: 'Tags' })).toHaveValue('');
  });

  it('shows popular tags when focused with an empty input', async () => {
    server.use(
      http.get(`${apiUrl}/public/tags/search`, ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        return HttpResponse.json(q ? [] : [suggestion(7, 'HiddenGem', 'hiddengem', 9)]);
      })
    );
    renderWithProviders(<Harness />);

    fireEvent.focus(screen.getByRole('combobox', { name: 'Tags' }));

    expect(await screen.findByRole('option', { name: /hiddengem/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /create/i })).not.toBeInTheDocument();
  });

  it('offers to create a new tag when nothing matches exactly and selects the created tag', async () => {
    let postedBody: unknown;
    server.use(
      http.get(`${apiUrl}/public/tags/search`, () =>
        HttpResponse.json([suggestion(3, 'Night Swimming', 'nightswimming', 1)])
      ),
      http.post(`${apiUrl}/tags`, async ({ request }) => {
        postedBody = await request.json();
        return HttpResponse.json({ id: 42, name: 'Night Swim', normalizedName: 'nightswim', creator: 'me@example.com' });
      })
    );
    const onChange = vi.fn();
    renderWithProviders(<Harness onChange={onChange} />, { authValue: { authenticated: true } });

    typeInto('Night Swim');
    fireEvent.click(await screen.findByRole('option', { name: /create "night swim"/i }));

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 42, name: 'Night Swim' })])
    );
    expect(postedBody).toEqual({ name: 'Night Swim' });
    expect(screen.getByRole('combobox', { name: 'Tags' })).toHaveValue('');
  });

  it('does not offer creation when a suggestion has the same normalized name', async () => {
    server.use(
      http.get(`${apiUrl}/public/tags/search`, () => HttpResponse.json([suggestion(2, 'LowCost', 'lowcost', 3)]))
    );
    renderWithProviders(<Harness />, { authValue: { authenticated: true } });

    typeInto('low-cost');

    expect(await screen.findByRole('option', { name: /lowcost/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /create/i })).not.toBeInTheDocument();
  });

  it('creates the tag with Enter when there are no suggestions', async () => {
    server.use(
      http.get(`${apiUrl}/public/tags/search`, () => HttpResponse.json([])),
      http.post(`${apiUrl}/tags`, () => HttpResponse.json({ id: 50, name: 'Fjord', normalizedName: 'fjord' }))
    );
    const onChange = vi.fn();
    renderWithProviders(<Harness onChange={onChange} />, { authValue: { authenticated: true } });

    const input = typeInto('Fjord');
    await screen.findByRole('option', { name: /create "fjord"/i });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 50 })]));
  });

  it('shows the server error when creating a tag fails', async () => {
    server.use(
      http.get(`${apiUrl}/public/tags/search`, () => HttpResponse.json([])),
      http.post(`${apiUrl}/tags`, () =>
        HttpResponse.json(
          { status: 400, detail: 'Tag name must contain at least 2 letters or digits.' },
          { status: 400 }
        )
      )
    );
    const onChange = vi.fn();
    renderWithProviders(<Harness onChange={onChange} />, { authValue: { authenticated: true } });

    typeInto('x!');
    fireEvent.click(await screen.findByRole('option', { name: /create "x!"/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tag name must contain at least 2 letters or digits.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables the input once the maximum number of tags is selected', () => {
    renderWithProviders(
      <Harness
        max={2}
        initial={[
          { id: 1, name: 'Quiet' },
          { id: 2, name: 'Sunset' }
        ]}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Tags' })).toBeDisabled();
    expect(screen.getByText(/up to 2 tags/i)).toBeInTheDocument();
  });
});
