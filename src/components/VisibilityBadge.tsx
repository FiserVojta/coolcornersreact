import { VISIBILITY_LABELS, type TravelVisibility } from '../types/travel';

const styles: Record<TravelVisibility, string> = {
  PRIVATE: 'bg-slate-100 text-slate-700',
  FOLLOWERS: 'bg-amber-50 text-amber-700',
  PUBLIC: 'bg-emerald-50 text-emerald-700'
};

const glyphs: Record<TravelVisibility, string> = {
  PRIVATE: '🔒',
  FOLLOWERS: '👥',
  PUBLIC: '🌍'
};

export const VisibilityBadge = ({ visibility }: { visibility: TravelVisibility }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold font-label ${styles[visibility]}`}
  >
    <span aria-hidden="true">{glyphs[visibility]}</span>
    {VISIBILITY_LABELS[visibility]}
  </span>
);
