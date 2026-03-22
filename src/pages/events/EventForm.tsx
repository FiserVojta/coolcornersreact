import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEvent, fetchEvent, updateEvent } from '../../api/events';
import { fetchCategories } from '../../api/categories';
import { useNavigate, useParams } from 'react-router-dom';
import type { EventCreateRequest } from '../../types/event';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/ui/Button';
import { FormField, SelectInput, TextArea, TextInput } from '../../components/ui/FormField';

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
          <FormField label="Name" error={errors.name}>
            <TextInput {...register('name', { required: 'Name is required' })} />
          </FormField>
          <FormField label="Venue" error={errors.venue}>
            <TextInput {...register('venue', { required: 'Venue is required' })} />
          </FormField>
        </div>

        <FormField label="Description" error={errors.description}>
          <TextArea {...register('description', { required: 'Description is required' })} rows={4} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start time" error={errors.startTime}>
            <TextInput type="datetime-local" {...register('startTime', { required: 'Start time is required' })} />
          </FormField>
          <FormField label="Duration (minutes)" error={errors.duration}>
            <TextInput
              type="number"
              min={0}
              {...register('duration', { required: 'Duration is required', valueAsNumber: true })}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Price" error={errors.price}>
            <TextInput
              type="number"
              min={0}
              step="0.01"
              {...register('price', { required: 'Price is required', valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Capacity" error={errors.capacity}>
            <TextInput
              type="number"
              min={1}
              {...register('capacity', { required: 'Capacity is required', valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Category" error={errors.categoryId}>
            <SelectInput
              {...register('categoryId', { required: 'Category is required', valueAsNumber: true })}
            >
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title || cat.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || createMut.isPending || updateMut.isPending}
            className="disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isEdit ? (updateMut.isPending ? 'Saving...' : 'Save') : createMut.isPending ? 'Creating...' : 'Create'}
          </Button>
          <Button
            type="button"
            onClick={() => navigate(-1)}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
};
