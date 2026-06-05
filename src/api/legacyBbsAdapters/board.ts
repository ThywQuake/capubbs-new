import type { BoardDetail, BoardThread, BoardThreadKind } from '../../types/forum';
import { getBoardCoverImage } from '../../data/boardCovers';
import { getLegacyForumBoardByBid, getLegacyForumBoardByName } from '../../data/forumBoards';
import { getBoardNewThreadPath } from '../../utils/boardRoutes';
import { getPublicProfilePath } from '../../utils/userRoutes';
import type { LegacyBbsBoardSummary, LegacyBbsThreadItem } from '../legacyBbsClient';
import { getBoardName, getLegacyThreadHref, getLegacyThreadId } from './shared';

export function adaptLegacyBbsBoardDetail(
  board: LegacyBbsBoardSummary,
  threads: LegacyBbsThreadItem[],
  requestedBoardName?: string | null,
  pagination?: {
    cursor: number;
    hasMore: boolean;
    pageSize: number;
    total: number;
  },
): BoardDetail {
  const staticBoard = getLegacyForumBoardByName(requestedBoardName) ?? getLegacyForumBoardByBid(board.bid);
  const boardName = staticBoard?.name ?? getBoardName(board);
  const boardThreads = threads.map(adaptBoardThread);

  return {
    name: boardName,
    description: staticBoard?.title ?? board.title ?? `${boardName}版面`,
    moderators: board.moderators,
    requiredStar: board.requiredStar,
    topics: board.stats?.topics ?? boardThreads.length,
    replies: boardThreads.reduce((total, thread) => total + thread.replies, 0),
    today: board.stats?.todayReplies ?? board.stats?.todayTopics ?? 0,
    online: 0,
    coverImage: getBoardCoverImage(boardName),
    postHref: getBoardNewThreadPath(boardName),
    threads: boardThreads,
    threadCursor: pagination?.cursor,
    threadHasMore: pagination?.hasMore,
    threadPageSize: pagination?.pageSize,
    threadTotal: pagination?.total,
  };
}

export function adaptBoardThread(thread: LegacyBbsThreadItem): BoardThread {
  const author = thread.author || '匿名用户';
  const lastReplyBy = thread.replyer || author;
  const lastReplyAt = thread.updatedAt || thread.postDate;

  return {
    id: getLegacyThreadId(thread),
    title: thread.title,
    kind: getThreadKind(thread),
    author,
    authorHref: getPublicProfilePath(author),
    createdAt: thread.postDate || lastReplyAt,
    lastReplyBy,
    lastReplyAt,
    replies: thread.replies,
    views: thread.views,
    href: getLegacyThreadHref(thread),
    pinned: thread.pinned,
    globalPinned: thread.globalPinned,
    digest: thread.digest,
    locked: thread.locked,
    openForSignup: thread.isActivity,
  };
}

function getThreadKind(thread: LegacyBbsThreadItem): BoardThreadKind {
  if (thread.isActivity) {
    return 'activity';
  }

  return thread.digest ? 'digest' : 'discussion';
}
