import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEvent, fetchEvent } from '../../api/events';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { TagList } from '../../components/TagList';
import { useAuth } from '../../auth/KeycloakProvider';

export const EventDetail = () => {
  const { id } = useParams();
  const eventId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canEdit } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: Number.isFinite(eventId)
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    }
  });

  if (!Number.isFinite(eventId)) return <ErrorState message="Invalid event id" />;
  if (isLoading) return <LoadingState label="Loading event..." />;
  if (error || !data) return <ErrorState message="Unable to load this event right now." />;

  const canUserEdit = canEdit(data.createdBy);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{data.category?.title ?? 'Event'}</p>
          <h1 className="text-3xl font-bold text-slate-900">{data.name}</h1>
          <p className="text-slate-600">{data.venue}</p>
          <p className="text-sm text-slate-600">{formatDate(data.startTime)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Capacity {data.capacity}
          </div>
          {canUserEdit && (
            <>
              <button
                onClick={() => navigate(`/events/${eventId}/edit`)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this event?')) deleteMut.mutate();
                }}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900">About</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{data.description}</p>
            <div className="mt-4">
              <TagList
                tags={
                  data.category
                    ? [
                        {
                          id: data.category.id,
                          name: data.category.name,
                          title: data.category.title,
                          value: '',
                          creator: ''
                        }
                      ]
                    : []
                }
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900">Details</h3>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700">
              <Detail label="Venue" value={data.venue} />
              <Detail label="Start time" value={formatDate(data.startTime)} />
              <Detail label="Duration" value={formatDuration(data.duration)} />
              <Detail label="Price" value={formatPrice(data.price)} />
              <Detail label="Created by" value={data.createdBy} />
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const formatDuration = (minutes?: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatPrice = (price?: number) => {
  if (price == null) return '—';
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
};

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-slate-800">{value ?? '—'}</p>
  </div>
);
