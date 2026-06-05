import type { BoardSort } from '../../types/forum';
import type { LegacyBbsThreadType } from './types';

type BoardDetailCacheKeyInput = {
  bid: number;
  cursor: number;
  pageSize: number;
  sort: BoardSort;
  type: LegacyBbsThreadType;
  viewerKey: string;
};

export function getBoardDetailCacheKey({
  bid,
  cursor,
  pageSize,
  sort,
  type,
  viewerKey,
}: BoardDetailCacheKeyInput) {
  return [
    'board-detail',
    bid,
    viewerKey || 'guest',
    `cursor=${cursor}`,
    `pageSize=${pageSize}`,
    `sort=${sort}`,
    `type=${type}`,
  ].join(':');
}

export function getBoardThreadsCacheKey({
  bid,
  cursor,
  pageSize,
  sort,
  type,
  viewerKey,
}: BoardDetailCacheKeyInput) {
  return [
    'board-threads',
    bid,
    viewerKey || 'guest',
    `cursor=${cursor}`,
    `pageSize=${pageSize}`,
    `sort=${sort}`,
    `type=${type}`,
  ].join(':');
}

export function getBoardViewerStateCacheKey(bid: number, viewerKey: string) {
  return ['board-viewer-state', bid, viewerKey || 'guest'].join(':');
}

export function getThreadInteractionStateCacheKey(bid: number, tid: number, viewerKey: string) {
  return ['thread-interaction-state', bid, tid, viewerKey || 'guest'].join(':');
}

export function getThreadDetailCacheKey({
  authorOnly,
  bid,
  page,
  tid,
  viewerKey,
}: {
  authorOnly: boolean;
  bid: number;
  page: number;
  tid: number;
  viewerKey: string;
}) {
  return [
    'thread-detail',
    bid,
    tid,
    viewerKey || 'guest',
    `page=${page}`,
    `authorOnly=${authorOnly ? 1 : 0}`,
  ].join(':');
}

export function getUserCenterCacheKey(viewerKey: string, scope = 'profile') {
  return ['user-center', viewerKey || 'guest', scope].join(':');
}

export function getPublicProfileCacheKey(profileName: string) {
  return `public-profile:${profileName.trim() || 'unknown'}`;
}
