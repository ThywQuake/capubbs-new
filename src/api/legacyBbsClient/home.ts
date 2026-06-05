import {
  HOME_FEED_CANDIDATE_BATCH_SIZE,
  HOME_FEED_MAX_ITEMS,
  sortHomeLatestReplies,
  sortHomeLatestTopics,
  uniqueHomeThreads,
} from '../homeFeedRanking';
import { legacyForumBoards } from '../../data/forumBoards';
import { syncLegacyTokenCookie } from './authSession';
import { fetchLegacyCalendarEvents } from './calendar';
import { callCachedOrOptionalLegacyCurrentUser } from './currentUser';
import { getBoardForBid, isLegacyThreadRow, mapLegacyThreadItem, mapLegacyViewer } from './mappers';
import { callOptionalLegacyAsk } from './transport';
import { hydrateTruncatedLegacyThreadTitles } from './threadTitles';
import type {
  LegacyBbsActivityBanner,
  LegacyBbsBoardSummary,
  LegacyBbsBootstrapResponse,
  LegacyBbsHomeFeedBundle,
  LegacyBbsHomeFeedName,
  LegacyBbsHomeFeedResponse,
  LegacyBbsHomeFeedsResponse,
  LegacyBbsThreadItem,
  LegacyRequestBody,
  LegacyRow,
} from './types';
import {
  clampNumber,
  stringValue,
  toNumber,
} from './utils';

let cachedFullHomeFeedBundle: LegacyBbsHomeFeedBundle | null = null;
let pendingFullHomeFeedBundle: Promise<LegacyBbsHomeFeedBundle> | null = null;

export async function fetchLegacyBootstrap(signal?: AbortSignal): Promise<LegacyBbsBootstrapResponse> {
  syncLegacyTokenCookie();
  const boards = legacyForumBoards;
  const [viewerRows, homeFeedCandidates, activityBanners, globalPinnedThreads, calendarEvents] = await Promise.all([
    callCachedOrOptionalLegacyCurrentUser(signal),
    fetchLegacyFullHomeFeedBundle(boards, signal),
    fetchLegacyHomeActivityBanners(signal),
    fetchLegacyGlobalPinnedThreads(boards, signal),
    fetchLegacyCalendarEvents(signal),
  ]);
  const viewerRow = viewerRows[0];
  const viewer = mapLegacyViewer(viewerRow);

  return {
    viewer,
    boards,
    home: {
      hotThreads: homeFeedCandidates.hotThreads,
      latestTopics: homeFeedCandidates.latestTopics,
      latestReplies: homeFeedCandidates.latestReplies,
      activityBanners,
      globalPinnedThreads,
      calendarEvents,
    },
    unread: {
      total: toNumber(viewerRow?.newmsg),
    },
  };
}

