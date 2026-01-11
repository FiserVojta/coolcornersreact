import { Link } from 'react-router-dom';
import type { Cotravel } from '../types/cotravel';
import { TagList } from './TagList';

const formatDate = (value: string | number) => {
  const date = typeof value === 'number' ? new Date(value > 1e10 ? value : value * 1000) : new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CotravelCard = ({ cotravel }: { cotravel: Cotravel }) => {
  const image = pickImage(cotravel.description);
  const filled = cotravel.wanderers?.length ?? 0;
  const capacity = cotravel.capacity ?? 0;

  return (
    <Link
      to={`/cotravel/${cotravel.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt="CoTravel"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-sm font-semibold">No image</span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {filled}/{capacity} joined
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">
            {deriveTitle(cotravel.description)}
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {formatDate(cotravel.startTime)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">{summarize(cotravel.description)}</p>
        <TagList tags={cotravel.tags} />
      </div>
    </Link>
  );
};

const summarize = (value?: string) => value ?? 'Join this shared adventure with the community.';

const deriveTitle = (value?: string) => {
  if (!value) return 'Community adventure';
  const lower = value.toLowerCase();
  if (lower.includes('iceland') || lower.includes('northern')) return 'Northern Lights Escape';
  if (lower.includes('asia') || lower.includes('thailand')) return 'Southeast Asia Backpack';
  if (lower.includes('alps') || lower.includes('swiss')) return 'Alpine Trails';
  if (lower.includes('safari') || lower.includes('tanzania')) return 'Savanna Safari';
  if (lower.includes('greece')) return 'Greek Island Hopping';
  return value;
};

const pickImage = (value?: string) => {
  const lower = value?.toLowerCase() ?? '';
  if (lower.includes('iceland') || lower.includes('northern')) {
    return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('asia') || lower.includes('thailand')) {
    return 'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('alps') || lower.includes('swiss')) {
    return 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('safari') || lower.includes('tanzania')) {
    return 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('greece') || lower.includes('island')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80';
  }
  return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80';
};
