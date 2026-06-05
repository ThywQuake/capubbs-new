import { useEffect, useMemo, useState } from 'react';
import { adaptLegacyBbsThreadDetail, parseLegacyThreadId } from '../legacyBbsAdapters';
import {
  legacyBbsGet,
  type LegacyBbsThreadResponse,
} from '../legacyBbsClient';
import { readLegacyToken } from '../legacyBbsClient/authSession';
import { getErrorMessage, isAbortError } from './requestState';
import {
  LEGACY_THREAD_CONTENT_PAGE_SIZE,
  type LegacyBbsThreadDetailState,
} from './types';
import { fetchCachedLegacyBbsResponse, readCachedLegacyBbsResponse } from './requestCache';
import { getThreadDetailCacheKey } from './requestKeys';

export function useLegacyBbsThreadDetail(
  threadId: string | null,
  targetFloorNumber: number | null = null,
  page: number | null = null,
  authorOnly = false,
): LegacyBbsThreadDetailState {
  const target = useMemo(() => parseLegacyThreadId(threadId), [threadId]);
  const targetKey = target ? `${target.bid}-${target.tid}` : '';
  const threadPage = getLegacyThreadPage(targetFloorNumber, page);
  const viewerKey = readLegacyToken() || 'guest';
  const requestKey = target
    ? getThreadDetailCacheKey({
        authorOnly,
        bid: target.bid,
        page: threadPage,
        tid: target.tid,
        viewerKey,
      })
    : '';
  const [state, setState] = useState<LegacyBbsThreadDetailState>({
    error: null,
    isLegacyThreadId: false,
    status: 'idle',
    thread: null,
  });

  useEffect(() => {
    if (!target) {
      setState({
        error: null,
        isLegacyThreadId: false,
        status: 'idle',
        thread: null,
      });
      return;
    }

    let isCurrentRequest = true;
    const cachedThreadResponse = readCachedLegacyBbsResponse<LegacyBbsThreadResponse>(requestKey);

    if (cachedThreadResponse) {
      setState({
        error: null,
        isLegacyThreadId: true,
        status: 'ready',
        thread: adaptLegacyBbsThreadDetail(cachedThreadResponse),
      });
    } else {
      setState((current) => ({
        ...current,
        error: null,
        isLegacyThreadId: true,
        status: 'loading',
      }));
    }

    fetchCachedLegacyBbsResponse<LegacyBbsThreadResponse>(
      requestKey,
      () =>
        legacyBbsGet<LegacyBbsThreadResponse>(
          `/threads/${target.bid}/${target.tid}`,
          {
            authorOnly: authorOnly ? 1 : undefined,
            page: threadPage,
          },
        ),
    )
      .then((threadResponse) => {
        if (!isCurrentRequest) {
          return;
        }

        setState({
          error: null,
          isLegacyThreadId: true,
          status: 'ready',
          thread: adaptLegacyBbsThreadDetail(threadResponse),
        });
      })
      .catch((requestError: unknown) => {
        if (!isCurrentRequest || isAbortError(requestError)) {
          return;
        }

        setState({
          error: getErrorMessage(requestError),
          isLegacyThreadId: true,
          status: 'error',
          thread: null,
        });
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [authorOnly, requestKey, target, targetKey, threadPage]);

  const isLegacyThreadId = Boolean(target);

  return {
    ...state,
    isLegacyThreadId,
    status: isLegacyThreadId && state.status === 'idle' ? 'loading' : state.status,
  };
}

function getLegacyThreadPage(targetFloorNumber: number | null, page: number | null) {
  if (page && page > 0) {
    return Math.floor(page);
  }

  if (!targetFloorNumber || targetFloorNumber <= LEGACY_THREAD_CONTENT_PAGE_SIZE) {
    return 1;
  }

  return Math.max(1, Math.ceil(targetFloorNumber / LEGACY_THREAD_CONTENT_PAGE_SIZE));
}
