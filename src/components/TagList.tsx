import { Link } from 'react-router-dom';
import type { Tag } from '../types/place';
import { normalizeTagName } from '../lib/tagNames';

const chipClassName =
  'rounded-full border border-brand-100 bg-white px-2.5 py-1 text-xs font-semibold text-ink-default';

/**
 * Renders tag chips. With `basePath`, each chip links to that list filtered by the tag
 * (`?tags=<normalized name>`). Do not pass `basePath` inside components that are already
 * wrapped in a link (cards), since nested anchors are invalid.
 */
export const TagList = ({ tags, basePath }: { tags?: Tag[]; basePath?: string }) => {
  if (!tags?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) =>
        basePath ? (
          <Link
            key={tag.id}
            to={`${basePath}?tags=${encodeURIComponent(tag.normalizedName ?? normalizeTagName(tag.name))}`}
            className={`${chipClassName} transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700`}
          >
            {tag.title || tag.name}
          </Link>
        ) : (
          <span key={tag.id} className={chipClassName}>
            {tag.title || tag.name}
          </span>
        )
      )}
    </div>
  );
};
