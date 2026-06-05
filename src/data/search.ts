import type { BoardThreadKind } from '../types/forum';
import type { SearchResult } from '../types/search';
import { getThreadPathFromHref } from '../utils/threadRoutes';
import { getBoardDetail } from './boardDetails';
import { boards, moreBoards } from './forumHome';
import { getThreadDetail } from './threadDetails';

export type { SearchResult };

export const searchBoardOptions = [...boards, ...moreBoards];

export function getSearchResults(): SearchResult[] {
  return searchBoardOptions.flatMap((boardName) => {
    const board = getBoardDetail(boardName);

    if (!board) {
      return [];
    }

    return board.threads.map((thread) => {
      const threadDetail = getThreadDetail(thread.id);
      const bodyText = threadDetail?.mainPost.content.join(' ') ?? getThreadSearchExcerpt(thread.kind, board.description);

      const titleSearchText = [
        thread.title,
        board.name,
        thread.author,
        thread.lastReplyBy,
        getThreadKindLabel(thread.kind),
        thread.pinned ? '置顶' : '',
        thread.digest ? '精华' : '',
      ].join(' ');
      const bodySearchText = [bodyText, board.name, thread.author, getThreadKindLabel(thread.kind)].join(' ');

      return {
        author: thread.author,
        board: board.name,
        bodySearchText,
        bookmarks: 0,
        digest: thread.digest,
        excerpt: bodyText,
        href: getThreadPathFromHref(thread.href),
        id: `thread:${thread.id}`,
        kind: thread.kind,
        meta: [board.name, thread.author],
        pinned: thread.pinned,
        popularity: thread.replies * 4 + Math.round(thread.views / 80),
        replies: thread.replies,
        sortTime: thread.lastReplyAt,
        time: thread.lastReplyAt,
        title: thread.title,
        titleSearchText,
        views: thread.views,
      };
    });
  });
}

function getThreadSearchExcerpt(kind: BoardThreadKind, boardDescription: string) {
  if (kind === 'activity') {
    return '活动报名、集合点、路线安排和注意事项可在主楼继续确认。';
  }

  if (kind === 'digest') {
    return '精华内容适合长期索引，包含路线、装备或活动记录的集中整理。';
  }

  return boardDescription;
}

function getThreadKindLabel(kind: BoardThreadKind) {
  if (kind === 'activity') {
    return '活动';
  }

  if (kind === 'digest') {
    return '精华';
  }

  return '讨论';
}
