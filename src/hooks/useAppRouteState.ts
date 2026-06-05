import { useMemo } from 'react';
import type { useLegacyBbs } from '../api/LegacyBbsDataContext';
import { getThreadDetail } from '../data/threadDetails';
import { isOwnPublicProfileIdentifier } from '../data/publicProfiles';
import type { AuthMode } from '../routes/AuthRoute';
import type { SidebarActiveItem } from '../components/layout/Sidebar';
import { isLoginPath, isRegisterPath } from '../utils/authRoutes';
import { getBoardNameFromPath, getBoardNewThreadNameFromPath } from '../utils/boardRoutes';
import { getLegacyRouteCompatPath } from '../utils/legacyRouteCompat';
import {
  getThreadActivityAdminTargetFromPath,
  getThreadEditTargetFromPath,
  getThreadIdFromPath,
} from '../utils/threadRoutes';
import { getPublicProfileNameFromLocation } from '../utils/userRoutes';
import { isGuestViewer } from '../utils/viewerPermissions';

const USER_CENTER_PATH = '/user-center';
const SEARCH_PATH = '/search';
const DATA_DISPLAY_PATH = '/stats';
const ARCHIVE_PATH = '/archive';
const ARCHIVE_ROUTE_ENABLED = false;
const CALENDAR_ADMIN_PATH = '/calendar-admin';
const BOARD_ROUTE_PREFIX = '/boards/';
const THREAD_ROUTE_PREFIX = '/threads/';

type LegacyBbsValue = ReturnType<typeof useLegacyBbs>;

type AppLocation = {
  hash: string;
  pathname: string;
  search: string;
};

type UseAppRouteStateOptions = {
  legacyBbs: LegacyBbsValue;
  location: AppLocation;
};

export function useAppRouteState({ legacyBbs, location }: UseAppRouteStateOptions) {
  const pathname = normalizeAppPathname(location.pathname);
  const isHomeRoute = pathname === '/';
  const isUserCenterRoute = pathname === USER_CENTER_PATH;
  const isSearchRoute = pathname === SEARCH_PATH;
  const isDataDisplayRoute = pathname === DATA_DISPLAY_PATH;
  const isArchiveRoute = ARCHIVE_ROUTE_ENABLED && pathname === ARCHIVE_PATH;
  const isCalendarAdminRoute = pathname === CALENDAR_ADMIN_PATH;
  const authMode: AuthMode | null = isLoginPath(pathname)
    ? 'login'
    : isRegisterPath(pathname)
      ? 'register'
      : null;
  const isAuthRoute = authMode !== null;
  const publicProfileName = getStrictPublicProfileName(pathname, location.search);
  const isPublicProfileRoute = publicProfileName !== null;
  const boardRouteKind = getBoardRouteKind(pathname);
  const routedBoardName = boardRouteKind ? getBoardNameFromPath(pathname) : null;
  const activeBoardName = boardRouteKind === 'board' ? routedBoardName : null;
  const activeBoardNewThreadName = boardRouteKind === 'newThread' ? getBoardNewThreadNameFromPath(pathname) : null;
  const isBoardRoute = boardRouteKind === 'board' && activeBoardName !== null;
  const isBoardNewThreadRoute = activeBoardNewThreadName !== null;
  const threadRouteKind = getThreadRouteKind(pathname);
  const activeThreadId = threadRouteKind ? getThreadIdFromPath(pathname) : null;
  const activeThreadActivityAdminTarget =
    threadRouteKind === 'activityAdmin' ? getThreadActivityAdminTargetFromPath(pathname) : null;
  const activeThreadEditTarget = threadRouteKind === 'edit' ? getThreadEditTargetFromPath(pathname) : null;
  const activeThread = getThreadDetail(activeThreadId);
  const activeThreadPreview = legacyBbs.getThreadPreview(activeThreadId);
  const activeThreadBoard =
    activeThread?.board ?? activeThreadPreview?.board ?? getThreadBoardNameFromId(activeThreadId, legacyBbs.resolveBoardNameById);
  const activeThreadTitle = activeThread?.title ?? activeThreadPreview?.title;
  const isThreadRoute = threadRouteKind !== null && activeThreadId !== null;
  const isThreadActivityAdminRoute = activeThreadActivityAdminTarget !== null;
  const isThreadEditRoute = activeThreadEditTarget !== null;
  const isThreadReadingRoute = threadRouteKind === 'reading' && isThreadRoute;
  const isOwnPublicProfileRoute = isOwnPublicProfileIdentifier(publicProfileName);
  const isGuest = isGuestViewer(legacyBbs.viewer);
  const activeSidebarItem: SidebarActiveItem =
    isSearchRoute
      ? null
      : isDataDisplayRoute
        ? 'stats'
        : isArchiveRoute
          ? 'archive'
          : !isGuest && (isUserCenterRoute || isOwnPublicProfileRoute)
            ? 'me'
            : isHomeRoute
              ? 'home'
              : null;
  const legacyRouteCompatResult = useMemo(
    () =>
      getLegacyRouteCompatPath({
        hash: location.hash,
        isBoardLookupPending: legacyBbs.status === 'idle' || legacyBbs.status === 'loading',
        pathname: location.pathname,
        resolveBoardNameById: legacyBbs.resolveBoardNameById,
        search: location.search,
      }),
    [
      legacyBbs.resolveBoardNameById,
      legacyBbs.status,
      location.hash,
      location.pathname,
      location.search,
    ],
  );
  const isLegacyRouteWaiting = legacyRouteCompatResult?.status === 'wait';
  const isKnownRoute =
    isHomeRoute ||
    isAuthRoute ||
    isUserCenterRoute ||
    isPublicProfileRoute ||
    isSearchRoute ||
    isDataDisplayRoute ||
    isArchiveRoute ||
    isCalendarAdminRoute ||
    isBoardNewThreadRoute ||
    isBoardRoute ||
    isThreadActivityAdminRoute ||
    isThreadEditRoute ||
    isThreadRoute;
  const isNotFoundRoute = !isKnownRoute && !legacyRouteCompatResult;

  return {
    activeBoardName,
    activeBoardNewThreadName,
    activeSidebarItem,
    activeThreadActivityAdminTarget,
    activeThreadBoard,
    activeThreadEditTarget,
    activeThreadId,
    activeThreadTitle,
    authMode,
    isArchiveRoute,
    isAuthRoute,
    isBoardNewThreadRoute,
    isBoardRoute,
    isCalendarAdminRoute,
    isDataDisplayRoute,
    isGuest,
    isHomeRoute,
    isLegacyRouteWaiting,
    isNotFoundRoute,
    isOwnPublicProfileRoute,
    isPublicProfileRoute,
    isSearchRoute,
    isThreadActivityAdminRoute,
    isThreadEditRoute,
    isThreadReadingRoute,
    isThreadRoute,
    isUserCenterRoute,
    legacyRouteCompatResult,
    publicProfileName,
  };
}

function normalizeAppPathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname || '/';
}

function getStrictPublicProfileName(pathname: string, search: string) {
  if (pathname === '/users') {
    return getPublicProfileNameFromLocation(pathname, search);
  }

  if (!pathname.startsWith('/users/')) {
    return null;
  }

  const encodedUserSlug = pathname.slice('/users/'.length);

  if (!encodedUserSlug || encodedUserSlug.includes('/')) {
    return null;
  }

  try {
    return getPublicProfileNameFromLocation(pathname, search);
  } catch {
    return null;
  }
}

function getBoardRouteKind(pathname: string) {
  if (!pathname.startsWith(BOARD_ROUTE_PREFIX)) {
    return null;
  }

  const encodedBoardName = pathname.slice(BOARD_ROUTE_PREFIX.length).split('/')[0];

  if (!encodedBoardName) {
    return null;
  }

  const suffix = pathname.slice(BOARD_ROUTE_PREFIX.length + encodedBoardName.length);

  if (!suffix) {
    return 'board' as const;
  }

  return suffix === '/new' ? 'newThread' as const : null;
}

function getThreadRouteKind(pathname: string) {
  if (!pathname.startsWith(THREAD_ROUTE_PREFIX)) {
    return null;
  }

  const encodedThreadId = pathname.slice(THREAD_ROUTE_PREFIX.length).split('/')[0];

  if (!encodedThreadId) {
    return null;
  }

  const suffix = pathname.slice(THREAD_ROUTE_PREFIX.length + encodedThreadId.length);

  if (!suffix) {
    return 'reading' as const;
  }

  if (suffix === '/activity-admin') {
    return 'activityAdmin' as const;
  }

  if (suffix === '/edit' || /^\/floors\/\d+\/edit$/.test(suffix)) {
    return 'edit' as const;
  }

  return null;
}

function getThreadBoardNameFromId(
  threadId: string | null,
  resolveBoardNameById: (bid: number | null) => string | null,
) {
  if (!threadId) {
    return undefined;
  }

  const bid = Number.parseInt(threadId.split('-')[0] ?? '', 10);

  if (!Number.isFinite(bid) || bid <= 0) {
    return undefined;
  }

  return resolveBoardNameById(bid) ?? undefined;
}
