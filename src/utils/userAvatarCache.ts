import { getCapubbsPublicAssetUrl } from '../api/bbsNewApiRoutes';

const USER_AVATAR_CACHE_STORAGE_KEY = 'capubbs-user-avatar-url-cache:v1';

type CachedUserAvatar = {
  avatar: string;
  cachedAt: number;
};

type UserAvatarCache = Record<string, CachedUserAvatar>;

export function getUserAvatarCacheKey(username: string) {
  return username.trim().toLowerCase();
}

export function readCachedUserAvatar(username: string) {
  const cacheKey = getUserAvatarCacheKey(username);

  if (!cacheKey || typeof window === 'undefined') {
    return null;
  }

  try {
    const cachedValue = readUserAvatarCache()[cacheKey];

    return cachedValue?.avatar || null;
  } catch {
    return null;
  }
}

export function writeCachedUserAvatar(username: string, avatar: string) {
  const cacheKey = getUserAvatarCacheKey(username);
  const normalizedAvatar = normalizeCachedUserAvatar(avatar);

  if (!cacheKey || !shouldCacheUserAvatar(normalizedAvatar) || typeof window === 'undefined') {
    return;
  }

  try {
    const cache = readUserAvatarCache();

    cache[cacheKey] = {
      avatar: normalizedAvatar,
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(USER_AVATAR_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
}

function readUserAvatarCache(): UserAvatarCache {
  if (typeof window === 'undefined') {
    return {};
  }

  let parsedCache: unknown;

  try {
    const rawCache = window.localStorage.getItem(USER_AVATAR_CACHE_STORAGE_KEY);
    parsedCache = rawCache ? JSON.parse(rawCache) : {};
  } catch {
    return {};
  }

  if (!parsedCache || typeof parsedCache !== 'object' || Array.isArray(parsedCache)) {
    return {};
  }

  return Object.entries(parsedCache).reduce<UserAvatarCache>((cache, [key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return cache;
    }

    const avatar = normalizeCachedUserAvatar(
      'avatar' in value && typeof value.avatar === 'string' ? value.avatar : '',
    );

    if (!shouldCacheUserAvatar(avatar)) {
      return cache;
    }

    cache[key] = {
      avatar,
      cachedAt: 'cachedAt' in value && typeof value.cachedAt === 'number' ? value.cachedAt : 0,
    };

    return cache;
  }, {});
}

function shouldCacheUserAvatar(avatar: string) {
  return /^(https?:)?\/\//i.test(avatar) || avatar.startsWith('/bbsimg/');
}

function normalizeCachedUserAvatar(avatar: string) {
  const value = avatar.trim();

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('/bbsimg/')) {
    return getCapubbsPublicAssetUrl(value);
  }

  return value;
}
