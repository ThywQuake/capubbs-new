import { useEffect, useState } from 'react';
import { HOME_FEED_MAX_ITEMS } from '../homeFeedRanking';
import { adaptLegacyBbsHomeFeeds } from '../legacyBbsAdapters';
import { legacyBbsGet, type LegacyBbsHomeFeedsResponse } from '../legacyBbsClient';
import { getErrorMessage, isAbortError } from './requestState';
import type { LegacyBbsHomeFeedsState } from './types';

export function useLegacyBbsHomeFeeds(enabled: boolean): LegacyBbsHomeFeedsState {
  const [state, setState] = useState<LegacyBbsHomeFeedsState>({
    data: null,
    error: null,
    status: 'idle',
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        data: null,
        error: null,
        status: 'idle',
      });
      return;
    }

    const controller = new AbortController();

    setState((current) => ({
      ...current,
      error: null,
      status: 'loading',
    }));
    legacyBbsGet<LegacyBbsHomeFeedsResponse>(
      '/home/feeds',
      { pageSize: HOME_FEED_MAX_ITEMS },
      controller.signal,
    )
      .then((data) => {
        setState({
          data: adaptLegacyBbsHomeFeeds(data),
          error: null,
          status: 'ready',
        });
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return;
        }

        setState({
          data: null,
          error: getErrorMessage(requestError),
          status: 'error',
        });
      });

    return () => controller.abort();
  }, [enabled]);

  return state;
}
