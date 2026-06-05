import { getLegacyForumBoardByBid } from '../../data/forumBoards';
import { getPublicProfilePath } from '../../utils/userRoutes';
import { legacyGetPunishmentRecords, type LegacyPunishmentRecord } from '../legacyBbsApi';
import { callOptionalLegacyAsk } from './transport';
import type { LegacyRow } from './types';
import { formatLegacyTimestamp, stringValue, toNumber } from './utils';

export type LegacyDataDisplayMetricId =
  | 'checkinRanking'
  | 'checkins'
  | 'online'
  | 'peakOnline'
  | 'punishments'
  | 'replies'
  | 'topics';

export type LegacyDataDisplayPanel = 'checkin-ranking' | 'checkins' | 'online' | 'punishments';

export type LegacyDataDisplayMetric = {
  id: LegacyDataDisplayMetricId;
  label: string;
  value: string;
};

export type LegacyDataDisplayOnlineUser = {
  boardId: number | null;
  href: string;
  id: string;
  location: string;
  loginType: string;
  recentActiveAt: string;
};

export type LegacyDataDisplayCheckinRecord = {
  href: string;
  id: string;
  rank: number;
};

export type LegacyDataDisplayCheckinRankingRecord = {
  href: string;
  id: string;
  rank: number;
  totalCheckins: number;
};

export type LegacyDataDisplayPunishmentRecord = LegacyPunishmentRecord & {
  href: string;
};

export type LegacyDataDisplayData = {
  checkinRankingRecords: LegacyDataDisplayCheckinRankingRecord[];
  checkinRecords: LegacyDataDisplayCheckinRecord[];
  metrics: LegacyDataDisplayMetric[];
  onlineUsers: LegacyDataDisplayOnlineUser[];
  punishmentRecords: LegacyDataDisplayPunishmentRecord[];
  updatedAt: string;
};

type FetchLegacyDataDisplayOptions = {
  date?: string;
  onlineBoardId?: number | null;
  panel?: LegacyDataDisplayPanel;
};

type NormalizedFetchLegacyDataDisplayOptions = {
  date?: string;
  onlineBoardId: number | null;
  panel: LegacyDataDisplayPanel;
};

const pendingDataDisplayRequests = new Map<string, Promise<LegacyDataDisplayData>>();

export async function fetchLegacyDataDisplay(
  options: FetchLegacyDataDisplayOptions = {},
  signal?: AbortSignal,
): Promise<LegacyDataDisplayData> {
  const normalizedOptions = normalizeFetchLegacyDataDisplayOptions(options);
  const requestKey = getDataDisplayRequestKey(normalizedOptions);
  let request = pendingDataDisplayRequests.get(requestKey);

  if (!request) {
    request = fetchLegacyDataDisplayOnce(normalizedOptions)
      .finally(() => {
        if (pendingDataDisplayRequests.get(requestKey) === request) {
          pendingDataDisplayRequests.delete(requestKey);
        }
      });
    pendingDataDisplayRequests.set(requestKey, request);
  }

  return withAbortSignal(request, signal);
}

async function fetchLegacyDataDisplayOnce(
  options: NormalizedFetchLegacyDataDisplayOptions,
): Promise<LegacyDataDisplayData> {
  const panel = options.panel;
  const onlineRows = panel === 'online'
    ? await callOptionalLegacyAsk({ ask: 'online' })
    : [];
  const checkinRows = panel === 'checkins'
    ? await callOptionalLegacyAsk({ ask: 'sign_today', view: options.date })
    : [];
  const signUserRows = panel === 'checkin-ranking'
    ? await callOptionalLegacyAsk({ ask: 'sign_user' })
    : [];
  const punishmentRecords = panel === 'punishments'
    ? await fetchDataDisplayPunishments()
    : [];
  const checkinRankingRecords = signUserRows
    .map(mapCheckinRankingRecord)
    .filter((record): record is LegacyDataDisplayCheckinRankingRecord => Boolean(record));
  const onlineUsers = onlineRows
    .map(mapOnlineUser)
    .filter((record): record is LegacyDataDisplayOnlineUser => Boolean(record))
    .filter((record) => !options.onlineBoardId || record.boardId === options.onlineBoardId);
  const checkinRecords = mapCheckinRecords(checkinRows);
  const metrics = buildMetrics({
    checkinRankingCount: checkinRankingRecords.length,
    checkinCount: checkinRecords.length,
    isDateFiltered: Boolean(options.date),
    isOnlineBoardFiltered: Boolean(options.onlineBoardId),
    onlineCount: onlineUsers.length,
    panel,
    punishmentCount: punishmentRecords.length,
  });

  return {
    checkinRankingRecords,
    checkinRecords,
    metrics,
    onlineUsers,
    punishmentRecords,
    updatedAt: formatLegacyTimestamp(Date.now()),
  };
}

