import {
  boards as primaryBoardNames,
  getLegacyForumBoardByName,
  moreBoards as collapsedBoardNames,
} from '../../data/forumBoards';
import {
  legacyBbsGet,
  type LegacyBbsBoardThreadsResponse,
  type LegacyBbsPublicProfileResponse,
  type LegacyBbsViewer,
} from '../legacyBbsClient';
import { fetchCachedLegacyBbsResponse, writeCachedLegacyBbsResponse } from './requestCache';
import { getBoardThreadsCacheKey, getPublicProfileCacheKey } from './requestKeys';
import { BOARD_DETAIL_THREAD_WINDOW_SIZE } from './types';
import { getLegacyViewerRequestKey } from './viewerKey';

const BOARD_WARMUP_CONCURRENCY = 3;

export function warmLegacyBbsPrimaryBoardData(viewer: LegacyBbsViewer, signal: AbortSignal) {
  const viewerKey = getLegacyViewerRequestKey(viewer);

  void warmBoardThreadLists(primaryBoardNames, viewerKey, signal);
}

export function warmLegacyBbsCollapsedBoardData(viewer: LegacyBbsViewer, signal: AbortSignal) {
  void warmBoardThreadLists(collapsedBoardNames, getLegacyViewerRequestKey(viewer), signal);
}

export function warmLegacyBbsUserProfileData(viewerKey: string, username: string, signal: AbortSignal) {
  const normalizedUsername = username.trim();

  if (!viewerKey || !normalizedUsername) {
    return;
  }

  void warmLegacyBbsResponse(
    getPublicProfileCacheKey(normalizedUsername),
    () =>
      legacyBbsGet<LegacyBbsPublicProfileResponse>(
        `/profiles/${encodeURIComponent(normalizedUsername)}`,
        undefined,
        signal,
      ),
  ).catch(ignoreWarmupError);
}

async function warmLegacyBbsResponse<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const value = await fetcher();

  writeCachedLegacyBbsResponse(cacheKey, value);
  return value;
}

async function warmBoardThreadLists(boardNames: string[], viewerKey: string, signal: AbortSignal) {
  const queue = boardNames
    .map(getLegacyForumBoardByName)
    .filter((board) => board !== null);
  const workers = Array.from({ length: BOARD_WARMUP_CONCURRENCY }, async () => {
    while (!signal.aborted) {
      const board = queue.shift();

      if (!board) {
        return;
      }

      await fetchCachedLegacyBbsResponse(
        getBoardThreadsCacheKey({
          bid: board.bid,
          cursor: 0,
          pageSize: BOARD_DETAIL_THREAD_WINDOW_SIZE,
          sort: 'lastReply',
          type: 'all',
          viewerKey,
        }),
        () =>
          legacyBbsGet<LegacyBbsBoardThreadsResponse>(
            `/boards/${board.bid}/threads`,
            {
              cursor: 0,
              pageSize: BOARD_DETAIL_THREAD_WINDOW_SIZE,
              sort: 'lastReply',
              type: 'all',
            },
            signal,
          ),
      ).catch(ignoreWarmupError);
    }
  });

  await Promise.all(workers);
}

function ignoreWarmupError() {
  // Warmup is opportunistic; route-level hooks still own visible error handling.
}
