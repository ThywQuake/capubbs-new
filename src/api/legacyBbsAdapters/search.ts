import type { BoardThreadKind } from '../../types/forum';
import type { SearchResult } from '../../types/search';
import { getThreadFloorPath, getThreadPath } from '../../utils/threadRoutes';
import type { LegacyBbsSearchItem, LegacyBbsSearchResponse } from '../legacyBbsClient';

export function adaptLegacyBbsSearchResults(response: LegacyBbsSearchResponse): SearchResult[] {
  return response.items.map((item) => adaptLegacyBbsSearchResult(item, response.keyword));
}

function adaptLegacyBbsSearchResult(item: LegacyBbsSearchItem, keyword: string): SearchResult {
  const threadId = `${item.bid}-${item.tid}`;
  const isPostMatch = item.matchType === 'post';
  const floor = isPostMatch && item.pid > 1 ? item.pid : undefined;
  const excerpt = item.excerpt || (
    isPostMatch
      ? '服务器未返回正文摘要，可进入帖子查看命中楼层。'
      : '服务器未返回摘要，可进入主题查看。'
  );
  const hasStats = item.views > 0 || item.replies > 0 || item.favorites > 0;

  return {
    author: item.author,
    board: item.board.name,
    bodySearchText: [
      excerpt,
      item.title,
      item.author,
      item.board.name,
      isPostMatch ? keyword : '',
    ].join(' '),
    bookmarks: item.favorites,
    digest: item.digest,
    excerpt,
    floor,
    hasStats,
    href: floor ? getThreadFloorPath(threadId, floor) : getThreadPath(threadId),
    id: `${item.matchType}:${item.bid}-${item.tid}-${item.pid}`,
    kind: getLegacySearchResultKind(item),
    matchType: item.matchType,
    meta: [
      item.board.name,
      item.author,
      floor ? `${floor} 楼` : '',
    ].filter(Boolean),
    pinned: item.pinned || item.globalPinned,
    popularity: item.replies * 4 + Math.round(item.views / 80) + item.favorites * 5,
    replies: item.replies,
    sortTime: item.updatedAt || item.postDate,
    time: item.updatedAt || item.postDate,
    title: item.title,
    titleSearchText: [
      item.title,
      item.board.name,
      item.author,
    ].join(' '),
    views: item.views,
  };
}

function getLegacySearchResultKind(item: LegacyBbsSearchItem): BoardThreadKind {
  if (item.isActivity) {
    return 'activity';
  }

  return item.digest ? 'digest' : 'discussion';
}
