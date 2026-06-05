import { clearLegacyTokenCookie } from './authSession';
import { loginWithLegacyApi, registerWithLegacyApi } from './auth';
import { fetchLegacyBoardDetail, fetchLegacyBoardThreads, fetchLegacyBoardViewerState } from './boards';
import { fetchLegacySessionViewer } from './currentUser';
import { LegacyBbsError } from './errors';
import { updateLegacyThreadBookmark } from './favorites';
import { fetchLegacyBootstrap, fetchLegacyHomeFeed, fetchLegacyHomeFeeds } from './home';
import {
  fetchLegacyDirectConversation,
  fetchLegacyMessages,
  markLegacyMessagesRead,
  sendLegacyDirectMessage,
} from './messages';
import {
  fetchLegacyPublicProfile,
  fetchLegacyUserCenter,
  fetchLegacyUserCenterProfile,
  fetchLegacyUserCenterRecordTab,
  type LegacyBbsUserCenterRecordTab,
  updateLegacyUserCenterPassword,
  updateLegacyUserCenterProfile,
  updateLegacyUserCenterSignatures,
} from './profile';
import { fetchLegacySearch } from './search';
import {
  createLegacyNestedReply,
  createLegacyReplyFloor,
  createLegacyThread,
  deleteLegacyFloor,
  deleteLegacyNestedReply,
  deleteLegacyThread,
  fetchLegacyThread,
  fetchLegacyThreadFloorPreview,
  fetchLegacyThreadFloors,
  fetchLegacyThreadInteractionState,
  moveLegacyThread,
  updateLegacyActivitySignup,
  updateLegacyFloor,
  updateLegacyThreadModeration,
} from './threads';
import { callLegacyAsk } from './transport';
import type { LegacyBbsHomeFeedName, LegacyRequestBody, LegacyRequestOptions, LegacyRequestParams } from './types';
import { normalizeRequestPath } from './utils';

export async function legacyBbsGet<T>(
  path: string,
  params?: LegacyRequestParams,
  signal?: AbortSignal,
) {
  return legacyBbsRequest<T>(path, {
    method: 'GET',
    params,
    signal,
  });
}

export async function legacyBbsPost<T>(
  path: string,
  body?: LegacyRequestBody,
  signal?: AbortSignal,
) {
  return legacyBbsRequest<T>(path, {
    body,
    method: 'POST',
    signal,
  });
}

