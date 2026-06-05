import { callLegacyAsk, callOptionalLegacyAsk } from './transport';
import type { LegacyBbsBookmarkState, LegacyRequestBody, LegacyRow } from './types';
import { stringValue, toNumber } from './utils';

export async function updateLegacyThreadBookmark(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsBookmarkState> {
  const bid = toNumber(params.bid);
  const tid = toNumber(params.tid);
  const shouldBookmark = Boolean(params.bookmarked ?? params.active);

  await callLegacyAsk(
    {
      ask: shouldBookmark ? 'favorite_add' : 'favorite_remove',
      bid,
      tid,
    },
    signal,
  );

  const [countRows, checkRows] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'favorite_count', bid, tid }, signal),
    callOptionalLegacyAsk({ ask: 'favorite_check', bid, tid }, signal),
  ]);

  return {
    bookmarked: getLegacyFavoriteCheck(checkRows[0], shouldBookmark),
    bookmarks: getLegacyFavoriteCount(countRows[0]) ?? toNumber(params.bookmarks),
  };
}

export function getLegacyFavoriteCheck(row: LegacyRow | undefined, fallback: boolean) {
  if (!row) {
    return fallback;
  }

  const value = row.favorite ?? row.bookmarked ?? row.active ?? row.code;

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallback;
}

export function getLegacyFavoriteCount(row: LegacyRow | undefined) {
  if (!row) {
    return null;
  }

  return toNumber(row.count ?? row.favorite_count ?? row.favorites ?? row.num);
}

export function isLegacyUserCenterFavoriteRow(row: LegacyRow) {
  return stringValue(row.title).trim().length > 0 && toNumber(row.bid) > 0 && toNumber(row.tid) > 0;
}
