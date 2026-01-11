import { Link } from 'react-router-dom';
import type { PlaceDetail } from '../types/place';
import { TagList } from './TagList';

interface Props {
  place: PlaceDetail;
}

export const PlaceCard = ({ place }: Props) => {
  const image = place.images?.[0];
  const clampedRating = Math.max(0, Math.min(5, Number(place.rating) || 0));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating - fullStars >= 0.5;

  return (
    <Link
      to={`/places/${place.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-52 w-full overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={place.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-sm font-semibold">No image</span>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm">
            <span className="inline-flex items-center" aria-label={`Rating ${clampedRating} out of 5`}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const isFull = idx < fullStars;
                const isHalf = idx === fullStars && hasHalfStar;
                const gradientId = `place-rating-${place.id}-${idx}`;
                return (
                  <svg key={idx} viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                    {isHalf ? (
                      <defs>
                        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#cbd5f5" />
                        </linearGradient>
                      </defs>
                    ) : null}
                    <path
                      d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9L10 14.7 4.7 17.7l1-5.9L1.5 7.7l5.9-.9L10 1.5z"
                      fill={isHalf ? `url(#${gradientId})` : isFull ? '#f59e0b' : '#cbd5f5'}
                    />
                  </svg>
                );
              })}
            </span>
            <span className="text-slate-700">{clampedRating.toFixed(1)} / 5</span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{place.name}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {place.city?.name ?? '—'}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">{place.description}</p>
        <TagList tags={place.tags} />
      </div>
    </Link>
  );
};
