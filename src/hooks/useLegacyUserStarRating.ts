import { useEffect, useState } from 'react';
import { fetchLegacyXmlUserProfile } from '../api/legacyBbsClient/legacyXmlProfile';
import {
  formatUserStarRating,
  getUserStarCacheKey,
  readCachedUserStar,
  writeCachedUserStar,
} from '../utils/userStarCache';

type UseLegacyUserStarRatingOptions = {
  fallbackRating?: string;
  username: string;
};

const pendingUserStarRequests = new Map<string, Promise<number | null>>();

export function useLegacyUserStarRating({
  fallbackRating = '',
  username,
}: UseLegacyUserStarRatingOptions) {
  const normalizedUsername = username.trim();
  const normalizedFallbackRating = fallbackRating.trim();
  const [rating, setRating] = useState(() => getInitialUserStarRating(normalizedUsername, normalizedFallbackRating));

  useEffect(() => {
    let cancelled = false;

    if (!normalizedUsername) {
      setRating(normalizedFallbackRating);
      return () => {
        cancelled = true;
      };
    }

    const cachedStar = readCachedUserStar(normalizedUsername);

    if (cachedStar !== null) {
      setRating(formatUserStarRating(cachedStar));
      return () => {
        cancelled = true;
      };
    }

    setRating(normalizedFallbackRating);
    void fetchCachedUserStar(normalizedUsername).then((star) => {
      if (cancelled) {
        return;
      }

      setRating(star === null ? normalizedFallbackRating : formatUserStarRating(star));
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedFallbackRating, normalizedUsername]);

  return rating;
}

function getInitialUserStarRating(username: string, fallbackRating: string) {
  if (!username) {
    return fallbackRating;
  }

  const cachedStar = readCachedUserStar(username);

  return cachedStar === null ? fallbackRating : formatUserStarRating(cachedStar);
}

function fetchCachedUserStar(username: string) {
  const cacheKey = getUserStarCacheKey(username);
  const pendingRequest = pendingUserStarRequests.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetchLegacyXmlUserProfile(username)
    .then((viewer) => {
      if (!viewer) {
        return null;
      }

      writeCachedUserStar(username, viewer.star);

      return viewer.star;
    })
    .catch(() => null)
    .finally(() => {
      if (pendingUserStarRequests.get(cacheKey) === request) {
        pendingUserStarRequests.delete(cacheKey);
      }
    });

  pendingUserStarRequests.set(cacheKey, request);

  return request;
}
