import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveTags } from '../api/tags';
import { normalizeTagName } from '../lib/tagNames';
import type { Tag } from '../types/place';

const TAGS_PARAM = 'tags';
const EMPTY: Tag[] = [];

const tagKey = (tag: Pick<Tag, 'name' | 'normalizedName'>) => tag.normalizedName ?? normalizeTagName(tag.name);

const parseNames = (raw: string | null) =>
  Array.from(new Set((raw ?? '').split(',').map(normalizeTagName).filter(Boolean)));

const resolveQueryKey = (names: string[]) => ['tags', 'resolve', names] as const;

/** Keep only the resolve contract fields so chips are labelled consistently with TagInput picks. */
const toSelected = ({ id, name, normalizedName }: Tag): Tag => ({ id, name, normalizedName });

/**
 * Tag filter stored in the URL as `?tags=name1,name2` (normalized names), so filtered
 * lists can be linked and shared. Names are resolved to tags (and ids) via the API.
 *
 * `isResolving` is true while URL names are being resolved; list queries should wait for it
 * (e.g. `enabled: !isResolving`) so they never flash unfiltered results.
 */
export const useTagFilter = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawNames = searchParams.get(TAGS_PARAM);
  const names = useMemo(() => parseNames(rawNames), [rawNames]);

  const resolveQuery = useQuery({
    queryKey: resolveQueryKey(names),
    queryFn: () => resolveTags(names),
    enabled: names.length > 0,
    staleTime: 5 * 60_000
  });

  const resolved = names.length > 0 ? resolveQuery.data : undefined;
  const selectedTags = useMemo(() => (resolved ?? EMPTY).map(toSelected), [resolved]);
  const selectedTagIds = useMemo(() => selectedTags.map((tag) => tag.id), [selectedTags]);
  const isResolving = names.length > 0 && resolveQuery.isPending;

  const setSelectedTags = useCallback(
    (tags: Tag[]) => {
      const nextTags = tags.map(toSelected);
      const nextNames = Array.from(new Set(nextTags.map(tagKey).filter(Boolean)));
      // The picked tags are already known, so seed the cache instead of re-resolving them.
      if (nextNames.length) queryClient.setQueryData(resolveQueryKey(nextNames), nextTags);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextNames.length) next.set(TAGS_PARAM, nextNames.join(','));
          else next.delete(TAGS_PARAM);
          return next;
        },
        { replace: true }
      );
    },
    [queryClient, setSearchParams]
  );

  return { selectedTags, selectedTagIds, setSelectedTags, isResolving };
};
