/** A JS Date's local calendar date as `yyyy-MM-dd` (used for EXIF "date taken" and date inputs). */
export const toIsoDate = (date: Date) => {
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Human label for a `yyyy-MM-dd` day, e.g. "12 January 2026"; falls back to "Undated". */
export const formatTravelDay = (iso?: string | null) => {
  if (!iso) return 'Undated';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatTravelDates = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'Dates not set';
  const fmt = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start ?? end);
};
