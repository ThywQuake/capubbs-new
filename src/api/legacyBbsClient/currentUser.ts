import { clearLegacyTokenCookie, hasLegacyToken, readLegacyToken } from './authSession';
import { readCachedUserAvatar, writeCachedUserAvatar } from '../../utils/userAvatarCache';
import { LegacyBbsError } from './errors';
import { isSameLegacyUsername, mapLegacyViewer } from './mappers';
import { fetchLegacyXmlUserProfileRow } from './legacyXmlProfile';
import { callLegacyAsk, callOptionalLegacyAsk } from './transport';
import { abortableSharedPromise } from './abortableSharedPromise';
import type { LegacyBbsSessionViewerResponse, LegacyRow } from './types';
import { isAbortError, isRecord, normalizeLegacyIcon, stringValue, toNumber } from './utils';

const CURRENT_USER_PARAMS = { ask: 'currentUserInfo' } as const;
const CURRENT_USER_FALLBACK_PARAMS = { ask: 'getuser' } as const;
const SESSION_UPDATE_PARAMS = { ask: 'update' } as const;
const CURRENT_USER_CACHE_STORAGE_KEY = 'capubbs-current-user-cache:v1';
const pendingCurrentUserRows = new Map<string, Promise<LegacyRow[]>>();

export async function callCachedOrOptionalLegacyCurrentUser(signal?: AbortSignal) {
  const cachedRows = readCachedLegacyCurrentUserRows();

  if (cachedRows) {
    return abortableSharedPromise(enrichLegacyCurrentUserRows(cachedRows), signal);
  }

  if (hasLegacyToken()) {
    return callLegacyCurrentUser(signal).catch((error: unknown) => {
      if (isAbortError(error)) {
        throw error;
      }

      return [];
    });
  }

  return callOptionalLegacyCurrentUser(signal);
}

export async function callCachedOrLegacyCurrentUser(signal?: AbortSignal) {
  const cachedRows = readCachedLegacyCurrentUserRows();

  if (cachedRows) {
    return abortableSharedPromise(enrichLegacyCurrentUserRows(cachedRows), signal);
  }

  return callLegacyCurrentUser(signal);
}

export async function callOptionalLegacyCurrentUser(signal?: AbortSignal) {
  return abortableSharedPromise(fetchSharedLegacyCurrentUserRows('optional', false), signal);
}

export async function callLegacyCurrentUser(signal?: AbortSignal) {
  return abortableSharedPromise(fetchSharedLegacyCurrentUserRows('required', true), signal);
}

export async function fetchLegacySessionViewer(signal?: AbortSignal): Promise<LegacyBbsSessionViewerResponse> {
  const hadStoredToken = hasLegacyToken();
  const rows = await callLegacyCurrentUser(signal).catch((error: unknown) => {
    if (isAbortError(error)) {
      throw error;
    }

    if (hadStoredToken && isLegacyAuthSessionError(error)) {
      clearCachedLegacyCurrentUserRows();
      clearLegacyTokenCookie();

      return [];
    }

    throw error;
  });
  const viewer = mapLegacyViewer(rows[0]);

  if (hadStoredToken && !viewer) {
    clearCachedLegacyCurrentUserRows();
    clearLegacyTokenCookie();
  }

  return {
    viewer,
    unread: {
      total: toNumber(rows[0]?.newmsg),
    },
  };
}

function fetchOptionalLegacyCurrentUserRows(signal?: AbortSignal) {
  return fetchLegacyCurrentUserRows(signal, true);
}

async function fetchLegacyCurrentUserRows(signal?: AbortSignal, optional = false) {
  const rows = optional
    ? await callOptionalLegacyAsk(CURRENT_USER_PARAMS, signal)
    : await callLegacyAsk(CURRENT_USER_PARAMS, signal).catch(async (error: unknown) => {
        if (isAbortError(error)) {
          throw error;
        }

        if (!hasLegacyToken()) {
          throw error;
        }

        return callLegacyAsk(CURRENT_USER_FALLBACK_PARAMS, signal);
      });

  if (hasUsableCurrentUserRow(rows) || !hasLegacyToken()) {
    return rows;
  }

  const fallbackRows = await callOptionalLegacyAsk(CURRENT_USER_FALLBACK_PARAMS, signal);

  if (hasUsableCurrentUserRow(fallbackRows) || !hasLegacyToken()) {
    return fallbackRows;
  }

  return optional
    ? callOptionalLegacyAsk(SESSION_UPDATE_PARAMS, { signal })
    : callLegacyAsk(SESSION_UPDATE_PARAMS, { signal });
}

export function clearCachedLegacyCurrentUserRows() {
  pendingCurrentUserRows.clear();

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(CURRENT_USER_CACHE_STORAGE_KEY);
  } catch {
    return;
  }
}

