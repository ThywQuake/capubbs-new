import { legacyForumBoards } from '../../data/forumBoards';
import { canBoardStarViewerPost } from '../../utils/boardStarRequirement';
import { mapLegacyBoard, mapLegacyThreadItem, isLegacyThreadRow } from './mappers';
import { callOptionalLegacyCurrentUser } from './currentUser';
import { callLegacyAsk, callOptionalLegacyAsk } from './transport';
import { hydrateTruncatedLegacyThreadTitles } from './threadTitles';
import type {
  LegacyBbsBoardDetailResponse,
  LegacyBbsBoardSummary,
  LegacyBbsBoardThreadsResponse,
  LegacyBbsBoardViewerState,
  LegacyRequestBody,
  LegacyRow,
} from './types';
import { clampNumber, LEGACY_BOARD_PAGE_SIZE, stringValue, toNumber } from './utils';

export async function fetchLegacyBoards(signal?: AbortSignal): Promise<LegacyBbsBoardSummary[]> {
  void signal;

  return legacyForumBoards;
}

export async function fetchLegacyBoardThreads(
  bid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsBoardThreadsResponse> {
  const board = await fetchOptionalLegacyBoardSummary(bid, signal, false);

  return fetchLegacyBoardThreadPage(board, params, signal, false);
}

export async function fetchLegacyBoardDetail(
  bid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsBoardDetailResponse> {
  const board = await fetchLegacyBoardSummary(bid, signal);
  const [threadPage, rightsRows, viewerRows] = await Promise.all([
    fetchLegacyBoardThreadPage(board, params, signal),
    callOptionalLegacyAsk({ ask: 'rights', bid }, signal),
    callOptionalLegacyCurrentUser(signal),
  ]);

  return {
    ...threadPage,
    viewerState: mapLegacyBoardViewerState(rightsRows[0], viewerRows[0], board),
  };
}

export async function fetchLegacyBoardViewerState(bid: number, signal?: AbortSignal): Promise<LegacyBbsBoardViewerState> {
  const [rightsRows, viewerRows] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'rights', bid }, signal),
    callOptionalLegacyCurrentUser(signal),
  ]);

  const board = await fetchOptionalLegacyBoardSummary(bid, signal);

  return mapLegacyBoardViewerState(rightsRows[0], viewerRows[0], board);
}

export async function fetchLegacyBoardSummary(bid: number, signal?: AbortSignal, includeToken = true) {
  const boardRows = await callLegacyAsk({ ask: 'bbsinfo', bid }, { includeToken, signal });

  return mapLegacyBoard(boardRows[0] ?? { bid });
}

async function fetchOptionalLegacyBoardSummary(bid: number, signal?: AbortSignal, includeToken = true) {
  const boardRows = await callOptionalLegacyAsk({ ask: 'bbsinfo', bid }, { includeToken, signal });

  return boardRows[0] ? mapLegacyBoard(boardRows[0]) : getLegacyCachedBoardSummary(bid);
}

function getLegacyCachedBoardSummary(bid: number): LegacyBbsBoardSummary {
  return legacyForumBoards.find((board) => board.bid === bid) ?? {
    bid,
    hidden: false,
    moderators: [],
    name: `版面 ${bid}`,
    requiredStar: 0,
    title: `版面 ${bid}`,
  };
}

async function fetchLegacyBoardThreadPage(
  board: LegacyBbsBoardSummary,
  params: LegacyRequestBody,
  signal?: AbortSignal,
  includeToken = true,
): Promise<LegacyBbsBoardThreadsResponse> {
  const keyword = stringValue(params.keyword).trim();
  const pageSize = clampNumber(toNumber(params.pageSize, 30), 1, 150);
  const cursor = clampNumber(toNumber(params.cursor), 0, Number.MAX_SAFE_INTEGER);
  const threadType = stringValue(params.type || 'all');
  const sort = stringValue(params.sort || 'lastReply');
  const usesSearch = keyword.length > 0;
  const rows = usesSearch
    ? await callLegacyAsk({ ask: 'search', bid: board.bid, keyword, type: 'thread' }, { includeToken, signal })
    : await fetchLegacyBoardThreadRows(board.bid, cursor, pageSize, threadType, signal, includeToken);
  let items = rows
    .filter(isLegacyThreadRow)
    .map((row) => mapLegacyThreadItem(row, board, { includeFavorites: false }))
    .filter((thread) => {
      if (threadType === 'digest') {
        return thread.digest;
      }

      if (threadType === 'activity') {
        return thread.isActivity;
      }

      return true;
  });
  items = await hydrateTruncatedLegacyThreadTitles(items, signal, { includeToken });
  const total = usesSearch ? items.length : getLegacyBoardThreadTotal(board, threadType, items.length);

  if (sort === 'popular') {
    items = [...items].sort((left, right) => right.replies + right.views / 100 - (left.replies + left.views / 100));
  } else if (sort === 'latest') {
    items = [...items].sort((left, right) => Date.parse(right.postDate) - Date.parse(left.postDate));
  }

  const offset = usesSearch ? cursor : cursor % LEGACY_BOARD_PAGE_SIZE;
  const pageItems = items.slice(offset, offset + pageSize);
  const nextCursorValue = cursor + pageItems.length;
  const hasMore = nextCursorValue < total;

  return {
    board,
    cursor,
    hasMore,
    items: pageItems,
    nextCursor: hasMore ? String(nextCursorValue) : null,
    pageSize,
    total,
  };
}

async function fetchLegacyBoardThreadRows(
  bid: number,
  cursor: number,
  pageSize: number,
  threadType: string,
  signal?: AbortSignal,
  includeToken = true,
) {
  const startPage = Math.floor(cursor / LEGACY_BOARD_PAGE_SIZE) + 1;
  const endPage = Math.floor((cursor + pageSize - 1) / LEGACY_BOARD_PAGE_SIZE) + 1;
  const pageNumbers = Array.from({ length: Math.max(1, endPage - startPage + 1) }, (_, index) => startPage + index);
  const rowsByPage = await Promise.all(
    pageNumbers.map((page) =>
      callLegacyAsk(
        {
          bid,
          p: page,
          ...(threadType === 'digest' ? { extr: 1 } : {}),
        },
        { includeToken, signal },
      ),
    ),
  );

  return rowsByPage.flat();
}

function getLegacyBoardThreadTotal(board: LegacyBbsBoardSummary, threadType: string, fallback: number) {
  if (threadType === 'digest') {
    return board.stats?.digests ?? fallback;
  }

  if (threadType === 'activity') {
    return fallback;
  }

  return board.stats?.topics ?? fallback;
}

export function mapLegacyBoardViewerState(
  row: LegacyRow | undefined,
  viewerRow?: LegacyRow,
  board?: LegacyBbsBoardSummary,
): LegacyBbsBoardViewerState {
  const rightsCode = toNumber(row?.code, -1);
  const username = stringValue(row?.username || viewerRow?.username);
  const viewerRights = toNumber(viewerRow?.rights, -1);
  const canModerate = rightsCode > 0 || viewerRights >= 3;

  return {
    canGlobalPin: rightsCode > 1 || viewerRights >= 2,
    canModerate,
    canPost: canBoardStarViewerPost(
      {
        rights: viewerRights,
        star: viewerRow?.star,
        username,
      },
      board?.requiredStar,
    ),
    rightsCode,
    username,
  };
}
