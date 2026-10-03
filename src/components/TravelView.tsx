import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { TravelDetail, TravelPhoto } from '../types/travel';
import { SurfaceCard } from './ui/SurfaceCard';
import { VisibilityBadge } from './VisibilityBadge';
import { TagList } from './TagList';
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
  /** Optional compact block shown on the right of the title header, under the actions (e.g. rating). */
  summary?: ReactNode;
}

export const TravelView = ({ travel, actions, showVisibility, getPhotoHref, summary }: Props) => {
  const photos = travel.photos ?? [];
  const ownerName = travel.owner?.displayName ?? travel.owner?.name;

  // A day's note keyed by its ISO `yyyy-MM-dd`, ignoring blank ones.
  const dayNoteByDay = new Map<string, string>();
  for (const dayNote of travel.dayNotes ?? []) {
    if (typeof dayNote.day === 'string' && (dayNote.note ?? '').trim().length > 0) {
      dayNoteByDay.set(dayNote.day, (dayNote.note ?? '').trim());
    }
  }

  // Group photos by the day they were taken and attach that day's note, so the note sits with
  // its photos. Dated groups come first (chronological), undated last. `takenOn` is an ISO
  // `yyyy-MM-dd` string; coerce anything else to "" (undated) so we never crash. Days that have
  // a note but no photos still appear, so no note is lost.
  const dayKey = (photo: TravelPhoto) => (typeof photo.takenOn === 'string' ? photo.takenOn : '');
  const hasAnyDate = photos.some((photo) => dayKey(photo) !== '') || dayNoteByDay.size > 0;
  const photoGroups = (() => {
    const byDay = new Map<string, TravelPhoto[]>();
    for (const photo of photos) {
      const key = dayKey(photo);
      const group = byDay.get(key) ?? [];
      group.push(photo);
      byDay.set(key, group);
    }
    // Ensure days that only have a note (no photos) still get a group.
    for (const day of dayNoteByDay.keys()) {
      if (!byDay.has(day)) byDay.set(day, []);
    }
    return Array.from(byDay.keys())
      .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a < b ? -1 : a > b ? 1 : 0))
      .map((key, index) => ({
        key,
        label: formatTravelDay(key || undefined),
        dayNumber: key ? dayNumberOf(key, index) : undefined,
        items: byDay.get(key) ?? [],
        note: key ? dayNoteByDay.get(key) : undefined
      }));
  })();

  // "Day N" counted from the trip's start date; falls back to the group's position when the
  // start date is missing or the day falls before it.
  function dayNumberOf(day: string, index: number) {
    const toUtcMs = (iso?: string | null) => (iso ? Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) : NaN);
    const dayMs = toUtcMs(day);
    const startMs = toUtcMs(travel.startDate);
    if (Number.isNaN(dayMs) || Number.isNaN(startMs) || dayMs < startMs) return index + 1;
    return Math.round((dayMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
  }

  const renderPhoto = (photo: TravelPhoto) => {
    const href = getPhotoHref?.(photo);
    const inner = photo.url ? (
      <img
        src={photo.thumbnailUrl ?? photo.url}
        alt={photo.name ?? 'Travel photo'}
        className="h-40 w-full object-cover"
        loading="lazy"
      />
    ) : (
      <div className="flex h-40 w-full items-center justify-center text-sm text-slate-400">{photo.name}</div>
    );
    const caption = photo.note ? (
      <p className="px-2 py-1.5 text-xs font-label text-ink-default">{photo.note}</p>
    ) : null;
    return href ? (
      <Link
        key={photo.id}
        to={href}
        className="block overflow-hidden rounded-xl bg-brand-50 transition hover:-translate-y-0.5 hover:shadow-card"
      >
        {inner}
        {caption}
      </Link>
    ) : (
      <div key={photo.id} className="overflow-hidden rounded-xl bg-brand-50">
        {inner}
        {caption}
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
            {travel.category ? ` · ${travel.category.title || travel.category.name}` : ''}
          </p>
          {ownerName ? <p className="mt-1 text-sm font-label text-ink-subtle">By {ownerName}</p> : null}
          {travel.tags?.length ? (
            <div className="mt-2">
              <TagList tags={travel.tags} />
            </div>
          ) : null}
        </div>
        {actions || summary ? (
          <div className="flex flex-col gap-3 md:items-end">
            {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
            {summary}
          </div>
        ) : null}
      </div>

      {travel.description ? (
        <SurfaceCard>
          <p className="whitespace-pre-line font-label text-ink-default">{travel.description}</p>
        </SurfaceCard>
      ) : null}

      <TravelMap
        places={travel.places}
        photos={travel.photos}
        transportMode={travel.transportMode}
        getPhotoHref={getPhotoHref}
      />

      {photos.length || dayNoteByDay.size ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-strong">Day by day</h2>
          {hasAnyDate ? (
            photoGroups.map((group) => (
              <SurfaceCard
                key={group.key || 'undated'}
                as="div"
                className="flex flex-col gap-4 border-l-4 border-brand-500"
              >
                <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 pb-3">
                  <span className="rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold font-label text-white">
                    {group.dayNumber ? `Day ${group.dayNumber}` : 'Undated'}
                  </span>
                  {group.key ? (
                    <h3 className="font-display text-lg font-semibold text-ink-strong">{group.label}</h3>
                  ) : null}
                  {group.items.length ? (
                    <span className="ml-auto text-xs font-label text-ink-subtle">
                      {group.items.length} {group.items.length === 1 ? 'photo' : 'photos'}
                    </span>
                  ) : null}
                </div>
                {group.note ? (
                  <p className="whitespace-pre-line rounded-xl bg-brand-50 px-4 py-3 font-label text-ink-default">
                    {group.note}
                  </p>
                ) : null}
                {group.items.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{group.items.map(renderPhoto)}</div>
                ) : null}
              </SurfaceCard>
            ))
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map(renderPhoto)}</div>
          )}
        </section>
      ) : null}
    </div>
  );
};
