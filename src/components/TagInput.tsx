import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTag, searchTags } from '../api/tags';
import type { Tag, TagSuggestion } from '../types/place';
import { normalizeTagName, tagLabel } from '../lib/tagNames';

type TagInputProps = {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  label?: string;
  max?: number;
  /** When false (e.g. in list filters) only existing tags can be picked. */
  allowCreate?: boolean;
};

type TagOption =
  | { kind: 'suggestion'; key: string; label: string; suggestion: TagSuggestion }
  | { kind: 'create'; key: string; label: string; name: string };

const SEARCH_DEBOUNCE_MS = 200;
const SEARCH_LIMIT = 10;

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

const createErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return 'Could not create the tag. Please try again.';
};

export const TagInput = ({ value, onChange, label = 'Tags', max = 10, allowCreate = true }: TagInputProps) => {
  const queryClient = useQueryClient();
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const hintId = `${baseId}-hint`;

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const atMax = value.length >= max;
  const active = open && !atMax;
  // Results are only shown once the search has caught up with the typed text, so stale
  // suggestions never decide whether "Create" is offered.
  const settled = debounced === trimmed;

  const searchQuery = useQuery({
    queryKey: ['tags', 'search', debounced],
    queryFn: () => searchTags(debounced, SEARCH_LIMIT),
    enabled: active,
    staleTime: 30_000
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createTag(name),
    onSuccess: (tag) => {
      if (!value.some((selected) => selected.id === tag.id)) {
        onChange([...value, tag]);
      }
      setText('');
      setHighlighted(0);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    }
  });

  const selectedIds = new Set(value.map((tag) => tag.id));
  const selectedNormalized = new Set(value.map((tag) => tag.normalizedName ?? normalizeTagName(tag.name)));
  const ready = active && settled && !searchQuery.isPending;
  const suggestions = ready ? (searchQuery.data ?? []) : [];
  const visibleSuggestions = suggestions.filter((suggestion) => !selectedIds.has(suggestion.id));

  const normalizedInput = normalizeTagName(trimmed);
  const exactMatch =
    suggestions.some((suggestion) => suggestion.normalizedName === normalizedInput) ||
    (normalizedInput !== '' && selectedNormalized.has(normalizedInput));
  const canCreate = allowCreate && ready && trimmed !== '' && !exactMatch;

  const options: TagOption[] = [
    ...visibleSuggestions.map(
      (suggestion): TagOption => ({
        kind: 'suggestion',
        key: `s-${suggestion.id}`,
        label: suggestion.name,
        suggestion
      })
    ),
    ...(canCreate ? [{ kind: 'create', key: 'create', label: `Create "${trimmed}"`, name: trimmed } as TagOption] : [])
  ];

  const showList = active && options.length > 0;
  const activeIndex = Math.min(highlighted, Math.max(options.length - 1, 0));

  const choose = (option: TagOption) => {
    if (option.kind === 'suggestion') {
      const { id, name, normalizedName } = option.suggestion;
      onChange([...value, { id, name, normalizedName }]);
      setText('');
      setHighlighted(0);
      createMut.reset();
      return;
    }
    if (allowCreate && !createMut.isPending) createMut.mutate(option.name);
  };

  const remove = (id: number) => onChange(value.filter((tag) => tag.id !== id));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter':
        // Never let Enter in the tag box submit the surrounding form.
        event.preventDefault();
        if (showList) choose(options[activeIndex]);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!open) setOpen(true);
        else if (options.length) setHighlighted((activeIndex + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (options.length) setHighlighted((activeIndex - 1 + options.length) % options.length);
        break;
      case 'Backspace':
        if (text === '' && value.length) remove(value[value.length - 1].id);
        break;
    }
  };

  return (
    <div className="space-y-2 text-sm font-label">
      <label htmlFor={inputId} className="field-label block font-semibold text-ink-strong">
        {label}
      </label>

      {value.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map((tag) => (
            <li
              key={tag.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand-700 bg-brand-700 py-1 pl-3 pr-1 text-[13px] font-semibold text-white"
            >
              <span className="truncate">{tagLabel(tag)}</span>
              <button
                type="button"
                onClick={() => remove(tag.id)}
                aria-label={`Remove ${tagLabel(tag)}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-brand-100 transition hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-200"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-activedescendant={showList ? `${listboxId}-${options[activeIndex].key}` : undefined}
          aria-describedby={atMax ? hintId : undefined}
          disabled={atMax}
          value={text}
          placeholder={atMax ? '' : allowCreate ? 'Search or create a tag' : 'Search tags'}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setHighlighted(0);
            if (createMut.isError) createMut.reset();
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm text-ink-strong shadow-sm outline-none transition placeholder:text-ink-faint focus:border-brand-400 disabled:cursor-not-allowed disabled:bg-page disabled:opacity-70"
        />
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          hidden={!showList}
          className="absolute left-0 right-0 z-[1000] mt-1 max-h-64 overflow-y-auto rounded-xl border border-brand-100 bg-white py-1 shadow-card"
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listboxId}-${option.key}`}
              role="option"
              aria-selected={index === activeIndex}
              // Keep focus in the input so the list does not close before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(option)}
              className={[
                'cursor-pointer px-3 py-2 text-sm',
                index === activeIndex ? 'bg-brand-50 text-brand-700' : 'text-ink-strong',
                option.kind === 'create' ? 'border-t border-brand-50 font-semibold text-brand-700' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>

      {createMut.isPending ? <p className="field-hint text-xs text-ink-subtle">Creating tag…</p> : null}
      {createMut.isError ? (
        <p role="alert" className="field-error text-xs font-semibold text-rose-600">
          {createErrorMessage(createMut.error)}
        </p>
      ) : null}
      {atMax ? (
        <p id={hintId} className="field-hint text-xs text-ink-subtle">
          You can add up to {max} tags.
        </p>
      ) : null}
    </div>
  );
};
