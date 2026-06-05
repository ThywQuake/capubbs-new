import { useEffect, useMemo, useState } from 'react';
import { adaptLegacyBbsSearchResults } from '../legacyBbsAdapters';
import { legacyBbsGet, type LegacyBbsSearchResponse } from '../legacyBbsClient';
import { useLegacyBbs } from './context';
import { getErrorMessage, isAbortError } from './requestState';
import type { LegacyBbsSearchState } from './types';

type LegacyBbsSearchField = 'body' | 'title';
type LegacyBbsSearchTimeRange = 'all' | 'twoYears' | 'year';

type LegacyBbsSearchOptions = {
  boardName: string | null;
  endDate: string;
  keyword: string;
  requestKey: number;
  searchField: LegacyBbsSearchField;
  startDate: string;
  timeRange: LegacyBbsSearchTimeRange;
};

const EMPTY_SEARCH_STATE: LegacyBbsSearchState = {
  data: [],
  error: null,
  isResolvingBoard: false,
  status: 'idle',
};

export function useLegacyBbsSearch(
  enabled: boolean,
  options: LegacyBbsSearchOptions,
): LegacyBbsSearchState {
  const legacyBbs = useLegacyBbs();
  const keyword = options.keyword.trim();
  const bid = options.boardName ? legacyBbs.resolveBoardId(options.boardName) : null;
  const serverDateRange = useMemo(
    () => getLegacySearchServerDateRange(options.timeRange, options.startDate, options.endDate),
    [options.endDate, options.startDate, options.timeRange],
  );
  const requestParams = useMemo(
    () => ({
      ...(bid ? { bid } : {}),
      endtime: serverDateRange.end,
      keyword,
      starttime: serverDateRange.start,
      type: options.searchField === 'body' ? 'post' : 'thread',
    }),
    [bid, keyword, options.searchField, serverDateRange.end, serverDateRange.start],
  );
  const [state, setState] = useState<LegacyBbsSearchState>(EMPTY_SEARCH_STATE);

  useEffect(() => {
    if (!enabled || !keyword) {
      setState(EMPTY_SEARCH_STATE);
      return;
    }

    if (options.boardName && !bid) {
      const isResolvingBoard = legacyBbs.status === 'loading';

      setState({
        data: [],
        error: null,
        isResolvingBoard,
        status: isResolvingBoard ? 'loading' : 'idle',
      });
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;

    setState({
      data: [],
      error: null,
      isResolvingBoard: false,
      status: 'loading',
    });

    legacyBbsGet<LegacyBbsSearchResponse>('/search', requestParams, controller.signal)
      .then((data) => {
        if (!isCurrentRequest) {
          return;
        }

        setState({
          data: adaptLegacyBbsSearchResults(data),
          error: null,
          isResolvingBoard: false,
          status: 'ready',
        });
      })
      .catch((requestError: unknown) => {
        if (!isCurrentRequest || isAbortError(requestError)) {
          return;
        }

        setState({
          data: [],
          error: getErrorMessage(requestError),
          isResolvingBoard: false,
          status: 'error',
        });
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [bid, enabled, keyword, legacyBbs.status, options.boardName, options.requestKey, requestParams]);

  return state;
}

function getLegacySearchServerDateRange(
  timeRange: LegacyBbsSearchTimeRange,
  startDate: string,
  endDate: string,
) {
  return {
    end: endDate || formatLegacySearchDate(new Date()),
    start: startDate || getLegacySearchDefaultStartDate(timeRange),
  };
}

function getLegacySearchDefaultStartDate(timeRange: LegacyBbsSearchTimeRange) {
  if (timeRange === 'all') {
    return '2001-01-01';
  }

  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - (timeRange === 'year' ? 1 : 2));

  return formatLegacySearchDate(date);
}

function formatLegacySearchDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
