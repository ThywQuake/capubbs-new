import { useEffect, useMemo, useState } from 'react';
import { fetchLegacyXmlUserProfile } from '../api/legacyBbsClient/legacyXmlProfile';
import { readCachedUserAvatar, writeCachedUserAvatar } from '../utils/userAvatarCache';

type UseLegacyUserAvatarOptions = {
  cacheKey?: string;
  src?: string;
};

const USERNAME_CACHE_KEY_PREFIX = 'username:';
const pendingAvatarRequests = new Map<string, Promise<string>>();

export function useLegacyUserAvatar({ cacheKey, src }: UseLegacyUserAvatarOptions) {
  const explicitSrc = src?.trim() ?? '';
  const username = useMemo(() => getUsernameFromAvatarCacheKey(cacheKey), [cacheKey]);
  const [avatarSrc, setAvatarSrc] = useState(() => explicitSrc || (username ? readCachedUserAvatar(username) ?? '' : ''));

  useEffect(() => {
    let cancelled = false;

    if (explicitSrc) {
      if (username) {
        writeCachedUserAvatar(username, explicitSrc);
      }

      setAvatarSrc(explicitSrc);
      return () => {
        cancelled = true;
      };
    }

    if (!username) {
      setAvatarSrc('');
      return () => {
        cancelled = true;
      };
    }

    const cachedAvatar = readCachedUserAvatar(username);

    if (cachedAvatar) {
      setAvatarSrc(cachedAvatar);
      return () => {
        cancelled = true;
      };
    }

    setAvatarSrc('');
    void fetchCachedUserAvatar(username).then((nextAvatarSrc) => {
      if (!cancelled && nextAvatarSrc) {
        setAvatarSrc(nextAvatarSrc);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [explicitSrc, username]);

  return avatarSrc;
}

function getUsernameFromAvatarCacheKey(cacheKey: string | undefined) {
  const value = cacheKey?.trim() ?? '';

  return value.startsWith(USERNAME_CACHE_KEY_PREFIX) ? value.slice(USERNAME_CACHE_KEY_PREFIX.length).trim() : '';
}

function fetchCachedUserAvatar(username: string) {
  const cacheKey = username.toLowerCase();
  const pendingRequest = pendingAvatarRequests.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetchLegacyXmlUserProfile(username)
    .then((viewer) => {
      const avatar = viewer?.avatar.trim() ?? '';

      if (avatar) {
        writeCachedUserAvatar(username, avatar);
      }

      return avatar;
    })
    .catch(() => '')
    .finally(() => {
      if (pendingAvatarRequests.get(cacheKey) === request) {
        pendingAvatarRequests.delete(cacheKey);
      }
    });

  pendingAvatarRequests.set(cacheKey, request);

  return request;
}
