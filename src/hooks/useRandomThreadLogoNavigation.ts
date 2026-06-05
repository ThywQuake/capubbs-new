import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { fetchLegacyBoardSummary } from '../api/legacyBbsClient/boards';
import { fetchLegacyThreadPresence } from '../api/legacyBbsClient/threadPresence';
import {
  getRandomThreadCandidate,
  getRandomThreadPath,
  type RandomThreadBoardSource,
} from '../utils/randomThreadPath';

const LOGO_RANDOM_THREAD_CLICK_COUNT = 5;
const LOGO_RANDOM_THREAD_CLICK_WINDOW_MS = 1400;
const LOGO_RANDOM_THREAD_MAX_RETRIES = 2;
const LOGO_RANDOM_THREAD_PROMPT_START_COUNT = 2;

let cachedRandomThreadBoardsWithStats: {
  boards: RandomThreadBoardSource[];
  key: string;
} | null = null;
let pendingRandomThreadBoardsWithStats: {
  key: string;
  promise: Promise<RandomThreadBoardSource[]>;
} | null = null;

type UseRandomThreadLogoNavigationOptions = {
  navigate: NavigateFunction;
  pathname: string;
  randomThreadBoards: RandomThreadBoardSource[];
  randomThreadIds: string[];
};

export function useRandomThreadLogoNavigation({
  navigate,
  pathname,
  randomThreadBoards,
  randomThreadIds,
}: UseRandomThreadLogoNavigationOptions) {
  const [remainingClickCount, setRemainingClickCount] = useState<number | null>(null);
  const logoClickStreakRef = useRef({
    count: 0,
    lastClickAt: 0,
  });
  const isResolvingRandomThreadRef = useRef(false);
  const promptTimerRef = useRef<number | null>(null);

  const clearPromptTimer = () => {
    if (promptTimerRef.current !== null) {
      window.clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  };

  const resetLogoClickPrompt = () => {
    clearPromptTimer();
    setRemainingClickCount(null);
  };

  const schedulePromptReset = () => {
    clearPromptTimer();
    promptTimerRef.current = window.setTimeout(() => {
      logoClickStreakRef.current = {
        count: 0,
        lastClickAt: 0,
      };
      setRemainingClickCount(null);
      promptTimerRef.current = null;
    }, LOGO_RANDOM_THREAD_CLICK_WINDOW_MS);
  };

  useEffect(() => {
    if (pathname !== '/') {
      logoClickStreakRef.current = {
        count: 0,
        lastClickAt: 0,
      };
      resetLogoClickPrompt();
    }
  }, [pathname]);

  useEffect(() => () => clearPromptTimer(), []);

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== '/') {
      logoClickStreakRef.current = {
        count: 0,
        lastClickAt: 0,
      };
      resetLogoClickPrompt();
      return;
    }

    const now = window.performance.now();
    const lastClickAt = logoClickStreakRef.current.lastClickAt;
    const isContinuousClick = now - lastClickAt <= LOGO_RANDOM_THREAD_CLICK_WINDOW_MS;
    const nextCount = isContinuousClick ? logoClickStreakRef.current.count + 1 : 1;

    logoClickStreakRef.current = {
      count: nextCount,
      lastClickAt: now,
    };

    if (nextCount < LOGO_RANDOM_THREAD_CLICK_COUNT) {
      if (nextCount >= LOGO_RANDOM_THREAD_PROMPT_START_COUNT) {
        setRemainingClickCount(LOGO_RANDOM_THREAD_CLICK_COUNT - nextCount);
        schedulePromptReset();
      } else {
        resetLogoClickPrompt();
      }

      return;
    }

    logoClickStreakRef.current = {
      count: 0,
      lastClickAt: 0,
    };
    resetLogoClickPrompt();

    event.preventDefault();

    if (isResolvingRandomThreadRef.current) {
      return;
    }

    isResolvingRandomThreadRef.current = true;

    void resolveRandomThreadPath(randomThreadBoards, randomThreadIds, Date.now())
      .then((randomThreadPath) => {
        if (randomThreadPath) {
          navigate(randomThreadPath);
        }
      })
      .finally(() => {
        isResolvingRandomThreadRef.current = false;
      });
  };

  return {
    handleLogoClick,
    promptText: remainingClickCount === null ? null : `再点击${remainingClickCount}次`,
  };
}

async function resolveRandomThreadPath(
  randomThreadBoards: RandomThreadBoardSource[],
  randomThreadIds: string[],
  seed: number,
) {
  const boardSources = await resolveRandomThreadBoardsWithStats(randomThreadBoards);

  for (let attempt = 0; attempt <= LOGO_RANDOM_THREAD_MAX_RETRIES; attempt += 1) {
    const candidate = getRandomThreadCandidate(boardSources, seed, attempt);

    if (!candidate) {
      break;
    }

    if (await fetchLegacyThreadPresence(candidate.bid, candidate.tid)) {
      return candidate.path;
    }
  }

  return randomThreadIds.length > 0 ? getRandomThreadPath(randomThreadIds) : null;
}

async function resolveRandomThreadBoardsWithStats(randomThreadBoards: RandomThreadBoardSource[]) {
  if (randomThreadBoards.length === 0 || randomThreadBoards.every(hasBoardMaxTid)) {
    return randomThreadBoards;
  }

  const cacheKey = getRandomThreadBoardCacheKey(randomThreadBoards);

  if (cachedRandomThreadBoardsWithStats?.key === cacheKey) {
    return cachedRandomThreadBoardsWithStats.boards;
  }

  if (pendingRandomThreadBoardsWithStats?.key === cacheKey) {
    return pendingRandomThreadBoardsWithStats.promise;
  }

  const promise = Promise.all(
    randomThreadBoards.map(async (board) => {
      if (hasBoardMaxTid(board)) {
        return board;
      }

      try {
        return await fetchLegacyBoardSummary(board.bid, undefined, false);
      } catch {
        return board;
      }
    }),
  ).then((boards) => {
    cachedRandomThreadBoardsWithStats = {
      boards,
      key: cacheKey,
    };

    return boards;
  });

  pendingRandomThreadBoardsWithStats = {
    key: cacheKey,
    promise,
  };

  try {
    return await promise;
  } finally {
    if (pendingRandomThreadBoardsWithStats?.key === cacheKey) {
      pendingRandomThreadBoardsWithStats = null;
    }
  }
}

function hasBoardMaxTid(board: RandomThreadBoardSource) {
  return Number(board.stats?.maxTid ?? 0) > 0;
}

function getRandomThreadBoardCacheKey(randomThreadBoards: RandomThreadBoardSource[]) {
  return randomThreadBoards
    .map((board) => [board.bid, board.hidden ? 1 : 0, board.stats?.maxTid ?? '', board.stats?.topics ?? ''].join(':'))
    .join('|');
}
