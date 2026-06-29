import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { TravelDetail, TravelPhoto } from '../types/travel';
import { SurfaceCard } from './ui/SurfaceCard';
import { VisibilityBadge } from './VisibilityBadge';
import { TravelMap } from './TravelMap';
import { formatTravelDates, formatTravelDay } from '../lib/travelFormat';

interface Props {
  travel: TravelDetail;
  /** Optional actions (share / edit / delete) rendered in the header, e.g. for the owner. */
  actions?: ReactNode;
  /** When true, show the visibility badge (owner view); shared links hide it. */
  showVisibility?: boolean;
  /** Builds the link to a photo's full-page view; when omitted, photos aren't clickable. */
  getPhotoHref?: (photo: TravelPhoto) => string | undefined;
}

export const TravelView = ({ travel, actions, showVisibility, getPhotoHref }: Props) => {
  const photos = travel.photos ?? [];
  const ownerName = travel.owner?.displayName ?? travel.owner?.name;

  // Group photos by the day they were taken; dated groups first (chronological), undated last.
  // `takenOn` is an ISO `yyyy-MM-dd` string; coerce anything else to "" (undated) so we never crash.
  const dayKey = (photo: TravelPhoto) => (typeof photo.takenOn === 'string' ? photo.takenOn : '');
  const hasAnyDate = photos.some((photo) => dayKey(photo) !== '');
  const photoGroups = (() => {
    const byDay = new Map<string, TravelPhoto[]>();
    for (const photo of photos) {
      const key = dayKey(photo);
      const group = byDay.get(key) ?? [];
      group.push(photo);
      byDay.set(key, group);
    }
    return Array.from(byDay.keys())
      .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a < b ? -1 : a > b ? 1 : 0))
      .map((key) => ({ key, label: formatTravelDay(key || undefined), items: byDay.get(key) ?? [] }));
  })();

  const renderPhoto = (photo: TravelPhoto) => {
    const href = getPhotoHref?.(photo);
    const inner = photo.url ? (
      <img src={photo.url} alt={photo.name ?? 'Travel photo'} className="h-40 w-full object-cover" loading="lazy" />
    ) : (
      <div className="flex h-40 w-full items-center justify-center text-sm text-slate-400">{photo.name}</div>
    );
    return href ? (
      <Link
        key={photo.id}
        to={href}
        className="block overflow-hidden rounded-xl bg-brand-50 transition hover:-translate-y-0.5 hover:shadow-card"
      >
        {inner}
      </Link>
    ) : (
      <div key={photo.id} className="overflow-hidden rounded-xl bg-brand-50">
        {inner}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-brand-50">
        {travel.coverImage?.url ? (
          <img src={travel.coverImage.url} alt={travel.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-sm font-semibold font-label">No cover photo</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink-strong">{travel.title}</h1>
            {showVisibility ? <VisibilityBadge visibility={travel.visibility} /> : null}
          </div>
          <p className="mt-2 font-label text-ink-muted">
            {travel.location ? `📍 ${travel.location} · ` : ''}
            {formatTravelDates(travel.startDate, travel.endDate)}
          </p>
          {ownerName ? <p className="mt-1 text-sm font-label text-ink-subtle">By {ownerName}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {travel.description ? (
        <SurfaceCard>
          <p className="whitespace-pre-line font-label text-ink-default">{travel.description}</p>
        </SurfaceCard>
      ) : null}

      <TravelMap places={travel.places} photos={travel.photos} getPhotoHref={getPhotoHref} />

      {photos.length ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-strong">Photos</h2>
          {hasAnyDate ? (
            photoGroups.map((group) => (
              <div key={group.key || 'undated'} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold font-label uppercase tracking-[0.12em] text-brand-700">
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{group.items.map(renderPhoto)}</div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map(renderPhoto)}</div>
          )}
        </section>
      ) : null}
    </div>
  );
};
