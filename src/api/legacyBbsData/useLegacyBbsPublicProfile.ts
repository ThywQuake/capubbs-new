import { useEffect, useState } from 'react';
import { adaptLegacyBbsPublicProfile } from '../legacyBbsAdapters';
import { legacyBbsGet, type LegacyBbsPublicProfileResponse } from '../legacyBbsClient';
import { fetchFreshLegacyBbsResponse, readCachedLegacyBbsResponse } from './requestCache';
import { getPublicProfileCacheKey } from './requestKeys';
import { getErrorMessage, isAbortError } from './requestState';
import type { LegacyBbsPublicProfileState } from './types';

export function useLegacyBbsPublicProfile(
  profileName: string | null,
  enabled: boolean,
): LegacyBbsPublicProfileState {
  const [state, setState] = useState<LegacyBbsPublicProfileState>({
    data: null,
    error: null,
    status: 'idle',
  });

  useEffect(() => {
    const normalizedProfileName = profileName?.trim();

    if (!enabled || !normalizedProfileName) {
      setState({
        data: null,
        error: null,
        status: 'idle',
      });
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;
    const requestKey = getPublicProfileCacheKey(normalizedProfileName);
    const cachedProfile = readCachedLegacyBbsResponse<LegacyBbsPublicProfileResponse>(requestKey);

    if (cachedProfile) {
      setState({
        data: adaptLegacyBbsPublicProfile(cachedProfile),
        error: null,
        status: 'ready',
      });
    } else {
      setState({
        data: null,
        error: null,
        status: 'loading',
      });
    }

    fetchFreshLegacyBbsResponse<LegacyBbsPublicProfileResponse>(
      requestKey,
      () =>
        legacyBbsGet<LegacyBbsPublicProfileResponse>(
          `/profiles/${encodeURIComponent(normalizedProfileName)}`,
          undefined,
          controller.signal,
        ),
    )
      .then((data) => {
        if (!isCurrentRequest) {
          return;
        }

        setState({
          data: adaptLegacyBbsPublicProfile(data),
          error: null,
          status: 'ready',
        });
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
  }, [enabled, profileName]);

  return state;
}