export async function fetchLegacyHomeFeeds(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsHomeFeedsResponse> {
  const boards = legacyForumBoards;
  const feeds = await fetchLegacyFullHomeFeedBundle(boards, signal);
  const response = {
    hotThreads: paginateLegacyHomeFeed('hot', feeds.hotThreads, params),
    latestReplies: paginateLegacyHomeFeed('latest-replies', feeds.latestReplies, params),
    latestTopics: paginateLegacyHomeFeed('latest-topics', feeds.latestTopics, params),
  };

  return response;
}

export async function fetchLegacyHomeFeed(
  feed: LegacyBbsHomeFeedName,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsHomeFeedResponse> {
  const boards = legacyForumBoards;
  const feeds = await fetchLegacyFullHomeFeedBundle(boards, signal);

  return paginateLegacyHomeFeed(feed, getLegacyHomeFeedItems(feed, feeds), params);
}

export async function warmLegacyHomeFeedBundle(signal?: AbortSignal) {
  return fetchLegacyFullHomeFeedBundle(legacyForumBoards, signal);
}

async function fetchLegacyFullHomeFeedBundle(
  boards: LegacyBbsBoardSummary[],
  signal?: AbortSignal,
): Promise<LegacyBbsHomeFeedBundle> {
  if (cachedFullHomeFeedBundle) {
    return cachedFullHomeFeedBundle;
  }

  if (pendingFullHomeFeedBundle) {
    return pendingFullHomeFeedBundle;
  }

  pendingFullHomeFeedBundle = fetchLegacyHomeFeedBundle(boards, signal)
    .then((bundle) => {
      cachedFullHomeFeedBundle = bundle;
      return bundle;
    })
    .finally(() => {
      pendingFullHomeFeedBundle = null;
    });

  return pendingFullHomeFeedBundle;
}

async function fetchLegacyHomeFeedBundle(
  boards: LegacyBbsBoardSummary[],
  signal?: AbortSignal,
): Promise<LegacyBbsHomeFeedBundle> {
  const [legacyLatestRows, apiRecentRows] = await Promise.all([
    callOptionalLegacyAsk(
      { ask: 'hot', hotnum: HOME_FEED_CANDIDATE_BATCH_SIZE },
      { includeToken: false, signal },
    ),
    callOptionalLegacyAsk(
      {
        ask: 'recent_threads',
        limit: HOME_FEED_CANDIDATE_BATCH_SIZE,
      },
      { includeToken: false, signal },
    ),
  ]);
  const [legacyLatestCandidates, latestTopicCandidates] = await Promise.all([
    hydrateTruncatedLegacyThreadTitles(
      mapLegacyHomeThreadRows(legacyLatestRows, boards, { fillMissingLatestReply: true }),
      signal,
      { includeToken: false },
    ),
    hydrateTruncatedLegacyThreadTitles(
      mapLegacyHomeThreadRows(apiRecentRows, boards, { fillMissingLatestReply: true }),
      signal,
      { includeToken: false },
    ),
  ]);
  const feedThreadCandidates = uniqueHomeThreads([
    ...latestTopicCandidates,
    ...legacyLatestCandidates,
  ]);
  const latestReplyCandidates = legacyLatestCandidates.length > 0
    ? legacyLatestCandidates
    : feedThreadCandidates.map((thread) => fillMissingLatestReplyFromThread(thread));
  const latestReplies = sortHomeLatestReplies(
    latestReplyCandidates.length > 0 ? latestReplyCandidates : feedThreadCandidates,
  );
  const latestTopics = sortHomeLatestTopics(
    latestTopicCandidates.length > 0 ? latestTopicCandidates : feedThreadCandidates,
  );

  return {
    hotThreads: [],
    latestReplies,
    latestTopics: latestTopics.length > 0 ? latestTopics : latestReplies,
  };
}

function fillMissingLatestReplyFromThread(thread: LegacyBbsThreadItem): LegacyBbsThreadItem {
  if (thread.replyer.trim()) {
    return thread;
  }

  return {
    ...thread,
    replyer: thread.author || '匿名用户',
    updatedAt: thread.updatedAt || thread.postDate,
  };
}

async function fetchLegacyGlobalPinnedThreads(
  boards: LegacyBbsBoardSummary[],
  signal?: AbortSignal,
): Promise<LegacyBbsThreadItem[]> {
  const apiRows = await fetchLegacyHomeGlobalPinnedRows(signal);
  const rows = apiRows ?? (await callOptionalLegacyAsk({ ask: 'global_top' }, signal));
  const items = rows
    .filter(isLegacyThreadRow)
    .map((row) => mapLegacyThreadItem(row, getBoardForBid(boards, toNumber(row.bid))));

  return hydrateTruncatedLegacyThreadTitles(items, signal);
}

function mapLegacyHomeThreadRows(
  rows: LegacyRow[],
  boards: LegacyBbsBoardSummary[],
  options: { fillMissingLatestReply?: boolean } = {},
) {
  return rows
    .map((row) => (options.fillMissingLatestReply ? fillMissingLatestReply(row) : row))
    .filter(isLegacyThreadRow)
    .map((row) => mapLegacyThreadItem(row, getBoardForBid(boards, toNumber(row.bid))))
    .filter((thread) => !thread.globalPinned);
}

function fillMissingLatestReply(row: LegacyRow): LegacyRow {
  const replyer = stringValue(row.replyer).trim();

  if (replyer) {
    return row;
  }

  const postTimestamp = row.postdate ?? row.timestamp ?? row.replytime ?? row.updatetime;

  return {
    ...row,
    replyer: stringValue(row.author || '匿名用户'),
    replytime: postTimestamp,
    timestamp: postTimestamp,
    updatetime: postTimestamp,
  };
}

async function fetchLegacyHomeGlobalPinnedRows(signal?: AbortSignal): Promise<LegacyRow[] | null> {
  void signal;
  return null;
}

async function fetchLegacyHomeActivityBanners(signal?: AbortSignal): Promise<LegacyBbsActivityBanner[]> {
  void signal;
  return [];
}

function getLegacyHomeFeedItems(feed: LegacyBbsHomeFeedName, feeds: LegacyBbsHomeFeedBundle) {
  if (feed === 'latest-replies') {
    return feeds.latestReplies;
  }

  if (feed === 'latest-topics') {
    return feeds.latestTopics;
  }

  return feeds.hotThreads;
}

function paginateLegacyHomeFeed(
  feed: LegacyBbsHomeFeedName,
  items: LegacyBbsThreadItem[],
  params: LegacyRequestBody,
): LegacyBbsHomeFeedResponse {
  const pageSize = clampNumber(toNumber(params.pageSize, 30), 1, HOME_FEED_MAX_ITEMS);
  const cursor = clampNumber(toNumber(params.cursor), 0, Math.max(items.length, 0));
  const pageItems = items.slice(cursor, cursor + pageSize);
  const nextCursorValue = cursor + pageItems.length;
  const hasMore = nextCursorValue < items.length;

  return {
    feed,
    hasMore,
    items: pageItems,
    nextCursor: hasMore ? String(nextCursorValue) : null,
    pageSize,
    total: items.length,
  };
}
