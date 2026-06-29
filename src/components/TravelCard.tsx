import { Link } from 'react-router-dom';
import type { TravelSummary } from '../types/travel';
import { VisibilityBadge } from './VisibilityBadge';
import { formatTravelDates } from '../lib/travelFormat';

interface Props {
  travel: TravelSummary;
}

export const TravelCard = ({ travel }: Props) => {
  const image = travel.coverImage?.url ?? undefined;

  return (
    <Link
      to={`/travels/${travel.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative h-44 w-full overflow-hidden bg-brand-50">
        {image ? (
          <img
            src={image}
            alt={travel.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-sm font-semibold font-label">No cover photo</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <VisibilityBadge visibility={travel.visibility} />
        </div>
        {travel.photoCount > 0 ? (
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold font-label text-ink-default shadow-sm backdrop-blur-sm">
            📷 {travel.photoCount}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
        <h3 className="font-display text-lg font-semibold text-ink-strong">{travel.title}</h3>
        {travel.location ? (
          <p className="text-sm font-label text-ink-muted">📍 {travel.location}</p>
        ) : null}
        <p className="text-xs font-label text-ink-subtle">{formatTravelDates(travel.startDate, travel.endDate)}</p>
      </div>
    </Link>
  );
};
