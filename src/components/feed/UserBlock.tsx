import { Link } from 'react-router-dom';
import { useLegacyUserStarRating } from '../../hooks/useLegacyUserStarRating';
import { Avatar } from '../common/Avatar';

type UserBlockProps = {
  id: string;
  rating: string;
  href: string;
};

export function UserBlock({ id, rating, href }: UserBlockProps) {
  const resolvedRating = useLegacyUserStarRating({ fallbackRating: rating, username: id });
  const filledRating = resolvedRating.replace(/☆/g, '').trim();
  const avatarCacheKey = id.trim() ? `username:${id.trim()}` : undefined;

  return (
    <Link
      to={href}
      onClick={(event) => event.stopPropagation()}
      className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-md outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#875A41]"
    >
      <Avatar alt={`${id}的头像`} cacheKey={avatarCacheKey} className="h-11 w-11" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[#875A41] dark:text-white">{id}</div>
        {filledRating ? <div className="mt-1 text-xs text-amber-500 dark:text-white">{filledRating}</div> : null}
      </div>
    </Link>
  );
}
