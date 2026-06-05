const USER_STAR_CACHE_STORAGE_KEY = 'capubbs-user-star-cache:v1';
const USER_STAR_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type CachedUserStar = {
  cachedAt: number;
  star: number;
};

type UserStarCache = Record<string, CachedUserStar>;

export function getUserStarCacheKey(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeUserStarLevel(value: unknown) {
  const star = Math.floor(Number(value));

  return Number.isFinite(star) ? Math.min(9, Math.max(0, star)) : 0;
}

export function formatUserStarRating(star: unknown) {
  const starLevel = normalizeUserStarLevel(star);

  return starLevel > 0 ? '★'.repeat(starLevel) : '';
}

export function readCachedUserStar(username: string) {
  const cacheKey = getUserStarCacheKey(username);

  if (!cacheKey || typeof window === 'undefined') {
    return null;
  }

  try {
    const cachedValue = readUserStarCache()[cacheKey];

    return cachedValue ? cachedValue.star : null;
  } catch {
    return null;
  }
}

export function writeCachedUserStar(username: string, star: unknown) {
  const cacheKey = getUserStarCacheKey(username);

  if (!cacheKey || typeof window === 'undefined') {
    return;
  }

  try {
    const cache = readUserStarCache();

    cache[cacheKey] = {
      cachedAt: Date.now(),
      star: normalizeUserStarLevel(star),
    };
    window.localStorage.setItem(USER_STAR_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
}

function readUserStarCache(): UserStarCache {
  if (typeof window === 'undefined') {
    return {};
  }

  let parsedCache: unknown;

  try {
    const rawCache = window.localStorage.getItem(USER_STAR_CACHE_STORAGE_KEY);
    parsedCache = rawCache ? JSON.parse(rawCache) : {};
  } catch {
    return {};
  }

  if (!parsedCache || typeof parsedCache !== 'object' || Array.isArray(parsedCache)) {
    return {};
  }

  const now = Date.now();

  return Object.entries(parsedCache).reduce<UserStarCache>((cache, [key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return cache;
    }

    const cachedAt = 'cachedAt' in value && typeof value.cachedAt === 'number' ? value.cachedAt : 0;

    if (now - cachedAt > USER_STAR_CACHE_MAX_AGE_MS) {
      return cache;
    }

    cache[key] = {
      cachedAt,
      star: normalizeUserStarLevel('star' in value ? value.star : 0),
    };

    return cache;
  }, {});
}
