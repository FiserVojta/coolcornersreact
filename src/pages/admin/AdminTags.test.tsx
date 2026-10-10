import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { AdminTags } from './AdminTags';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/msw/server';

const apiUrl = 'http://localhost:8080/api';
const admin = { authenticated: true, isAdmin: true, email: 'admin@example.com' };

type AdminTag = {
  id: number;
  name: string;
  normalizedName: string;
  creator: string;
  status: 'ACTIVE' | 'HIDDEN';
  createdAt: string;
  usageCount: number;
};

const adminTag = (id: number, name: string, overrides: Partial<AdminTag> = {}): AdminTag => ({
  id,
  name,
  normalizedName: name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''),
  creator: 'user@example.com',
  status: 'ACTIVE',
  createdAt: '2026-10-01T10:00:00Z',
  usageCount: 0,
  ...overrides
});

/** Serves an in-memory tag table so mutations are visible on refetch. */
const serveTags = (initial: AdminTag[]) => {
  let tags = [...initial];
  const listRequests: URLSearchParams[] = [];
  server.use(
    http.get(`${apiUrl}/admin/tags`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      listRequests.push(params);
      const q = (params.get('q') ?? '').toLowerCase();
      const status = params.get('status');
      const data = tags.filter(
        (tag) => (!q || tag.normalizedName.includes(q)) && (!status || tag.status === status)
      );
      return HttpResponse.json({ totalItems: data.length, data });
    }),
    http.patch(`${apiUrl}/admin/tags/:id`, async ({ params, request }) => {
      const body = (await request.json()) as { status: AdminTag['status'] };
      tags = tags.map((tag) => (tag.id === Number(params.id) ? { ...tag, status: body.status } : tag));
      return HttpResponse.json(tags.find((tag) => tag.id === Number(params.id)));
    })
  );
  return { listRequests, setTags: (next: AdminTag[]) => (tags = next) };
};

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name, 'i') });

describe('AdminTags', () => {
  it('tells non-admins they have no access and loads nothing', async () => {
    const { listRequests } = serveTags([adminTag(1, 'quiet')]);

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: { authenticated: true, isAdmin: false } });

    expect(screen.getByText("You don't have access to this page.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(listRequests).toHaveLength(0);
  });

  it('lists tags with creator, usage and status', async () => {
    const { listRequests } = serveTags([
      adminTag(1, 'LowCost', { creator: 'system', usageCount: 12 }),
      adminTag(2, 'Spammy', { status: 'HIDDEN', usageCount: 3 })
    ]);

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: admin });

    expect(await screen.findByRole('row', { name: /lowcost/i })).toBeInTheDocument();
    expect(within(rowFor('lowcost')).getByText('system')).toBeInTheDocument();
    expect(within(rowFor('lowcost')).getByText('12')).toBeInTheDocument();
    expect(within(rowFor('lowcost')).getByText('Active')).toBeInTheDocument();
    expect(within(rowFor('spammy')).getByText('Hidden')).toBeInTheDocument();
    expect(listRequests[0].get('page')).toBe('0');
  });

  it('filters by search text and status', async () => {
    const { listRequests } = serveTags([
      adminTag(1, 'LowCost'),
      adminTag(2, 'Spammy', { status: 'HIDDEN' })
    ]);

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: admin });
    await screen.findByRole('row', { name: /lowcost/i });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tags' }), { target: { value: 'spam' } });
    await waitFor(() => expect(listRequests.at(-1)?.get('q')).toBe('spam'));
    await waitFor(() => expect(screen.queryByRole('row', { name: /lowcost/i })).not.toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'HIDDEN' } });
    await waitFor(() => expect(listRequests.at(-1)?.get('status')).toBe('HIDDEN'));
    expect(await screen.findByRole('row', { name: /spammy/i })).toBeInTheDocument();
  });

  it('hides and unhides a tag', async () => {
    let patched: unknown;
    serveTags([adminTag(1, 'Spammy')]);
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PATCH') patched = await request.clone().json();
    });

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Hide Spammy' }));

    expect(await screen.findByRole('button', { name: 'Unhide Spammy' })).toBeInTheDocument();
    expect(patched).toEqual({ status: 'HIDDEN' });
    expect(within(rowFor('spammy')).getByText('Hidden')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unhide Spammy' }));
    expect(await screen.findByRole('button', { name: 'Hide Spammy' })).toBeInTheDocument();
    server.events.removeAllListeners();
  });

  it('merges a tag into a target picked by search', async () => {
    let mergeBody: unknown;
    let mergedSourceId: string | undefined;
    const { setTags } = serveTags([adminTag(1, 'lowcosst', { usageCount: 2 }), adminTag(2, 'LowCost', { usageCount: 9 })]);
    server.use(
      http.get(`${apiUrl}/public/tags/search`, () =>
        HttpResponse.json([{ id: 2, name: 'LowCost', normalizedName: 'lowcost', usageCount: 9 }])
      ),
      http.post(`${apiUrl}/admin/tags/:id/merge`, async ({ params, request }) => {
        mergedSourceId = String(params.id);
        mergeBody = await request.json();
        setTags([adminTag(2, 'LowCost', { usageCount: 11 })]);
        return HttpResponse.json(adminTag(2, 'LowCost', { usageCount: 11 }));
      })
    );

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Merge lowcosst' }));
    const dialog = screen.getByRole('dialog', { name: /merge "lowcosst"/i });
    const target = within(dialog).getByRole('combobox', { name: 'Merge into' });
    fireEvent.focus(target);
    fireEvent.change(target, { target: { value: 'lowc' } });
    fireEvent.click(await within(dialog).findByRole('option', { name: /lowcost/i }));
    expect(within(dialog).queryByRole('option', { name: /create/i })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mergedSourceId).toBe('1');
    expect(mergeBody).toEqual({ targetId: 2 });
    await waitFor(() => expect(screen.queryByRole('row', { name: /lowcosst/i })).not.toBeInTheDocument());
    expect(within(rowFor('lowcost')).getByText('11')).toBeInTheDocument();
  });

  it('keeps the merge button disabled until a target is picked and allows cancelling', async () => {
    serveTags([adminTag(1, 'lowcosst')]);

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Merge lowcosst' }));
    const dialog = screen.getByRole('dialog', { name: /merge "lowcosst"/i });
    expect(within(dialog).getByRole('button', { name: 'Merge' })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the server error when an action fails', async () => {
    serveTags([adminTag(1, 'Spammy')]);
    server.use(
      http.patch(`${apiUrl}/admin/tags/:id`, () =>
        HttpResponse.json({ status: 404, detail: 'Tag not found' }, { status: 404 })
      )
    );

    renderWithProviders(<AdminTags />, { route: '/admin/tags', authValue: admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Hide Spammy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tag not found');
  });
});