async function fetchSharedLegacyCurrentUserRows(
  mode: 'optional' | 'required',
  clearWhenEmpty: boolean,
) {
  const requestKey = getCurrentUserRequestKey(mode);
  const pendingRows = pendingCurrentUserRows.get(requestKey);

  if (pendingRows) {
    return pendingRows;
  }

  const request = (async () => {
    const rows = await enrichLegacyCurrentUserRows(
      mode === 'optional'
        ? await fetchOptionalLegacyCurrentUserRows()
        : await fetchLegacyCurrentUserRows(),
    );

    cacheLegacyCurrentUserRows(rows, clearWhenEmpty);

    return rows;
  })().finally(() => {
    if (pendingCurrentUserRows.get(requestKey) === request) {
      pendingCurrentUserRows.delete(requestKey);
    }
  });

  pendingCurrentUserRows.set(requestKey, request);
  return request;
}

function getCurrentUserRequestKey(mode: 'optional' | 'required') {
  return `${mode}:${readLegacyToken() || 'guest'}`;
}

function readCachedLegacyCurrentUserRows() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = readLegacyToken();

  if (!token) {
    return null;
  }

  try {
    const rawCache = window.localStorage.getItem(CURRENT_USER_CACHE_STORAGE_KEY);
    const cachedValue: unknown = rawCache ? JSON.parse(rawCache) : null;

    if (!isRecord(cachedValue) || cachedValue.token !== token || !Array.isArray(cachedValue.rows)) {
      return null;
    }

    const rows = cachedValue.rows.filter(isLegacyRow);

    return hasUsableCurrentUserRow(rows) ? rows : null;
  } catch {
    return null;
  }
}

function cacheLegacyCurrentUserRows(rows: LegacyRow[], clearWhenEmpty = false) {
  if (hasUsableCurrentUserRow(rows)) {
    cacheLegacyCurrentUserAvatar(rows[0]);
    writeCachedLegacyCurrentUserRows(rows);
    return;
  }

  if (clearWhenEmpty) {
    clearCachedLegacyCurrentUserRows();
  }
}

function writeCachedLegacyCurrentUserRows(rows: LegacyRow[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const token = readLegacyToken();

  if (!token) {
    return;
  }

  try {
    window.localStorage.setItem(
      CURRENT_USER_CACHE_STORAGE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        rows,
        token,
      }),
    );
  } catch {
    return;
  }
}

function isLegacyRow(value: unknown): value is LegacyRow {
  return isRecord(value) && !Array.isArray(value);
}

async function enrichLegacyCurrentUserRows(rows: LegacyRow[], signal?: AbortSignal): Promise<LegacyRow[]> {
  const currentUserRow = rows[0];

  if (!shouldFetchLegacyCurrentUserProfile(currentUserRow)) {
    return rows;
  }

  const username = stringValue(currentUserRow.username).trim();
  const cachedAvatar = readCachedUserAvatar(username);
  const avatarEnrichedUserRow = cachedAvatar && !stringValue(currentUserRow.icon).trim()
    ? {
        ...currentUserRow,
        icon: cachedAvatar,
      }
    : currentUserRow;

  let profileRow: LegacyRow;

  try {
    profileRow = await fetchLegacyXmlUserProfileRow(username, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    profileRow = {};
  }

  const profileUsername = stringValue(profileRow.username).trim();
  const canUseProfileRow = !profileUsername || isSameLegacyUsername(profileUsername, username);
  const enrichedRows = [
    canUseProfileRow ? mergeLegacyCurrentUserProfileRow(avatarEnrichedUserRow, profileRow) : avatarEnrichedUserRow,
    ...rows.slice(1),
  ];

  cacheLegacyCurrentUserRows(enrichedRows);

  return enrichedRows;
}

function shouldFetchLegacyCurrentUserProfile(row: LegacyRow | undefined) {
  if (!row || !stringValue(row.username).trim()) {
    return false;
  }

  return !hasLegacyCurrentUserProfileFields(row);
}

function hasLegacyCurrentUserProfileFields(row: LegacyRow) {
  return [
    row.hobby,
    row.intro,
    row.qq,
    row.mail,
    row.email,
    row.place,
    row.location,
    row.regdate,
    row.lastdate,
    row.post,
    row.reply,
    row.star,
    row.sig1,
    row.sig2,
    row.sig3,
    row.water,
    row.sign,
    row.userid,
  ].some((value) => stringValue(value).trim().length > 0);
}

function cacheLegacyCurrentUserAvatar(row: LegacyRow | undefined) {
  const username = stringValue(row?.username).trim();
  const avatar = normalizeLegacyIcon(stringValue(row?.icon));

  if (username && avatar) {
    writeCachedUserAvatar(username, avatar);
  }
}

function mergeLegacyCurrentUserProfileRow(row: LegacyRow, profileRow: LegacyRow): LegacyRow {
  const mergedRow: LegacyRow = {
    ...profileRow,
    ...row,
  };

  Object.entries(profileRow).forEach(([key, value]) => {
    if (!hasMeaningfulLegacyValue(mergedRow[key]) && hasMeaningfulLegacyValue(value)) {
      mergedRow[key] = value;
    }
  });

  return mergedRow;
}

function hasMeaningfulLegacyValue(value: unknown) {
  return stringValue(value).trim().length > 0;
}

function hasUsableCurrentUserRow(rows: LegacyRow[]) {
  return rows.some((row) => stringValue(row.username).trim().length > 0);
}

function isLegacyAuthSessionError(error: unknown) {
  return error instanceof LegacyBbsError && (error.status === 401 || error.code === 1000 || error.code === 1001);
}
