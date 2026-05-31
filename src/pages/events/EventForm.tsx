import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEvent, fetchEvent, updateEvent } from '../../api/events';
import { fetchCategories } from '../../api/categories';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { EventCreateRequest } from '../../types/event';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import '../../styles/create-form.css';

type FormValues = EventCreateRequest;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatEventDate = (value?: string | null) => {
  if (!value) return 'Date TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date TBD';
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const firstSentence = (text?: string | null) => {
  const first = (text?.split('. ')[0] ?? '').trim();
  return first ? first.replace(/\.?$/, '.') : 'Add a description…';
};

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
    watch,
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

  const categories = categoriesQuery.data ?? [];
  const watchedName = watch('name');
  const watchedVenue = watch('venue');
  const watchedDescription = watch('description');
  const watchedStart = watch('startTime');
  const watchedDuration = watch('duration');
  const watchedPrice = watch('price');
  const watchedCapacity = watch('capacity');
  const watchedCategoryId = watch('categoryId');
  const activeCategory = categories.find((cat) => cat.id === Number(watchedCategoryId));
  const categoryLabel = activeCategory?.title || activeCategory?.name || 'Uncategorised';
  const priceNumber = Number(watchedPrice);

  return (
    <main className="cf-page">
      <p className="crumbs">
        <Link to="/events">Events</Link>
        <span className="sep">/</span>
        <span className="here">{isEdit ? 'Edit' : 'New'}</span>
      </p>
      <p className="page-eyebrow">Events</p>
      <h1 className="page-h1">{isEdit ? 'Edit event' : 'Create event'}</h1>
      <p className="page-desc">Add a one-off happening for the community to join. You can save and edit the details any time after.</p>

      <form className="split" onSubmit={handleSubmit(onSubmit)}>
        {/* LEFT: the form */}
        <div className="stack">
          {/* 1 · Basics */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">1</span>
              <h3>Basics</h3>
            </div>
            <div className="panel-body">
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Event name</span>
                  <input className="input" placeholder="Name your event" {...register('name', { required: 'Name is required' })} />
                  {errors.name?.message && <p className="field-error">{errors.name.message}</p>}
                </label>
                <label className="field">
                  <span className="field-label">Venue</span>
                  <input className="input" placeholder="Where it happens" {...register('venue', { required: 'Venue is required' })} />
                  {errors.venue?.message && <p className="field-error">{errors.venue.message}</p>}
                </label>
              </div>
              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="What's the event and who is it for."
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description?.message && <p className="field-error">{errors.description.message}</p>}
              </label>
              <label className="field">
                <span className="field-label">Category</span>
                <select
                  className="select-native"
                  {...register('categoryId', { required: 'Category is required', valueAsNumber: true })}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title || cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId?.message && <p className="field-error">{errors.categoryId.message}</p>}
              </label>
            </div>
          </section>

          {/* 2 · When */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">2</span>
              <h3>When &amp; how long</h3>
            </div>
            <div className="panel-body">
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Start</span>
                  <input
                    className="input"
                    type="datetime-local"
                    {...register('startTime', { required: 'Start time is required' })}
                  />
                  {errors.startTime?.message && <p className="field-error">{errors.startTime.message}</p>}
                </label>
                <label className="field">
                  <span className="field-label">Duration (minutes)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    {...register('duration', { required: 'Duration is required', valueAsNumber: true })}
                  />
                  {errors.duration?.message && <p className="field-error">{errors.duration.message}</p>}
                </label>
              </div>
            </div>
          </section>

          {/* 3 · Tickets */}
          <section className="panel">
            <div className="panel-head">
              <span className="n">3</span>
              <h3>Tickets</h3>
            </div>
            <div className="panel-body">
              <div className="grid-2">
                <div className="field">
                  <span className="field-label">Price</span>
                  <div className="affix">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      {...register('price', { required: 'Price is required', valueAsNumber: true })}
                    />
                    <span className="suf">Kč</span>
                  </div>
                  {errors.price?.message ? (
                    <p className="field-error">{errors.price.message}</p>
                  ) : (
                    <p className="field-hint">Set to 0 for a free event.</p>
                  )}
                </div>
                <div className="field">
                  <span className="field-label">Capacity</span>
                  <div className="affix">
                    <input
                      type="number"
                      min={1}
                      {...register('capacity', { required: 'Capacity is required', valueAsNumber: true })}
                    />
                    <span className="suf">spots</span>
                  </div>
                  {errors.capacity?.message ? (
                    <p className="field-error">{errors.capacity.message}</p>
                  ) : (
                    <p className="field-hint">How many people can join.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="form-actions">
            <span className="draft-note">Saved as a draft until you publish.</span>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || createMut.isPending || updateMut.isPending}
            >
              {isEdit ? (updateMut.isPending ? 'Saving…' : 'Save event') : createMut.isPending ? 'Creating…' : 'Create event'}
            </button>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <aside className="preview-rail">
          <p className="preview-label">
            <span className="live" /> Live preview
          </p>
          <div className="pv-card">
            <div className="pv-img event">
              <span className="pv-chip tl">{formatEventDate(watchedStart)}</span>
              <span className="pv-chip tr">0/{watchedCapacity || '—'} joined</span>
            </div>
            <div className="pv-body">
              <h3 className="pv-title">{watchedName || 'Untitled event'}</h3>
              <p className="pv-meta">{watchedVenue || 'Venue TBD'}</p>
              <p className="pv-desc">{firstSentence(watchedDescription)}</p>
              <div className="pv-foot">
                <span className="pv-price">{!priceNumber ? 'Free' : `${priceNumber} Kč`}</span>
                <span className="pv-cap">
                  {watchedDuration || '—'} min · {categoryLabel}
                </span>
              </div>
            </div>
          </div>
          <p className="preview-tip">
            This is how the event appears on the events list and in search results as you fill the form.
          </p>
        </aside>
      </form>
    </main>
  );
};
