import type { User } from '../types/user';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl'
};

const getDisplayName = (user: Pick<User, 'displayName' | 'name' | 'firstName' | 'lastName' | 'username'>) =>
  user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User';

const getInitials = (user: Pick<User, 'displayName' | 'name' | 'firstName' | 'lastName' | 'username'>) => {
  const name = getDisplayName(user);
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const Avatar = ({
  user,
  size = 'md',
  className = ''
}: {
  user: Pick<User, 'displayName' | 'name' | 'firstName' | 'lastName' | 'username' | 'profilePictureUrl'>;
  size?: AvatarSize;
  className?: string;
}) => {
  const sizeClass = SIZE_CLASSES[size];
  const base = `flex flex-none items-center justify-center rounded-full overflow-hidden ${sizeClass} ${className}`;

  if (user.profilePictureUrl) {
    return (
      <div className={base}>
        <img
          src={user.profilePictureUrl}
          alt={getDisplayName(user)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${base} bg-brand-100 font-semibold text-brand-700`}>
      {getInitials(user)}
    </div>
  );
};
