import { useQuery } from '@tanstack/react-query';
import { fetchPlaces } from '../../api/places';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PlaceCard } from '../../components/PlaceCard';
import { useAuth } from '../../auth/KeycloakProvider';
import { Link } from 'react-router-dom';

export const PlacesList = () => {
  const { authenticated, login } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['places'],
    queryFn: () => fetchPlaces()
  });

  if (isLoading) return <LoadingState label="Loading places..." />;
  if (error) return <ErrorState message="Unable to load places right now." />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Places</p>
          <h1 className="text-3xl font-bold text-slate-900">Discover curated corners</h1>
          <p className="mt-2 text-slate-600">Fetched from {data?.totalItems ?? 0} entries.</p>
        </div>
        <div className="flex items-center gap-3">
          {authenticated ? (
            <Link
              to="/places/create"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Create place
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
        {data?.data.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </main>
  );
};
