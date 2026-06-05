import { boards, moreBoards } from '../data/forumHome';
import { getBoardDetail } from '../data/boardDetails';
import { legacyForumBoards } from '../data/forumBoards';
import { getThreadPath } from './threadRoutes';

const SIMULATED_THREAD_COUNT_OFFSETS = [
  630,
  600,
  2310,
  2000,
  150,
  200,
  200,
  100,
  20,
  10,
] as const;
const DEFAULT_SIMULATED_THREAD_COUNT_OFFSET = 10;

export type RandomThreadCandidate = {
  bid: number;
  path: string;
  tid: number;
};

export type RandomThreadBoardSource = {
  bid: number;
  hidden?: boolean;
  stats?: {
    maxTid?: number;
    topics?: number;
  };
};

export function getRandomThreadPath(legacyThreadIds: string[] = []) {
  if (legacyThreadIds.length > 0) {
    const randomThreadId = legacyThreadIds[Math.floor(Math.random() * legacyThreadIds.length)];

    return getThreadPath(randomThreadId);
  }

  const threadIds = Array.from(
    new Set(
      [...boards, ...moreBoards].flatMap((boardName) =>
        getBoardDetail(boardName)?.threads.map((thread) => thread.id) ?? [],
      ),
    ),
  );

  if (threadIds.length === 0) {
    return null;
  }

  const randomThreadId = threadIds[Math.floor(Math.random() * threadIds.length)];

  return getThreadPath(randomThreadId);
}

export function getRandomThreadCandidate(
  boardSources: RandomThreadBoardSource[] = legacyForumBoards,
  seed = Date.now(),
  attempt = 0,
): RandomThreadCandidate | null {
  const weightedBoards = getWeightedRandomThreadBoards(boardSources);
  const totalSimulatedThreadCount = weightedBoards.reduce((total, board) => total + board.simulatedThreadCount, 0);

  if (totalSimulatedThreadCount <= 0) {
    return null;
  }

  const random = createSeededRandom(seed + (attempt * 0x9e3779b9));
  const board = pickWeightedRandomThreadBoard(weightedBoards, random() * totalSimulatedThreadCount);

  if (!board) {
    return null;
  }

  const tid = 1 + Math.floor(random() * board.simulatedThreadCount);
  const threadId = `${board.bid}-${tid}`;

  return {
    bid: board.bid,
    path: getThreadPath(threadId),
    tid,
  };
}

function getWeightedRandomThreadBoards(boardSources: RandomThreadBoardSource[]) {
  const sourceBoards = boardSources.length > 0 ? boardSources : legacyForumBoards;

  return sourceBoards
    .filter((board) => !board.hidden && board.bid > 0)
    .sort((leftBoard, rightBoard) => leftBoard.bid - rightBoard.bid)
    .map((board, index) => {
      const maxTid = getBoardMaxThreadId(board);
      const threadCount = maxTid ?? getBoardThreadCount(board);
      const simulatedThreadCount = maxTid ?? threadCount + getSimulatedThreadCountOffset(index);

      return {
        bid: board.bid,
        simulatedThreadCount,
      };
    })
    .filter((board) => board.simulatedThreadCount > 0);
}

function pickWeightedRandomThreadBoard(
  boards: Array<{ bid: number; simulatedThreadCount: number }>,
  randomValue: number,
) {
  let accumulatedCount = 0;

  return boards.find((board) => {
    accumulatedCount += board.simulatedThreadCount;

    return randomValue < accumulatedCount;
  }) ?? boards[boards.length - 1] ?? null;
}

function getBoardMaxThreadId(board: RandomThreadBoardSource) {
  const maxTid = Math.floor(Number(board.stats?.maxTid ?? 0));

  return Number.isFinite(maxTid) && maxTid > 0 ? maxTid : null;
}

function getBoardThreadCount(board: RandomThreadBoardSource) {
  const threadCount = Math.floor(Number(board.stats?.topics ?? 0));

  return Number.isFinite(threadCount) ? Math.max(0, threadCount) : 0;
}

function getSimulatedThreadCountOffset(boardIndex: number) {
  return SIMULATED_THREAD_COUNT_OFFSETS[boardIndex] ?? DEFAULT_SIMULATED_THREAD_COUNT_OFFSET;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
