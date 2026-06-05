import { useCallback, useEffect, useState } from 'react';
import { adaptLegacyBbsUserCenter, adaptLegacyBbsUserCenterRecords } from '../legacyBbsAdapters';
import { legacyBbsGet, type LegacyBbsUserCenterResponse } from '../legacyBbsClient';
import { useLegacyBbs } from './context';
import { getErrorMessage, isAbortError } from './requestState';
import { clearCachedLegacyBbsResponse, fetchFreshLegacyBbsResponse, readCachedLegacyBbsResponse } from './requestCache';
import { getUserCenterCacheKey } from './requestKeys';
import type { LegacyBbsUserCenterState } from './types';
import { getLegacyViewerRequestKey } from './viewerKey';

type UserCenterRemoteRecordTab = 'activities' | 'bookmarks' | 'posts' | 'replies';
const USER_CENTER_REMOTE_RECORD_TABS: UserCenterRemoteRecordTab[] = ['activities', 'bookmarks', 'posts', 'replies'];

export function useLegacyBbsUserCenter(
  enabled: boolean,
  activeRecordTab: UserCenterRemoteRecordTab | null = null,
): LegacyBbsUserCenterState {
  const { syncViewer, viewer } = useLegacyBbs();
  const viewerKey = getLegacyViewerRequestKey(viewer);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<Omit<LegacyBbsUserCenterState, 'reload'>>({
    data: null,
    error: null,
    status: 'idle',
  });
  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    if (!enabled || !viewerKey) {
      setState({
        data: null,
        error: null,
        status: 'idle',
      });
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;
    const requestKey = getUserCenterCacheKey(viewerKey, 'profile');
    let cachedUserCenter = reloadToken === 0 ? readCachedLegacyBbsResponse<LegacyBbsUserCenterResponse>(requestKey) : null;

    if (reloadToken > 0) {
      clearCachedLegacyBbsResponse(requestKey);
    }

    if (cachedUserCenter) {
      const responseViewerKey = getLegacyViewerRequestKey(cachedUserCenter.viewer);

      if (responseViewerKey && responseViewerKey !== viewerKey) {
        clearCachedLegacyBbsResponse(requestKey);
        cachedUserCenter = null;
      } else {
        const cachedProfile = cachedUserCenter;

        syncViewer(cachedProfile.viewer);
        setState((current) => ({
          data: mergeCachedLegacyBbsUserCenterRecords(
            mergeLegacyBbsUserCenterProfile(current.data, cachedProfile),
            viewerKey,
          ),
          error: null,
          status: 'ready',
        }));
      }
    }

    if (!cachedUserCenter) {
      setState({
        data: null,
        error: null,
        status: 'loading',
      });
    }

    fetchFreshLegacyBbsResponse<LegacyBbsUserCenterResponse>(
      requestKey,
      () => legacyBbsGet<LegacyBbsUserCenterResponse>('/user-center', { scope: 'profile' }, controller.signal),
    )
      .then((data) => {
        if (!isCurrentRequest) {
          return;
        }

        const responseViewerKey = getLegacyViewerRequestKey(data.viewer);
        if (responseViewerKey && responseViewerKey !== viewerKey) {
          setState({
            data: null,
            error: '登录态仍指向上一个账号，请重新登录后再打开个人中心',
            status: 'error',
          });
          return;
        }

        syncViewer(data.viewer);
        setState((current) => ({
          data: mergeCachedLegacyBbsUserCenterRecords(
            mergeLegacyBbsUserCenterProfile(current.data, data),
            viewerKey,
          ),
          error: null,
          status: 'ready',
        }));
      })
      .catch((requestError: unknown) => {
        if (!isCurrentRequest || isAbortError(requestError)) {
          return;
        }

        setState((current) => ({
          data: current.data,
          error: getErrorMessage(requestError),
          status: current.data ? 'ready' : 'error',
        }));
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [enabled, reloadToken, syncViewer, viewerKey]);

  useEffect(() => {
    if (!enabled || !viewerKey || !activeRecordTab) {
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;
    const requestKey = getUserCenterCacheKey(viewerKey, `records:${activeRecordTab}`);
    const cachedRecords = reloadToken === 0 ? readCachedLegacyBbsResponse<LegacyBbsUserCenterResponse['records']>(requestKey) : null;

    if (reloadToken > 0) {
      clearCachedLegacyBbsResponse(requestKey);
    }

    if (cachedRecords) {
      setState((current) => ({
        ...current,
        data: current.data ? mergeLegacyBbsUserCenterRecords(current.data, cachedRecords, activeRecordTab) : current.data,
      }));
    }

    fetchFreshLegacyBbsResponse<LegacyBbsUserCenterResponse['records']>(
      requestKey,
      () =>
        legacyBbsGet<LegacyBbsUserCenterResponse['records']>(
          '/user-center',
          { recordTab: activeRecordTab },
          controller.signal,
        ),
    )
      .then((records) => {
        if (!isCurrentRequest) {
          return;
        }

        setState((current) => ({
          ...current,
          data: current.data ? mergeLegacyBbsUserCenterRecords(current.data, records, activeRecordTab) : current.data,
        }));
      })
      .catch((requestError: unknown) => {
        if (!isCurrentRequest || isAbortError(requestError)) {
          return;
        }

        setState((current) => ({
          data: current.data,
          error: getErrorMessage(requestError),
          status: current.data ? 'ready' : 'error',
        }));
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [activeRecordTab, enabled, reloadToken, viewerKey]);

  return {
    ...state,
    reload,
  };
}

function mergeLegacyBbsUserCenterProfile(
  currentData: LegacyBbsUserCenterState['data'],
  profileResponse: LegacyBbsUserCenterResponse,
): NonNullable<LegacyBbsUserCenterState['data']> {
  const nextData = adaptLegacyBbsUserCenter(profileResponse);

  return currentData
    ? {
        ...nextData,
        records: {
          ...nextData.records,
          activities: currentData.records.activities,
          bookmarks: currentData.records.bookmarks,
          drafts: currentData.records.drafts,
          posts: currentData.records.posts,
          replies: currentData.records.replies,
        },
      }
    : nextData;
}

function mergeLegacyBbsUserCenterRecords(
  currentData: NonNullable<LegacyBbsUserCenterState['data']>,
  records: LegacyBbsUserCenterResponse['records'],
  activeRecordTab: UserCenterRemoteRecordTab,
): NonNullable<LegacyBbsUserCenterState['data']> {
  const adaptedRecords = adaptLegacyBbsUserCenterRecords(records);

  return {
    ...currentData,
    records: {
      ...currentData.records,
      [activeRecordTab]: adaptedRecords[activeRecordTab],
    },
  };
}

function mergeCachedLegacyBbsUserCenterRecords(
  currentData: NonNullable<LegacyBbsUserCenterState['data']>,
  viewerKey: string,
): NonNullable<LegacyBbsUserCenterState['data']> {
  return USER_CENTER_REMOTE_RECORD_TABS.reduce((mergedData, recordTab) => {
    const cachedRecords = readCachedLegacyBbsResponse<LegacyBbsUserCenterResponse['records']>(
      getUserCenterCacheKey(viewerKey, `records:${recordTab}`),
    );

    return cachedRecords ? mergeLegacyBbsUserCenterRecords(mergedData, cachedRecords, recordTab) : mergedData;
  }, currentData);
}
