import { useQuery } from '@tanstack/react-query';
import { fetchCotravelList } from '../../api/cotravel';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { CotravelCard } from '../../components/CotravelCard';
import { useAuth } from '../../auth/KeycloakProvider';
import { Link } from 'react-router-dom';

export const CotravelList = () => {
  const { authenticated, login } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['cotravel'],
    queryFn: () => fetchCotravelList()
  });

  if (isLoading) return <LoadingState label="Loading co-travel plans..." />;
  if (error) return <ErrorState message="Unable to load co-travel plans right now." />;

  const plans = data?.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">CoTravel</p>
          <h1 className="text-3xl font-bold text-slate-900">Join community-led trips</h1>
          <p className="mt-2 text-slate-600">Found {data?.totalItems ?? plans.length} co-travel plans.</p>
        </div>
        <div className="flex items-center gap-3">
          {authenticated ? (
            <Link
              to="/cotravel/create"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Create plan
            </Link>
          ) : (
            <button
              onClick={() => login()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
            >
              Login to create
            </button>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            React port
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((wander) => (
          <CotravelCard key={wander.id} cotravel={wander} />
        ))}
      </div>
    </main>
  );
};
