import type { Tag } from '../types/place';

export const TagList = ({ tags }: { tags?: Tag[] }) => {
  if (!tags?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full border border-brand-100 bg-white px-2.5 py-1 text-xs font-semibold text-ink-default"
        >
          {tag.title || tag.name}
        </span>
      ))}
    </div>
  );
};
