import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adaptLegacyBbsHome, resolveLegacyBbsBoardName } from '../legacyBbsAdapters';
import { hasLegacyToken, syncLegacyTokenCookie } from '../legacyBbsClient/authSession';
import { legacyBbsGet, legacyBbsPost } from '../legacyBbsClient';
import { clearCachedLegacyCurrentUserRows } from '../legacyBbsClient/currentUser';
import { legacyForumBoards } from '../../data/forumBoards';
import { clearAllCachedLegacyBbsResponses } from './requestCache';
import type {
  LegacyBbsAuthResponse,
  LegacyBbsBootstrapResponse,
  LegacyBbsRegisterDraft,
  LegacyBbsSessionViewerResponse,
  LegacyBbsViewer,
} from '../legacyBbsClient';
import { getErrorMessage, isAbortError } from './requestState';
import { SIDEBAR_PRIMARY_BOARD_COUNT, type LegacyBbsContextValue, type LegacyBbsStatus } from './types';

const LegacyBbsContext = createContext<LegacyBbsContextValue>({
  allBoards: [],
  error: null,
  ensureBootstrap: () => undefined,
  getBoardSummary: () => null,
  getThreadPreview: () => null,
  hasBootstrap: false,
  home: null,
  isSessionRestoring: false,
  login: async () => ({ token: '', viewer: null }),
  logout: async () => undefined,
  moreBoards: [],
  primaryBoards: [],
  randomThreadBoards: [],
  randomThreadIds: [],
  register: async () => ({ token: '', viewer: null }),
  reloadBootstrap: () => undefined,
  resolveBoardId: () => null,
  resolveBoardNameById: () => null,
  status: 'idle',
  syncViewer: () => undefined,
  warmCollapsedBoards: () => undefined,
  warmPrimaryBoards: () => undefined,
  viewer: null,
});

