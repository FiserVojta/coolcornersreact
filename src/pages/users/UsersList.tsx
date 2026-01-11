import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../../api/users';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { UserCard } from '../../components/UserCard';

export const UsersList = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers()
  });

  if (isLoading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message="Unable to load users right now." />;

  const users = data?.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Users</p>
          <h1 className="text-3xl font-bold text-slate-900">Community members</h1>
          <p className="mt-2 text-slate-600">Found {data?.totalItems ?? users.length} users.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </main>
  );
};
