import { Link } from 'react-router-dom';
import type { EventModel } from '../types/event';
import { TagList } from './TagList';

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

export const EventCard = ({ event }: { event: EventModel }) => {
  const image = pickImage(event.name, event.description);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={event.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-sm font-semibold">No image</span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {formatDate(event.startTime)}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">{event.name}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {formatDuration(event.duration)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">{event.description}</p>
        <TagList
          tags={
            event.category
              ? [{ id: event.category.id, name: event.category.name, title: event.category.title, value: '', creator: '' }]
              : []
          }
        />
      </div>
    </Link>
  );
};

const pickImage = (name?: string, description?: string) => {
  const lower = `${name ?? ''} ${description ?? ''}`.toLowerCase();
  if (lower.includes('conference') || lower.includes('summit')) {
    return 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('workshop') || lower.includes('training')) {
    return 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('concert') || lower.includes('music')) {
    return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('network')) {
    return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=80';
  }
  if (lower.includes('festival')) {
    return 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=80';
  }
  return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80';
};
