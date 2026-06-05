import defaultAvatar from '../../assets/avatar/default-avatar.avif';
import { useCachedImages } from '../../hooks/useCachedImages';
import { useLegacyUserAvatar } from '../../hooks/useLegacyUserAvatar';
import { joinClassNames } from '../../utils/classNames';

type AvatarProps = {
  alt?: string;
  cacheKey?: string;
  className?: string;
  src?: string;
};

export function Avatar({ alt = '用户头像', cacheKey, className, src }: AvatarProps) {
  const cacheNamespace = cacheKey ? `avatar:${cacheKey}` : 'avatar';
  const legacyAvatarSrc = useLegacyUserAvatar({ cacheKey, src });
  const resolvedSrc = legacyAvatarSrc || defaultAvatar;
  const cachedImages = useCachedImages({ namespace: cacheNamespace, sources: [resolvedSrc] });
  const imageSrc = cachedImages[resolvedSrc] ?? resolvedSrc;

  return (
    <span
      className={joinClassNames(
        'block shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-white/10',
        className,
      )}
    >
      <img src={imageSrc} alt={alt} className="h-full w-full object-cover object-center" />
    </span>
  );
}
