import { getCapubbsLegacyXmlApiUrl } from '../bbsNewApiRoutes';
import { writeCachedUserAvatar } from '../../utils/userAvatarCache';
import { LegacyBbsError } from './errors';
import { mapLegacyViewer } from './mappers';
import { abortableSharedPromise } from './abortableSharedPromise';
import type { LegacyBbsViewer, LegacyRow } from './types';
import { normalizeLegacyIcon, stringValue } from './utils';

const cachedLegacyXmlProfileRows = new Map<string, LegacyRow>();
const pendingLegacyXmlProfileRows = new Map<string, Promise<LegacyRow>>();

export async function fetchLegacyXmlUserProfile(
  username: string,
  signal?: AbortSignal,
): Promise<LegacyBbsViewer> {
  return mapLegacyViewer(await fetchLegacyXmlUserProfileRow(username, signal));
}

export async function fetchLegacyXmlUserProfileRow(
  username: string,
  signal?: AbortSignal,
): Promise<LegacyRow> {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return {};
  }

  const cacheKey = normalizedUsername.toLowerCase();
  const cachedProfileRow = cachedLegacyXmlProfileRows.get(cacheKey);

  if (cachedProfileRow) {
    return cachedProfileRow;
  }

  const pendingProfileRow = pendingLegacyXmlProfileRows.get(cacheKey);

  if (pendingProfileRow) {
    return abortableSharedPromise(pendingProfileRow, signal);
  }

  const request = fetchFreshLegacyXmlUserProfileRow(normalizedUsername)
    .then((profileRow) => {
      cachedLegacyXmlProfileRows.set(cacheKey, profileRow);

      return profileRow;
    })
    .finally(() => {
      if (pendingLegacyXmlProfileRows.get(cacheKey) === request) {
        pendingLegacyXmlProfileRows.delete(cacheKey);
      }
    });

  pendingLegacyXmlProfileRows.set(cacheKey, request);
  return abortableSharedPromise(request, signal);
}

export function clearCachedLegacyXmlUserProfileRow(username?: string) {
  const normalizedUsername = username?.trim();

  if (!normalizedUsername) {
    cachedLegacyXmlProfileRows.clear();
    pendingLegacyXmlProfileRows.clear();
    return;
  }

  const cacheKey = normalizedUsername.toLowerCase();

  cachedLegacyXmlProfileRows.delete(cacheKey);
  pendingLegacyXmlProfileRows.delete(cacheKey);
}

async function fetchFreshLegacyXmlUserProfileRow(
  normalizedUsername: string,
): Promise<LegacyRow> {
  const body = new URLSearchParams();
  body.set('view', normalizedUsername);

  const response = await fetch(getCapubbsLegacyXmlApiUrl(), {
    body,
    credentials: 'include',
    headers: {
      Accept: 'application/xml, text/xml, */*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new LegacyBbsError(response.statusText || '旧用户资料接口请求失败', response.status, response.status);
  }

  const profileRow = parseLegacyXmlInfoRow(await response.text());
  const avatar = normalizeLegacyIcon(stringValue(profileRow.icon));

  if (avatar) {
    writeCachedUserAvatar(normalizedUsername, avatar);
  }

  return profileRow;
}

function parseLegacyXmlInfoRow(xmlText: string): LegacyRow {
  if (typeof DOMParser === 'undefined') {
    return {};
  }

  const document = new DOMParser().parseFromString(xmlText, 'application/xml');

  if (document.querySelector('parsererror')) {
    return {};
  }

  const info = document.querySelector('capu > info') ?? document.querySelector('info');

  if (!info) {
    return {};
  }

  return Array.from(info.children).reduce<LegacyRow>((row, element) => {
    row[element.tagName] = element.textContent ?? '';
    return row;
  }, {});
}
