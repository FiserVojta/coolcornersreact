import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEvent, fetchEvent, updateEvent } from '../../api/events';
import { fetchCategories } from '../../api/categories';
import { useNavigate, useParams } from 'react-router-dom';
import type { EventCreateRequest } from '../../types/event';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

type FormValues = EventCreateRequest;

export const EventForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const eventId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: isEdit && Number.isFinite(eventId)
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'EVENT'],
    queryFn: () => fetchCategories('EVENT')
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      venue: '',
      startTime: '',
      time: '',
      capacity: 10,
      duration: 60,
      price: 0,
      categoryId: 1
    }
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        venue: data.venue,
        startTime: data.startTime,
        time: '',
        capacity: data.capacity,
        duration: data.duration,
        price: data.price,
        categoryId: data.category?.id ?? 1
      });
    }
  }, [data, reset]);

  const createMut = useMutation({
    mutationFn: (payload: FormValues) => createEvent(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate(`/events/${created.id}`);
    }
  });

  const updateMut = useMutation({
    mutationFn: (payload: FormValues) => updateEvent(eventId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.setQueryData(['event', eventId], updated);
      navigate(`/events/${eventId}`);
    }
  });

  if (isEdit && isLoading) return <LoadingState label="Loading event..." />;
  if (isEdit && error) return <ErrorState message="Failed to load event for editing." />;

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, startTime: values.startTime };
    if (isEdit) {
      return updateMut.mutate(payload);
    }
    return createMut.mutate(payload);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Events</p>
          <h1 className="text-3xl font-bold text-slate-900">{isEdit ? 'Edit event' : 'Create event'}</h1>
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
          <Field label="Venue" error={errors.venue}>
            <input
              {...register('venue', { required: 'Venue is required' })}
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
          <Field label="Start time" error={errors.startTime}>
            <input
              type="datetime-local"
              {...register('startTime', { required: 'Start time is required' })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Duration (minutes)" error={errors.duration}>
            <input
              type="number"
              min={0}
              {...register('duration', { required: 'Duration is required', valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price" error={errors.price}>
            <input
              type="number"
              min={0}
              step="0.01"
              {...register('price', { required: 'Price is required', valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Capacity" error={errors.capacity}>
            <input
              type="number"
              min={1}
              {...register('capacity', { required: 'Capacity is required', valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Category" error={errors.categoryId}>
            <select
              {...register('categoryId', { required: 'Category is required', valueAsNumber: true })}
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
