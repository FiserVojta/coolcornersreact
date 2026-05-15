import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, updateCurrentUser } from '../../api/users';
import type { UserUpdateRequest } from '../../types/user';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
import { FormField, TextInput } from '../../components/ui/FormField';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export const Profile = () => {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty }
  } = useForm<UserUpdateRequest>({
    defaultValues: { name: '', displayName: '', discordId: '' }
  });

  useEffect(() => {
    if (meQuery.data) {
      reset({
        name: meQuery.data.name ?? '',
        displayName: meQuery.data.displayName ?? '',
        discordId: (meQuery.data as { discordId?: string }).discordId ?? ''
      });
    }
  }, [meQuery.data, reset]);

  const updateMut = useMutation({
    mutationFn: (payload: UserUpdateRequest) => updateCurrentUser(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['currentUser'], updated);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset({
        name: updated.name ?? '',
        displayName: updated.displayName ?? '',
        discordId: (updated as { discordId?: string }).discordId ?? ''
      });
    }
  });

  if (meQuery.isLoading) return <LoadingState label="Loading profile..." />;
  if (meQuery.error || !meQuery.data) return <ErrorState message="Failed to load profile." />;

  const onSubmit = (values: UserUpdateRequest) => {
    updateMut.mutate({
      name: values.name?.trim() ?? '',
      displayName: values.displayName?.trim() ?? '',
      discordId: values.discordId?.trim() ?? ''
    });
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Update how others see you on CoolCorners."
      />

      <SurfaceCard className="mt-8 space-y-6">
        <div>
          <p className="text-xs font-semibold font-label uppercase tracking-[0.2em] text-ink-muted">Email</p>
          <p className="font-display text-lg text-ink-strong">{meQuery.data.email}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField label="Name">
            <TextInput placeholder="Your real name" {...register('name')} />
          </FormField>

          <FormField label="Display name">
            <TextInput placeholder="How your name appears to others" {...register('displayName')} />
          </FormField>

          <FormField label="Discord ID">
            <TextInput placeholder="e.g. username#1234 or numeric id" {...register('discordId')} />
          </FormField>

          {updateMut.isError ? (
            <p className="text-sm font-semibold text-rose-600">Failed to save changes. Please try again.</p>
          ) : null}
          {updateMut.isSuccess && !isDirty ? (
            <p className="text-sm font-semibold text-emerald-600">Profile saved.</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || updateMut.isPending}>
              {updateMut.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </SurfaceCard>
    </PageContainer>
  );
};
