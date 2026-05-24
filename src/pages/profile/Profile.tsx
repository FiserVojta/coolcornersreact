import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchCurrentUser, unfollowUsers, updateCurrentUser } from '../../api/users';
import { uploadFile } from '../../api/files';
import type { User, UserUpdateRequest } from '../../types/user';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
import { FormField, TextArea, TextInput } from '../../components/ui/FormField';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { Avatar } from '../../components/Avatar';

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
    defaultValues: { name: '', displayName: '', discordId: '', introduction: '' }
  });

  useEffect(() => {
    if (meQuery.data) {
      reset({
        name: meQuery.data.name ?? '',
        displayName: meQuery.data.displayName ?? '',
        discordId: (meQuery.data as { discordId?: string }).discordId ?? '',
        introduction: meQuery.data.introduction ?? ''
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
        discordId: (updated as { discordId?: string }).discordId ?? '',
        introduction: updated.introduction ?? ''
      });
    }
  });

  const unfollowMut = useMutation({
    mutationFn: (userId: number) => unfollowUsers({ userIds: [userId] }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['currentUser'], updated);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadAvatarMut = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadFile(file);
      const fileId = uploaded.id != null ? Number(uploaded.id) : NaN;
      if (!Number.isFinite(fileId)) {
        throw new Error('Upload did not return a file id');
      }
      return updateCurrentUser({ profilePictureFileId: fileId });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['currentUser'], updated);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setUploadError(null);
    },
    onError: () => setUploadError('Failed to upload photo. Please try again.')
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    uploadAvatarMut.mutate(file);
  };

  if (meQuery.isLoading) return <LoadingState label="Loading profile..." />;
  if (meQuery.error || !meQuery.data) return <ErrorState message="Failed to load profile." />;

  const onSubmit = (values: UserUpdateRequest) => {
    updateMut.mutate({
      name: values.name?.trim() ?? '',
      displayName: values.displayName?.trim() ?? '',
      discordId: values.discordId?.trim() ?? '',
      introduction: values.introduction?.trim() ?? ''
    });
  };

  const following = meQuery.data.followers ?? [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Update how others see you on CoolCorners."
      />

      <SurfaceCard className="mt-8 space-y-6">
        <div className="flex items-center gap-5">
          <Avatar user={meQuery.data} size="xl" />
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMut.isPending}
            >
              {uploadAvatarMut.isPending ? 'Uploading...' : meQuery.data.profilePictureUrl ? 'Change photo' : 'Upload photo'}
            </Button>
            {uploadError ? (
              <p className="text-xs font-semibold text-rose-600">{uploadError}</p>
            ) : (
              <p className="text-xs text-ink-muted">PNG or JPG, square images look best.</p>
            )}
          </div>
        </div>

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

          <FormField label="Self introduction">
            <TextArea
              rows={4}
              placeholder="Tell the community a bit about yourself..."
              {...register('introduction')}
            />
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

      <SurfaceCard className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-strong">Following</h2>
          <span className="text-sm font-label text-ink-muted">{following.length}</span>
        </div>

        {unfollowMut.isError ? (
          <p className="text-sm font-semibold text-rose-600">Failed to unfollow. Please try again.</p>
        ) : null}

        {following.length === 0 ? (
          <p className="text-sm text-ink-muted">You are not following anyone yet.</p>
        ) : (
          <ul className="space-y-2">
            {following.map((followed) => (
              <li
                key={followed.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-brand-50 bg-brand-50 px-3 py-2"
              >
                <Link
                  to={`/users/${followed.id}`}
                  className="flex min-w-0 items-center gap-3 transition hover:text-brand-700"
                >
                  <Avatar user={followed} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold font-label text-ink-strong">{getDisplayName(followed)}</p>
                  </div>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => unfollowMut.mutate(followed.id)}
                  disabled={unfollowMut.isPending && unfollowMut.variables === followed.id}
                >
                  {unfollowMut.isPending && unfollowMut.variables === followed.id ? 'Unfollowing...' : 'Unfollow'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>
    </PageContainer>
  );
};

const getDisplayName = (user: User) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User';