export function LegacyBbsDataProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<LegacyBbsBootstrapResponse | null>(null);
  const [status, setStatus] = useState<LegacyBbsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSessionRestoring, setIsSessionRestoring] = useState(hasLegacyToken);
  const [viewerOverride, setViewerOverride] = useState<LegacyBbsViewer>(null);
  const bootstrapControllerRef = useRef<AbortController | null>(null);
  const bootstrapRequestRef = useRef<Promise<LegacyBbsBootstrapResponse> | null>(null);
  const sessionViewerControllerRef = useRef<AbortController | null>(null);
  const sessionViewerRequestRef = useRef<Promise<LegacyBbsSessionViewerResponse> | null>(null);
  const hasRefreshedSessionViewerRef = useRef(false);

  const startBootstrapRequest = useCallback(() => {
    const controller = new AbortController();
    const request = legacyBbsGet<LegacyBbsBootstrapResponse>('/bootstrap', undefined, controller.signal);

    syncLegacyTokenCookie();
    bootstrapControllerRef.current = controller;
    bootstrapRequestRef.current = request;
    setIsSessionRestoring(hasLegacyToken());
    setStatus('loading');
    setError(null);
    request
      .then((data) => {
        setBootstrap(data);
        setIsSessionRestoring(false);
        setStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return;
        }

        setIsSessionRestoring(false);
        setError(getErrorMessage(requestError));
        setStatus('error');
      })
      .finally(() => {
        if (bootstrapRequestRef.current === request) {
          bootstrapRequestRef.current = null;
        }

        if (bootstrapControllerRef.current === controller) {
          bootstrapControllerRef.current = null;
        }
      });
  }, []);

  const ensureBootstrap = useCallback(() => {
    if (bootstrap || bootstrapRequestRef.current) {
      return;
    }

    startBootstrapRequest();
  }, [bootstrap, startBootstrapRequest]);

  const reloadBootstrap = useCallback(() => {
    bootstrapControllerRef.current?.abort();
    sessionViewerControllerRef.current?.abort();
    bootstrapRequestRef.current = null;
    sessionViewerRequestRef.current = null;
    clearAllCachedLegacyBbsResponses();
    clearCachedLegacyCurrentUserRows();
    hasRefreshedSessionViewerRef.current = false;
    setBootstrap(null);
    setViewerOverride(null);
    startBootstrapRequest();
  }, [startBootstrapRequest]);

  useEffect(
    () => () => {
      bootstrapControllerRef.current?.abort();
      sessionViewerControllerRef.current?.abort();
    },
    [],
  );

  const restoreSessionViewer = useCallback(() => {
    if (!syncLegacyTokenCookie()) {
      hasRefreshedSessionViewerRef.current = false;
      setIsSessionRestoring(false);
      return;
    }

    if (hasRefreshedSessionViewerRef.current || sessionViewerRequestRef.current) {
      return;
    }

    const controller = new AbortController();
    const request = legacyBbsGet<LegacyBbsSessionViewerResponse>('/session/viewer', undefined, controller.signal);

    hasRefreshedSessionViewerRef.current = true;
    sessionViewerControllerRef.current = controller;
    sessionViewerRequestRef.current = request;
    setIsSessionRestoring(true);
    request
      .then((data) => {
        setViewerOverride(data.viewer);
        setBootstrap((current) =>
          current
            ? {
                ...current,
                unread: data.unread,
                viewer: data.viewer,
              }
            : current,
        );
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return;
        }
      })
      .finally(() => {
        if (sessionViewerRequestRef.current === request) {
          sessionViewerRequestRef.current = null;
          setIsSessionRestoring(false);
        }

        if (sessionViewerControllerRef.current === controller) {
          sessionViewerControllerRef.current = null;
        }
      });
  }, []);

  useEffect(() => {
    restoreSessionViewer();
  }, [restoreSessionViewer]);

  const activeViewer = viewerOverride ?? bootstrap?.viewer ?? null;
  const hasBootstrap = Boolean(bootstrap);

  const warmPrimaryBoards = useCallback(() => undefined, []);
  const warmCollapsedBoards = useCallback(() => undefined, []);

  const boardSummaries = bootstrap?.boards ?? legacyForumBoards;
  const visibleBoards = useMemo(
    () => boardSummaries.filter((board) => !board.hidden && board.name.trim().length > 0),
    [boardSummaries],
  );
  const allBoards = useMemo(() => visibleBoards.map((board) => board.name), [visibleBoards]);
  const primaryBoards = useMemo(() => allBoards.slice(0, SIDEBAR_PRIMARY_BOARD_COUNT), [allBoards]);
  const moreBoards = useMemo(() => allBoards.slice(SIDEBAR_PRIMARY_BOARD_COUNT), [allBoards]);
  const randomThreadBoards = visibleBoards;
  const home = useMemo(() => (bootstrap ? adaptLegacyBbsHome(bootstrap) : null), [bootstrap]);
  const threadPreviews = useMemo(() => home?.threadPreviews ?? [], [home]);
  const randomThreadIds = useMemo(() => threadPreviews.map((thread) => thread.id), [threadPreviews]);
  const login = useCallback(async (username: string, passwordHash: string) => {
    const data = await legacyBbsPost<LegacyBbsAuthResponse>('/auth/login', {
      passwordHash,
      username,
    });

    hasRefreshedSessionViewerRef.current = true;
    setViewerOverride(data.viewer);
    setBootstrap((current) => (current ? { ...current, viewer: data.viewer } : current));

    return data;
  }, []);
  const register = useCallback(async (draft: LegacyBbsRegisterDraft) => {
    const data = await legacyBbsPost<LegacyBbsAuthResponse>('/auth/register', draft);

    hasRefreshedSessionViewerRef.current = true;
    setViewerOverride(data.viewer);
    setBootstrap((current) => (current ? { ...current, viewer: data.viewer } : current));

    return data;
  }, []);
  const logout = useCallback(async () => {
    try {
      await legacyBbsPost<{ ok: boolean }>('/auth/logout');
    } finally {
      sessionViewerControllerRef.current?.abort();
      sessionViewerControllerRef.current = null;
      sessionViewerRequestRef.current = null;
      clearCachedLegacyCurrentUserRows();
      hasRefreshedSessionViewerRef.current = false;
      setIsSessionRestoring(false);
      setViewerOverride(null);
      setBootstrap((current) => (current ? { ...current, viewer: null } : current));
    }
  }, []);
  const syncViewer = useCallback((viewer: LegacyBbsViewer) => {
    setViewerOverride(viewer);
    setBootstrap((current) => (current ? { ...current, viewer } : current));
  }, []);

  const value = useMemo<LegacyBbsContextValue>(
    () => ({
      allBoards,
      ensureBootstrap,
      error,
      getBoardSummary: (boardName) => {
        if (!boardName) {
          return null;
        }

        return resolveLegacyBbsBoardName(boardName, boardSummaries);
      },
      getThreadPreview: (threadId) => {
        if (!threadId) {
          return null;
        }

        return threadPreviews.find((thread) => thread.id === threadId) ?? null;
      },
      hasBootstrap,
      home,
      isSessionRestoring,
      login,
      logout,
      moreBoards,
      primaryBoards,
      randomThreadBoards,
      randomThreadIds,
      register,
      reloadBootstrap,
      resolveBoardId: (boardName) => {
        if (!boardName) {
          return null;
        }

        return resolveLegacyBbsBoardName(boardName, boardSummaries)?.bid ?? null;
      },
      resolveBoardNameById: (bid) => {
        if (!bid) {
          return null;
        }

        const board = boardSummaries.find((item) => item.bid === bid);

        return board?.name || board?.title || null;
      },
      status,
      syncViewer,
      warmCollapsedBoards,
      warmPrimaryBoards,
      viewer: activeViewer,
    }),
    [activeViewer, allBoards, boardSummaries, bootstrap, ensureBootstrap, error, hasBootstrap, home, isSessionRestoring, login, logout, moreBoards, primaryBoards, randomThreadBoards, randomThreadIds, register, reloadBootstrap, status, syncViewer, threadPreviews, warmCollapsedBoards, warmPrimaryBoards],
  );

  return <LegacyBbsContext.Provider value={value}>{children}</LegacyBbsContext.Provider>;
}

export function useLegacyBbs() {
  return useContext(LegacyBbsContext);
}