function normalizeFetchLegacyDataDisplayOptions(
  options: FetchLegacyDataDisplayOptions,
): NormalizedFetchLegacyDataDisplayOptions {
  const onlineBoardId = Number(options.onlineBoardId);
  const date = options.date?.trim();

  return {
    date: date || undefined,
    onlineBoardId: Number.isInteger(onlineBoardId) && onlineBoardId > 0 ? onlineBoardId : null,
    panel: options.panel ?? 'online',
  };
}

function getDataDisplayRequestKey(options: NormalizedFetchLegacyDataDisplayOptions) {
  return [
    options.panel,
    options.date ?? '',
    options.onlineBoardId ?? '',
  ].join('|');
}

function withAbortSignal<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return request;
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise((resolve, reject) => {
    const handleAbort = () => reject(createAbortError());

    signal.addEventListener('abort', handleAbort, { once: true });
    request.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', handleAbort);
    });
  });
}

function createAbortError() {
  return new DOMException('请求已取消', 'AbortError');
}

function mapOnlineUser(row: LegacyRow): LegacyDataDisplayOnlineUser | null {
  const username = stringValue(row.username).trim();

  if (!username) {
    return null;
  }

  const boardId = toNumber(row.nowboard, 0);

  return {
    boardId: boardId > 0 ? boardId : null,
    href: getPublicProfilePath(username),
    id: username,
    location: getOnlineLocation(boardId),
    loginType: formatLoginType(row.onlinetype),
    recentActiveAt: formatLegacyTimestamp(row.tokentime),
  };
}

function mapCheckinRecords(rows: LegacyRow[]) {
  const seenUsernames = new Set<string>();
  const records: LegacyDataDisplayCheckinRecord[] = [];

  rows.forEach((row) => {
    const username = stringValue(row.username).trim();
    const normalizedUsername = username.toLowerCase();

    if (!username || seenUsernames.has(normalizedUsername)) {
      return;
    }

    seenUsernames.add(normalizedUsername);
    records.push({
      href: getPublicProfilePath(username),
      id: username,
      rank: records.length + 1,
    });
  });

  return records;
}

function mapCheckinRankingRecord(row: LegacyRow, index: number): LegacyDataDisplayCheckinRankingRecord | null {
  const username = stringValue(row.username).trim();

  if (!username) {
    return null;
  }

  const rank = toNumber(row.number, index + 1);

  return {
    href: getPublicProfilePath(username),
    id: username,
    rank: rank > 0 ? rank : index + 1,
    totalCheckins: toNumber(row.times),
  };
}

function buildMetrics({
  checkinRankingCount,
  checkinCount,
  isDateFiltered,
  isOnlineBoardFiltered,
  onlineCount,
  panel,
  punishmentCount,
}: {
  checkinRankingCount: number;
  checkinCount: number;
  isDateFiltered: boolean;
  isOnlineBoardFiltered: boolean;
  onlineCount: number;
  panel: LegacyDataDisplayPanel;
  punishmentCount: number;
}): LegacyDataDisplayMetric[] {
  const metrics: LegacyDataDisplayMetric[] = [];

  if (panel === 'online') {
    metrics.push({
      id: 'online',
      label: '当前在线',
      value: `${onlineCount} 人`,
    });
  }

  if (panel === 'checkins') {
    metrics.push({
      id: 'checkins',
      label: isDateFiltered ? '签到人数' : '今日签到',
      value: `${checkinCount} 人`,
    });
  }

  if (panel === 'checkin-ranking') {
    metrics.push({
      id: 'checkinRanking',
      label: '签到排行',
      value: `${checkinRankingCount} 人`,
    });
  }

  if (panel === 'punishments') {
    metrics.push({
      id: 'punishments',
      label: '罚跑记录',
      value: `${punishmentCount} 条`,
    });
  }

  return metrics;
}

async function fetchDataDisplayPunishments(signal?: AbortSignal): Promise<LegacyDataDisplayPunishmentRecord[]> {
  try {
    const records = await legacyGetPunishmentRecords(undefined, signal);

    return records
      .map((record) => ({
        ...record,
        href: getPublicProfilePath(record.username),
      }))
      .sort(comparePunishmentsByNewestFirst);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return [];
  }
}

function comparePunishmentsByNewestFirst(
  left: LegacyDataDisplayPunishmentRecord,
  right: LegacyDataDisplayPunishmentRecord,
) {
  const dateDiff = Date.parse(right.startDate) - Date.parse(left.startDate);

  if (Number.isFinite(dateDiff) && dateDiff !== 0) {
    return dateDiff;
  }

  return toNumber(right.id) - toNumber(left.id);
}

function getOnlineLocation(boardId: number) {
  if (boardId <= 0) {
    return '论坛在线';
  }

  return getLegacyForumBoardByBid(boardId)?.name ?? `版面 ${boardId}`;
}

function formatLoginType(value: unknown) {
  const normalizedType = stringValue(value).trim().toLowerCase();

  if (normalizedType === 'web') {
    return '网页版';
  }

  if (normalizedType === 'android') {
    return 'Android 客户端';
  }

  if (normalizedType === 'ios') {
    return 'iOS 客户端';
  }

  return normalizedType || '未知';
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}
