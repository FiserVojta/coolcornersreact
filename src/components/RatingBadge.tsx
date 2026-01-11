interface Props {
  rating?: number;
}

export const RatingBadge = ({ rating }: Props) => {
  if (rating == null) {
    return (
      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
        New
      </span>
    );
  }

  return (
    <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
      {rating.toFixed(1)}
    </span>
  );
};
