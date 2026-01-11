import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createPlace, fetchPlace, updatePlace } from '../../api/places';
import { fetchCategories } from '../../api/categories';
import { fetchTags } from '../../api/tags';
import type { PlaceCreateRequest } from '../../types/place';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export const PlaceForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const placeId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const placeQuery = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => fetchPlace(placeId),
    enabled: isEdit && Number.isFinite(placeId)
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'PLACE'],
    queryFn: () => fetchCategories('PLACE')
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PlaceCreateRequest>({
    defaultValues: {
      name: '',
      description: '',
      rating: 0,
      phoneNumber: '',
      price: 0,
      openingHours: '',
      image: '',
      gallery: '',
      categoryId: 1,
      geometry: { type: 'Point', coordinates: [0, 0] },
      tags: []
    }
  });

  useEffect(() => {
    if (placeQuery.data) {
      const coords = placeQuery.data.feature?.geometry.coordinates ?? [0, 0];
      reset({
        name: placeQuery.data.name,
        description: placeQuery.data.description,
        rating: placeQuery.data.rating ?? 0,
        phoneNumber: placeQuery.data.phoneNumber,
        price: 0,
        openingHours: placeQuery.data.openingHours,
        image: placeQuery.data.images?.[0],
        gallery: placeQuery.data.images?.slice(1).join(','),
        categoryId: placeQuery.data.category?.id ?? 1,
        geometry: { type: 'Point', coordinates: [coords[0] ?? 0, coords[1] ?? 0] },
        tags: placeQuery.data.tags?.map((t) => t.id) ?? []
      });
    }
  }, [placeQuery.data, reset]);

  const createMut = useMutation({
    mutationFn: (payload: PlaceCreateRequest) => createPlace(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      navigate(`/places/${created.id}`);
    }
  });

  const updateMut = useMutation({
    mutationFn: (payload: PlaceCreateRequest) => updatePlace(placeId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      queryClient.setQueryData(['place', placeId], updated);
      navigate(`/places/${placeId}`);
    }
  });

  if (isEdit && placeQuery.isLoading) return <LoadingState label="Loading place..." />;
  if (isEdit && placeQuery.error) return <ErrorState message="Failed to load place for editing." />;

  const onSubmit = (values: PlaceCreateRequest) => {
    const payload: PlaceCreateRequest = {
      ...values,
      geometry: {
        type: 'Point',
        coordinates: [
          values.geometry?.coordinates?.[0] ?? 0,
          values.geometry?.coordinates?.[1] ?? 0
        ]
      },
      tags: normalizeNumberList(values.tags)
    };
    if (isEdit) return updateMut.mutate(payload);
    return createMut.mutate(payload);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Places</p>
          <h1 className="text-3xl font-bold text-slate-900">{isEdit ? 'Edit place' : 'Create place'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name}>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Phone" error={errors.phoneNumber}>
            <input
              {...register('phoneNumber')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <Field label="Description" error={errors.description}>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening hours" error={errors.openingHours}>
            <input
              {...register('openingHours')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Category ID" error={errors.categoryId}>
            <select
              {...register('categoryId', { valueAsNumber: true, required: 'Category is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            >
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title || cat.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Image URL" error={errors.image}>
            <input
              {...register('image')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Gallery URLs (comma separated)">
            <input
              {...register('gallery')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating" error={errors.rating}>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              {...register('rating', { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Price" error={errors.price}>
            <input
              type="number"
              min={0}
              step={0.01}
              {...register('price', { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Longitude">
            <input
              type="number"
              step="0.000001"
              {...register('geometry.coordinates.0', { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Latitude">
            <input
              type="number"
              step="0.000001"
              {...register('geometry.coordinates.1', { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <Field label="Tags">
          <select
            multiple
            {...register('tags', {
              setValueAs: (vals) =>
                Array.isArray(vals) ? vals.map((v) => Number(v)).filter((n) => !Number.isNaN(n)) : []
            })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          >
            {(tagsQuery.data ?? []).map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.title || tag.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || createMut.isPending || updateMut.isPending}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isEdit ? (updateMut.isPending ? 'Saving...' : 'Save') : createMut.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
};

const Field = ({
  label,
  error,
  children
}: {
  label: string;
  error?: { message?: string };
  children: React.ReactNode;
}) => (
  <label className="space-y-1 text-sm text-slate-700">
    <span className="block font-semibold text-slate-900">{label}</span>
    {children}
    {error?.message && <p className="text-xs font-semibold text-rose-600">{error.message}</p>}
  </label>
);

const normalizeNumberList = (value: number[] | string | null | undefined) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  return [];
};
