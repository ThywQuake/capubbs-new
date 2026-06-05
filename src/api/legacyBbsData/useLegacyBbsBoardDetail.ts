import { useEffect, useState } from 'react';
import { adaptLegacyBbsBoardDetail } from '../legacyBbsAdapters';
import {
  legacyBbsGet,
  type LegacyBbsBoardDetailResponse,
  type LegacyBbsBoardThreadsResponse,
  type LegacyBbsBoardViewerState,
} from '../legacyBbsClient';
import { useLegacyBbs } from './context';
import { getErrorMessage, isAbortError } from './requestState';
import { fetchCachedLegacyBbsResponse, readCachedLegacyBbsResponse, writeCachedLegacyBbsResponse } from './requestCache';
import { getBoardDetailCacheKey, getBoardThreadsCacheKey, getBoardViewerStateCacheKey } from './requestKeys';
import type { LegacyBbsBoardDetailState, LegacyBbsThreadType } from './types';
import { getLegacyViewerRequestKey } from './viewerKey';
import type { BoardSort } from '../../types/forum';

export function useLegacyBbsBoardDetail(
  boardName: string | null,
  options: {
    page: number;
    pageSize: number;
    sort: BoardSort;
    type: LegacyBbsThreadType;
  },
): LegacyBbsBoardDetailState {
  const legacyBbs = useLegacyBbs();
  const bid = legacyBbs.resolveBoardId(boardName);
  const viewerKey = getLegacyViewerRequestKey(legacyBbs.viewer);
  const requestPage = Math.max(1, Math.floor(options.page));
  const requestPageSize = Math.max(1, Math.floor(options.pageSize));
  const requestCursor = (requestPage - 1) * requestPageSize;
  const detailRequestKey =
    bid && boardName
      ? getBoardDetailCacheKey({
          bid,
          cursor: requestCursor,
          pageSize: requestPageSize,
          sort: options.sort,
          type: options.type,
          viewerKey,
        })
      : '';
  const threadListRequestKey =
    bid && boardName
      ? getBoardThreadsCacheKey({
          bid,
          cursor: requestCursor,
          pageSize: requestPageSize,
          sort: options.sort,
          type: options.type,
          viewerKey,
        })
      : '';
  const viewerStateRequestKey = bid && boardName ? getBoardViewerStateCacheKey(bid, viewerKey) : '';
  const [state, setState] = useState<LegacyBbsBoardDetailState>({
    board: null,
    canGlobalPin: false,
    canModerate: false,
    canPost: false,
    error: null,
    isResolvingBoard: false,
    status: 'idle',
  });

  useEffect(() => {
    if (!boardName) {
      setState({
        board: null,
        canGlobalPin: false,
        canModerate: false,
        canPost: false,
        error: null,
        isResolvingBoard: false,
        status: 'idle',
      });
      return;
    }

    if (!bid) {
      setState({
        board: null,
        canGlobalPin: false,
        canModerate: false,
        canPost: false,
        error: null,
        isResolvingBoard: legacyBbs.status === 'loading',
        status: legacyBbs.status === 'loading' ? 'loading' : 'idle',
      });
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;
    const cachedBoardDetail = readCachedLegacyBbsResponse<LegacyBbsBoardDetailResponse>(detailRequestKey);
    const cachedViewerState =
      viewerStateRequestKey
        ? readCachedLegacyBbsResponse<LegacyBbsBoardViewerState>(viewerStateRequestKey)
        : null;

    if (cachedBoardDetail) {
      if (viewerStateRequestKey) {
        writeCachedLegacyBbsResponse(viewerStateRequestKey, cachedBoardDetail.viewerState);
      }

      setState({
        board: adaptLegacyBbsBoardDetail(cachedBoardDetail.board, cachedBoardDetail.items, boardName, {
          cursor: cachedBoardDetail.cursor,
          hasMore: cachedBoardDetail.hasMore,
          pageSize: cachedBoardDetail.pageSize,
          total: cachedBoardDetail.total,
        }),
        canGlobalPin: cachedBoardDetail.viewerState.canGlobalPin,
        canModerate: cachedBoardDetail.viewerState.canModerate,
        canPost: cachedBoardDetail.viewerState.canPost,
        error: null,
        isResolvingBoard: false,
        status: 'ready',
      });
      return () => controller.abort();
    }

    const cachedBoardThreads = readCachedLegacyBbsResponse<LegacyBbsBoardThreadsResponse>(threadListRequestKey);

    if (cachedBoardThreads) {
      setState({
        board: adaptLegacyBbsBoardDetail(cachedBoardThreads.board, cachedBoardThreads.items, boardName, {
          cursor: cachedBoardThreads.cursor,
          hasMore: cachedBoardThreads.hasMore,
          pageSize: cachedBoardThreads.pageSize,
          total: cachedBoardThreads.total,
        }),
        canGlobalPin: cachedViewerState?.canGlobalPin ?? false,
        canModerate: cachedViewerState?.canModerate ?? false,
        canPost: cachedViewerState?.canPost ?? Boolean(legacyBbs.viewer),
        error: null,
        isResolvingBoard: false,
        status: 'ready',
      });

      if (cachedViewerState || !viewerStateRequestKey) {
        return () => controller.abort();
      }

      fetchCachedLegacyBbsResponse<LegacyBbsBoardViewerState>(
        viewerStateRequestKey,
        () => legacyBbsGet<LegacyBbsBoardViewerState>(`/boards/${bid}/viewer-state`, undefined, controller.signal),
      )
        .then((viewerState) => {
          if (!isCurrentRequest) {
            return;
          }

          setState((current) => ({
            ...current,
            canGlobalPin: viewerState.canGlobalPin,
            canModerate: viewerState.canModerate,
            canPost: viewerState.canPost,
            error: null,
            isResolvingBoard: false,
            status: 'ready',
          }));
        })
        .catch((requestError: unknown) => {
          if (!isCurrentRequest || isAbortError(requestError)) {
            return;
          }

          setState((current) => ({
            ...current,
            error: null,
            isResolvingBoard: false,
            status: 'ready',
          }));
        });

      return () => {
        isCurrentRequest = false;
        controller.abort();
      };
    } else {
      setState((current) => ({
        ...current,
        error: null,
        isResolvingBoard: false,
        status: 'loading',
      }));
    }

    fetchCachedLegacyBbsResponse<LegacyBbsBoardDetailResponse>(
      detailRequestKey,
      () =>
        legacyBbsGet<LegacyBbsBoardDetailResponse>(
          `/boards/${bid}`,
          {
            cursor: requestCursor,
            pageSize: requestPageSize,
            sort: options.sort,
            type: options.type,
          },
          controller.signal,
        ),
    )
      .then((data) => {
        if (!isCurrentRequest) {
          return;
        }

        if (viewerStateRequestKey) {
          writeCachedLegacyBbsResponse(viewerStateRequestKey, data.viewerState);
        }

        setState({
          board: adaptLegacyBbsBoardDetail(data.board, data.items, boardName, {
            cursor: data.cursor,
            hasMore: data.hasMore,
            pageSize: data.pageSize,
            total: data.total,
          }),
          canGlobalPin: data.viewerState.canGlobalPin,
          canModerate: data.viewerState.canModerate,
          canPost: data.viewerState.canPost,
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
          board: null,
          canGlobalPin: false,
          canModerate: false,
          canPost: false,
          error: getErrorMessage(requestError),
          isResolvingBoard: false,
          status: 'error',
        });
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [legacyBbs.status, legacyBbs.viewer, bid, boardName, options.sort, options.type, requestCursor, detailRequestKey, requestPageSize, threadListRequestKey, viewerKey, viewerStateRequestKey]);

  const isWaitingForBootstrap = Boolean(boardName) && !bid && legacyBbs.status === 'loading';

  return {
    ...state,
    isResolvingBoard: state.isResolvingBoard || isWaitingForBootstrap,
    status: isWaitingForBootstrap ? 'loading' : state.status,
  };
}