async function legacyBbsRequest<T>(path: string, options: LegacyRequestOptions): Promise<T> {
  const normalizedPath = normalizeRequestPath(path);
  const params = options.body ?? options.params ?? {};

  if (normalizedPath === '/bootstrap') {
    return fetchLegacyBootstrap(options.signal) as Promise<T>;
  }

  if (normalizedPath === '/auth/login') {
    return loginWithLegacyApi(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/auth/register') {
    return registerWithLegacyApi(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/auth/logout') {
    try {
      await callLegacyAsk({ ask: 'logout' }, options.signal);
    } finally {
      clearLegacyTokenCookie();
    }

    return { ok: true } as T;
  }

  if (normalizedPath === '/session/viewer') {
    return fetchLegacySessionViewer(options.signal) as Promise<T>;
  }

  if (normalizedPath === '/user-center') {
    if (params.scope === 'profile') {
      return fetchLegacyUserCenterProfile(options.signal) as Promise<T>;
    }

    const recordTab = getLegacyBbsUserCenterRecordTab(params.recordTab);

    if (recordTab) {
      return fetchLegacyUserCenterRecordTab(recordTab, options.signal) as Promise<T>;
    }

    return fetchLegacyUserCenter(options.signal) as Promise<T>;
  }

  if (normalizedPath === '/user-center/profile') {
    return updateLegacyUserCenterProfile(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/user-center/signatures') {
    return updateLegacyUserCenterSignatures(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/user-center/password') {
    return updateLegacyUserCenterPassword(params, options.signal) as Promise<T>;
  }

  const publicProfileMatch = normalizedPath.match(/^\/profiles\/(.+)$/);
  if (publicProfileMatch) {
    return fetchLegacyPublicProfile(decodeURIComponent(publicProfileMatch[1]), options.signal) as Promise<T>;
  }

  const homeFeedsMatch = normalizedPath.match(/^\/home\/feeds(?:\/(hot|latest-replies|latest-topics))?$/);
  if (homeFeedsMatch) {
    const feedName = homeFeedsMatch[1] as LegacyBbsHomeFeedName | undefined;

    return (
      feedName
        ? fetchLegacyHomeFeed(feedName, params, options.signal)
        : fetchLegacyHomeFeeds(params, options.signal)
    ) as Promise<T>;
  }

  if (normalizedPath === '/messages') {
    return fetchLegacyMessages(params, options.signal) as Promise<T>;
  }

  const messageConversationMatch = normalizedPath.match(/^\/messages\/conversations\/(.+)$/);
  if (messageConversationMatch) {
    return fetchLegacyDirectConversation(decodeURIComponent(messageConversationMatch[1]), options.signal) as Promise<T>;
  }

  if (normalizedPath === '/messages/send') {
    return sendLegacyDirectMessage(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/messages/mark-read') {
    return markLegacyMessagesRead(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/search') {
    return fetchLegacySearch(params, options.signal) as Promise<T>;
  }

  if (normalizedPath === '/favorites/thread') {
    return updateLegacyThreadBookmark(params, options.signal) as Promise<T>;
  }

  const boardViewerStateMatch = normalizedPath.match(/^\/boards\/(\d+)\/viewer-state$/);
  if (boardViewerStateMatch) {
    return fetchLegacyBoardViewerState(Number(boardViewerStateMatch[1]), options.signal) as Promise<T>;
  }

  const boardDetailMatch = normalizedPath.match(/^\/boards\/(\d+)$/);
  if (boardDetailMatch) {
    return fetchLegacyBoardDetail(Number(boardDetailMatch[1]), params, options.signal) as Promise<T>;
  }

  const boardThreadsMatch = normalizedPath.match(/^\/boards\/(\d+)\/threads$/);
  if (boardThreadsMatch) {
    return fetchLegacyBoardThreads(Number(boardThreadsMatch[1]), params, options.signal) as Promise<T>;
  }

  const floorsMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/floors$/);
  if (floorsMatch) {
    if (options.method === 'POST') {
      return createLegacyReplyFloor(
        Number(floorsMatch[1]),
        Number(floorsMatch[2]),
        params,
        options.signal,
      ) as Promise<T>;
    }

    return fetchLegacyThreadFloors(Number(floorsMatch[1]), Number(floorsMatch[2]), params, options.signal) as Promise<T>;
  }

  const threadInteractionStateMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/interaction-state$/);
  if (threadInteractionStateMatch) {
    return fetchLegacyThreadInteractionState(
      Number(threadInteractionStateMatch[1]),
      Number(threadInteractionStateMatch[2]),
      options.signal,
    ) as Promise<T>;
  }

  const threadMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)$/);
  if (threadMatch) {
    return fetchLegacyThread(Number(threadMatch[1]), Number(threadMatch[2]), params, options.signal) as Promise<T>;
  }

  const activitySignupMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/activity-signup$/);
  if (activitySignupMatch) {
    return updateLegacyActivitySignup(
      Number(activitySignupMatch[1]),
      Number(activitySignupMatch[2]),
      params,
      options.signal,
    ) as Promise<T>;
  }

  const threadModerationMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/moderation$/);
  if (threadModerationMatch) {
    return updateLegacyThreadModeration(
      Number(threadModerationMatch[1]),
      Number(threadModerationMatch[2]),
      params,
      options.signal,
    ) as Promise<T>;
  }

  const threadDeleteMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/delete$/);
  if (threadDeleteMatch) {
    return deleteLegacyThread(
      Number(threadDeleteMatch[1]),
      Number(threadDeleteMatch[2]),
      options.signal,
    ) as Promise<T>;
  }

  const threadMoveMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/move$/);
  if (threadMoveMatch) {
    return moveLegacyThread(
      Number(threadMoveMatch[1]),
      Number(threadMoveMatch[2]),
      params,
      options.signal,
    ) as Promise<T>;
  }

  if (normalizedPath === '/threads') {
    return createLegacyThread(params, options.signal) as Promise<T>;
  }

  const floorDeleteMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/floors\/(\d+)\/delete$/);
  if (floorDeleteMatch) {
    return deleteLegacyFloor(
      Number(floorDeleteMatch[1]),
      Number(floorDeleteMatch[2]),
      Number(floorDeleteMatch[3]),
      options.signal,
    ) as Promise<T>;
  }

  const nestedReplyCreateMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/floors\/(\d+)\/nested-replies$/);
  if (nestedReplyCreateMatch) {
    return createLegacyNestedReply(
      Number(nestedReplyCreateMatch[1]),
      Number(nestedReplyCreateMatch[2]),
      Number(nestedReplyCreateMatch[3]),
      params,
      options.signal,
    ) as Promise<T>;
  }

  const floorEditMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/floors\/(\d+)$/);
  if (floorEditMatch) {
    if (options.method === 'GET') {
      return fetchLegacyThreadFloorPreview(
        Number(floorEditMatch[1]),
        Number(floorEditMatch[2]),
        Number(floorEditMatch[3]),
        options.signal,
      ) as Promise<T>;
    }

    return updateLegacyFloor(
      Number(floorEditMatch[1]),
      Number(floorEditMatch[2]),
      Number(floorEditMatch[3]),
      params,
      options.signal,
    ) as Promise<T>;
  }

  const nestedReplyDeleteMatch = normalizedPath.match(/^\/threads\/(\d+)\/(\d+)\/nested-replies\/(\d+)\/delete$/);
  if (nestedReplyDeleteMatch) {
    return deleteLegacyNestedReply(
      Number(nestedReplyDeleteMatch[1]),
      Number(nestedReplyDeleteMatch[2]),
      Number(nestedReplyDeleteMatch[3]),
      params,
      options.signal,
    ) as Promise<T>;
  }

  throw new LegacyBbsError(`未映射的旧 API 语义路径：${normalizedPath}`, 404, 404);
}

function getLegacyBbsUserCenterRecordTab(value: unknown): LegacyBbsUserCenterRecordTab | null {
  return value === 'activities' || value === 'bookmarks' || value === 'posts' || value === 'replies'
    ? value
    : null;
}
