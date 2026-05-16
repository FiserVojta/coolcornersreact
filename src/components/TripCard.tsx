import { Link } from 'react-router-dom';
import type { TripModel } from '../types/trip';
import { TagList } from './TagList';

interface Props {
  trip: TripModel;
  done?: boolean;
}

const formatDuration = (minutes?: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  return `${days} day${days > 1 ? 's' : ''}`;
};

export const TripCard = ({ trip, done }: Props) => {
  const image = trip.backgroundImage?.url ?? trip.images?.[0];
  const clampedRating = Math.max(0, Math.min(5, Number(trip.rating) || 0));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating - fullStars >= 0.5;

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative h-48 w-full overflow-hidden bg-brand-50">
        {image ? (
          <img
            src={image}
            alt={trip.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-sm font-semibold font-label">No image</span>
          </div>
        )}
        {done ? (
          <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            Done
          </div>
        ) : null}
        <div className="absolute right-3 top-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold font-label text-ink-default shadow-sm backdrop-blur-sm">
            <span className="inline-flex items-center" aria-label={`Rating ${clampedRating} out of 5`}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const isFull = idx < fullStars;
                const isHalf = idx === fullStars && hasHalfStar;
                const gradientId = `trip-rating-${trip.id}-${idx}`;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    {isHalf ? (
                      <defs>
                        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#cbd5e1" />
                        </linearGradient>
                      </defs>
                    ) : null}
                    <path
                      d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9L10 14.7 4.7 17.7l1-5.9L1.5 7.7l5.9-.9L10 1.5z"
                      fill={isHalf ? `url(#${gradientId})` : isFull ? '#f59e0b' : '#cbd5e1'}
                    />
                  </svg>
                );
              })}
            </span>
            <span className="text-ink-muted">{clampedRating.toFixed(1)} / 5</span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-ink-strong">{trip.name}</h3>
          <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold font-label text-ink-default">
            {formatDuration(trip.duration)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm font-label text-ink-muted">{trip.description}</p>
        <TagList tags={trip.tags} />
      </div>
    </Link>
  );
};
