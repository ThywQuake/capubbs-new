import { Fragment, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLegacyBbs } from './api/LegacyBbsDataContext';
import { ForumHomeRoute } from './components/home/ForumHomeRoute';
import { AppBackground } from './components/layout/AppBackground';
import { InterfaceSettingsDialog } from './components/layout/InterfaceSettingsDialog';
import { HomeSkeleton, ProfileSkeleton } from './components/layout/PageSkeleton';
import { MobileSidebarOverlay, type SidebarActiveItem } from './components/layout/Sidebar';
import { SidebarRouteLayout } from './components/layout/SidebarRouteLayout';
import { TopBar } from './components/layout/TopBar';
import { GuestUserCenterNotice } from './components/user/GuestUserCenterNotice';
import {
  boards,
  calendarEvents,
  hotThreads,
  latestReplies,
  latestTopics,
  moreBoards,
} from './data/forumHome';
import { useAppRouteState } from './hooks/useAppRouteState';
import { useAppMessages } from './hooks/useAppMessages';
import { useContentReady } from './hooks/useContentReady';
import { useInterfacePreferences } from './hooks/useInterfacePreferences';
import { useRandomThreadLogoNavigation } from './hooks/useRandomThreadLogoNavigation';
import { useReturnToTop } from './hooks/useReturnToTop';
import { useSidebarState } from './hooks/useSidebarState';
import { useThreadTopBarTitle } from './hooks/useThreadTopBarTitle';
import {
  ActivityAdminRoute,
  ArchiveRoute,
  AuthRoute,
  AuthRouteFallback,
  BoardRoute,
  CalendarAdminRoute,
  DataDisplayRoute,
  LazyRouteBoundary,
  NotFoundRoute,
  preloadSecondaryRoutes,
  PublicProfileRoute,
  SearchRoute,
  ThreadComposeRoute,
  ThreadEditRoute,
  ThreadRoute,
  UserCenterRoute,
} from './routes/lazyRoutes';
import type { ActivityBanner, CalendarEvent } from './types/forum';
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
} from './utils/interfaceSettingsStorage';

const EMPTY_HOME_ACTIVITIES: ActivityBanner[] = [];

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const legacyBbs = useLegacyBbs();
  const { interfaceSettings, isDark, toggleDarkMode, updateInterfaceSettings } = useInterfacePreferences();
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInterfaceSettingsOpen, setIsInterfaceSettingsOpen] = useState(false);
  const [softRefreshKey, setSoftRefreshKey] = useState(0);
  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);
  const softRefreshTimerRef = useRef<number | null>(null);
  const isContentReady = useContentReady();
  const [calendarEventsOverride, setCalendarEventsOverride] = useState<CalendarEvent[] | null>(null);
  const [loadedThreadTitle, setLoadedThreadTitle] = useState<{ id: string; title: string } | null>(null);
  const {
    collapseSidebarForThread,
    isSidebarCollapsed,
    isSidebarMinimized,
    isSidebarMinimizing,
    minimizeSidebar,
    minimizeSidebarForThread,
    restoreMinimizedSidebar,
    toggleSidebar,
  } = useSidebarState();
  const {
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
  } = useAppRouteState({ legacyBbs, location });
  const { isThreadTitleInTopBar, handleThreadContentScroll } = useThreadTopBarTitle({
    activeThreadId,
    isThreadReadingRoute,
    isTopBarCollapsed,
    showThreadTitleInTopBar: interfaceSettings.showThreadTitleInTopBar,
  });
  const activeLoadedThreadTitle = loadedThreadTitle?.id === activeThreadId ? loadedThreadTitle.title : undefined;
  const readingThreadTitle = activeLoadedThreadTitle ?? activeThreadTitle;
  const handleLoadedThreadTitleChange = useCallback((threadId: string, title: string) => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      return;
    }

    setLoadedThreadTitle((current) => {
      if (current?.id === threadId && current.title === normalizedTitle) {
        return current;
      }

      return {
        id: threadId,
        title: normalizedTitle,
      };
    });
  }, []);
  const {
    handleLogoClick: handleTopBarLogoClick,
    promptText: logoClickPrompt,
  } = useRandomThreadLogoNavigation({
    navigate,
    pathname: location.pathname,
    randomThreadBoards: legacyBbs.randomThreadBoards,
    randomThreadIds: legacyBbs.randomThreadIds,
  });

  const { mobileColumnRef, middleColumnRef, rightColumnRef, scrollAllColumnsToTop } = useReturnToTop();
  const homeData = legacyBbs.home;
  const hasRemoteHomeFeeds = Boolean(homeData);
  const homeActivities = homeData ? homeData.activities : EMPTY_HOME_ACTIVITIES;
  const homeHotThreads = homeData ? homeData.hotThreads : hotThreads;
  const homeLatestReplies = homeData ? homeData.latestReplies : latestReplies;
  const homeLatestTopics = homeData ? homeData.latestTopics : latestTopics;
  const homeCalendarEvents = homeData ? homeData.calendarEvents : calendarEvents;
  const displayedCalendarEvents = calendarEventsOverride ?? homeCalendarEvents;
  const alwaysShowCompactMode = interfaceSettings.alwaysShowCompactMode;
  const effectiveListCompactMode = alwaysShowCompactMode || interfaceSettings.listCompactMode;
  const handleListCompactModeChange = useCallback((compact: boolean) => {
    updateInterfaceSettings({
      ...interfaceSettings,
      listCompactMode: compact,
    });
  }, [interfaceSettings, updateInterfaceSettings]);
  const sidebarBoards = boards;
  const sidebarMoreBoards = moreBoards;
  const activeSidebarBoard = activeBoardName ?? activeBoardNewThreadName ?? activeThreadBoard ?? undefined;
  const { openDirectConversationFromProfile, openMessagesFromPage, topBarMessageProps } =
    useAppMessages(isGuest, legacyBbs.viewer?.unreadMessages ?? 0);
  const isHomeDataPending = isHomeRoute && !homeData && legacyBbs.status !== 'error';
  const isRouteChromePending =
    !isContentReady ||
    isLegacyRouteWaiting ||
    isHomeDataPending;
  const shouldRenderRouteSkeleton =
    (isRouteChromePending && !isThreadReadingRoute && !isNotFoundRoute) ||
    (isSoftRefreshing && !isNotFoundRoute);
  const skipApiWarmup = useCallback(() => undefined, []);
  const routeAddress = `${location.pathname}${location.search}${location.hash}`;

  const triggerSoftRefresh = useCallback(() => {
    if (softRefreshTimerRef.current !== null) {
      window.clearTimeout(softRefreshTimerRef.current);
    }

    setIsSoftRefreshing(true);
    setSoftRefreshKey((current) => current + 1);
    legacyBbs.reloadBootstrap();

    softRefreshTimerRef.current = window.setTimeout(() => {
      setIsSoftRefreshing(false);
      softRefreshTimerRef.current = null;
    }, 180);
  }, [legacyBbs.reloadBootstrap]);

  useEffect(() => {
    const handleRefreshShortcut = (event: KeyboardEvent) => {
      if (!isSoftRefreshShortcut(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!event.repeat) {
        triggerSoftRefresh();
      }
    };

    window.addEventListener('keydown', handleRefreshShortcut, true);

    return () => {
      window.removeEventListener('keydown', handleRefreshShortcut, true);
    };
  }, [triggerSoftRefresh]);

  useEffect(
    () => () => {
      if (softRefreshTimerRef.current !== null) {
        window.clearTimeout(softRefreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setIsSoftRefreshing(false);
  }, [routeAddress]);

  useEffect(() => {
    if (isHomeRoute) {
      legacyBbs.ensureBootstrap();
    }
  }, [isHomeRoute, legacyBbs.ensureBootstrap]);

  useEffect(() => {
    if (homeData) {
      preloadSecondaryRoutes();
    }
  }, [homeData]);

  useEffect(() => {
    if (!isThreadRoute) {
      return;
    }

    if (interfaceSettings.sidebarThreadCollapseMode === 'collapsed') {
      collapseSidebarForThread();
    }

    if (interfaceSettings.sidebarThreadCollapseMode === 'minimized') {
      minimizeSidebarForThread();
    }

    if (interfaceSettings.autoCollapseTopBarOnThread) {
      setIsTopBarCollapsed(true);
    }
  }, [
    activeThreadId,
    interfaceSettings.autoCollapseTopBarOnThread,
    interfaceSettings.sidebarThreadCollapseMode,
    isThreadRoute,
  ]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (legacyRouteCompatResult?.status === 'hardRedirect') {
      window.location.replace(legacyRouteCompatResult.path);
      return;
    }

    if (legacyRouteCompatResult?.status !== 'redirect') {
      return;
    }

    navigate(legacyRouteCompatResult.path, { replace: true });
  }, [legacyRouteCompatResult, navigate]);

  const renderSidebarRoute = (content: ReactNode, desktopActiveItem: SidebarActiveItem, activeBoard?: string) => (
    <SidebarRouteLayout
      activeBoard={activeBoard}
      activeItem={desktopActiveItem}
      autoExpandSidebarOnCollapsedOptionClick={interfaceSettings.autoExpandSidebarOnCollapsedOptionClick}
      boards={sidebarBoards}
      isSidebarCollapsed={isSidebarCollapsed}
      isSidebarMinimized={isSidebarMinimized}
      isSidebarMinimizing={isSidebarMinimizing}
      isTopBarCollapsed={isTopBarCollapsed}
      middleColumnRef={middleColumnRef}
      mobileColumnRef={mobileColumnRef}
      moreBoards={sidebarMoreBoards}
      onContentScroll={isThreadReadingRoute ? handleThreadContentScroll : undefined}
      onMinimizeSidebar={minimizeSidebar}
      onMoreBoardsExpand={skipApiWarmup}
      onOpenInterfaceSettings={() => setIsInterfaceSettingsOpen(true)}
      onRestoreMinimizedSidebar={restoreMinimizedSidebar}
      onToggleSidebar={toggleSidebar}
      showUserCenter={!isGuest}
    >
      {content}
    </SidebarRouteLayout>
  );

  const renderUserCenterRoute = () =>
    isGuest
      ? renderSidebarRoute(<GuestUserCenterNotice onGoHome={() => navigate('/')} />, null)
      : renderSidebarRoute(
          <LazyRouteBoundary>
            <UserCenterRoute
              showMessageAction
              onOpenMessages={openMessagesFromPage}
            />
          </LazyRouteBoundary>,
          'me',
        );

  const renderPublicProfileRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <PublicProfileRoute
          profileName={publicProfileName}
          showMessageAction={!isGuest}
          showUserCenterEntry={!isGuest}
          onOpenMessages={openDirectConversationFromProfile}
        />
      </LazyRouteBoundary>,
      !isGuest && isOwnPublicProfileRoute ? 'me' : null,
    );

  const renderSearchRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <SearchRoute topBarCollapsed={isTopBarCollapsed} />
      </LazyRouteBoundary>,
      null,
    );

  const renderDataDisplayRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <DataDisplayRoute />
      </LazyRouteBoundary>,
      'stats',
    );

  const renderArchiveRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <ArchiveRoute />
      </LazyRouteBoundary>,
      'archive',
    );

  const renderCalendarAdminRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <CalendarAdminRoute initialEvents={displayedCalendarEvents} onEventsChange={setCalendarEventsOverride} />
      </LazyRouteBoundary>,
      null,
    );

  const renderBoardRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <BoardRoute
          alwaysShowCompactMode={alwaysShowCompactMode}
          boardName={activeBoardName}
          listCompactMode={effectiveListCompactMode}
          topBarCollapsed={isTopBarCollapsed}
          onListCompactModeChange={handleListCompactModeChange}
        />
      </LazyRouteBoundary>,
      null,
      activeBoardName ?? undefined,
    );

  const renderThreadComposeRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <ThreadComposeRoute boardName={activeBoardNewThreadName} />
      </LazyRouteBoundary>,
      null,
      activeBoardNewThreadName ?? undefined,
    );

  const renderThreadRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <ThreadRoute
          enableFloatingPreview={interfaceSettings.enableFloatingThreadPreview}
          showFloorDirectory={interfaceSettings.showThreadFloorDirectory}
          threadId={activeThreadId}
          onThreadTitleChange={handleLoadedThreadTitleChange}
        />
      </LazyRouteBoundary>,
      null,
      activeThreadBoard,
    );

  const renderActivityAdminRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <ActivityAdminRoute threadId={activeThreadActivityAdminTarget?.threadId ?? activeThreadId} />
      </LazyRouteBoundary>,
      null,
      activeThreadBoard,
    );

  const renderThreadEditRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <ThreadEditRoute
          floorNumber={activeThreadEditTarget?.floorNumber ?? 1}
          threadId={activeThreadEditTarget?.threadId ?? activeThreadId}
        />
      </LazyRouteBoundary>,
      null,
      activeThreadBoard,
    );

  const renderNotFoundRoute = () =>
    renderSidebarRoute(
      <LazyRouteBoundary>
        <NotFoundRoute />
      </LazyRouteBoundary>,
      null,
    );

  const renderAuthRoute = () => (
    <Suspense key={`auth:${routeAddress}:${softRefreshKey}`} fallback={<AuthRouteFallback />}>
      <AuthRoute
        isDark={isDark}
        mode={authMode ?? 'login'}
        viewer={legacyBbs.viewer}
        onLogin={legacyBbs.login}
        onRegister={legacyBbs.register}
        onToggleDark={toggleDarkMode}
      />
    </Suspense>
  );

  return (
    <div className={isDark ? 'dark' : undefined}>
      <div className="relative min-h-screen overflow-x-hidden bg-[#A4C1AC] text-zinc-950 transition-colors dark:text-zinc-100">
        <AppBackground />
        <div className="relative z-10">
          {isAuthRoute ? (
            isSoftRefreshing ? <AuthRouteFallback /> : renderAuthRoute()
          ) : (
            <>
              <TopBar
                collapsed={isTopBarCollapsed}
                isDark={isDark}
                isSessionRestoring={legacyBbs.isSessionRestoring}
                {...topBarMessageProps}
                logoClickPrompt={logoClickPrompt}
                readingThreadTitle={readingThreadTitle}
                readingThreadTitleVisible={
                  isThreadReadingRoute && interfaceSettings.showThreadTitleInTopBar && isThreadTitleInTopBar
                }
                viewer={legacyBbs.viewer}
                onCollapsedChange={setIsTopBarCollapsed}
                onLogoClick={handleTopBarLogoClick}
                onLogout={legacyBbs.logout}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                onReturnToTop={scrollAllColumnsToTop}
                onToggleDark={toggleDarkMode}
              />

              <MobileSidebarOverlay
                activeBoard={activeSidebarBoard}
                activeItem={activeSidebarItem}
                boards={sidebarBoards}
                moreBoards={sidebarMoreBoards}
                open={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                onMoreBoardsExpand={skipApiWarmup}
                onOpenInterfaceSettings={() => setIsInterfaceSettingsOpen(true)}
                showUserCenter={!isGuest}
              />

              <Fragment key={`route:${routeAddress}:${softRefreshKey}`}>
                {shouldRenderRouteSkeleton ? (
                  isUserCenterRoute ||
                  isPublicProfileRoute ||
                  isSearchRoute ||
                  isDataDisplayRoute ||
                  isArchiveRoute ||
                  isCalendarAdminRoute ||
                  isBoardRoute ||
                  isThreadRoute ? (
                    <ProfileSkeleton
                      isSidebarCollapsed={isSidebarCollapsed}
                      isSidebarMinimized={isSidebarMinimized}
                      isSidebarMinimizing={isSidebarMinimizing}
                      isTopBarCollapsed={isTopBarCollapsed}
                    />
                  ) : (
                    <HomeSkeleton
                      alwaysShowCompactMode={alwaysShowCompactMode}
                      isSidebarCollapsed={isSidebarCollapsed}
                      isSidebarMinimized={isSidebarMinimized}
                      isSidebarMinimizing={isSidebarMinimizing}
                      isTopBarCollapsed={isTopBarCollapsed}
                    />
                  )
                ) : isUserCenterRoute ? (
                  renderUserCenterRoute()
                ) : isPublicProfileRoute ? (
                  renderPublicProfileRoute()
                ) : isSearchRoute ? (
                  renderSearchRoute()
                ) : isDataDisplayRoute ? (
                  renderDataDisplayRoute()
                ) : isArchiveRoute ? (
                  renderArchiveRoute()
                ) : isCalendarAdminRoute ? (
                  renderCalendarAdminRoute()
                ) : isBoardNewThreadRoute ? (
                  renderThreadComposeRoute()
                ) : isBoardRoute ? (
                  renderBoardRoute()
                ) : isThreadActivityAdminRoute ? (
                  renderActivityAdminRoute()
                ) : isThreadEditRoute ? (
                  renderThreadEditRoute()
                ) : isThreadRoute ? (
                  renderThreadRoute()
                ) : isNotFoundRoute ? (
                  renderNotFoundRoute()
                ) : (
                  <ForumHomeRoute
                    activities={homeActivities}
                    alwaysShowCompactMode={alwaysShowCompactMode}
                    autoExpandSidebarOnCollapsedOptionClick={interfaceSettings.autoExpandSidebarOnCollapsedOptionClick}
                    boards={sidebarBoards}
                    calendarEvents={displayedCalendarEvents}
                    canManagePinnedThreads={!isGuest}
                    hasRemoteHomeFeeds={hasRemoteHomeFeeds}
                    hotThreads={homeHotThreads}
                    isSidebarCollapsed={isSidebarCollapsed}
                    isSidebarMinimized={isSidebarMinimized}
                    isSidebarMinimizing={isSidebarMinimizing}
                    isTopBarCollapsed={isTopBarCollapsed}
                    latestReplies={homeLatestReplies}
                    latestTopics={homeLatestTopics}
                    listCompactMode={effectiveListCompactMode}
                    middleColumnRef={middleColumnRef}
                    mobileColumnRef={mobileColumnRef}
                    moreBoards={sidebarMoreBoards}
                    onMinimizeSidebar={minimizeSidebar}
                    onMoreBoardsExpand={skipApiWarmup}
                    onListCompactModeChange={handleListCompactModeChange}
                    onOpenInterfaceSettings={() => setIsInterfaceSettingsOpen(true)}
                    onRestoreMinimizedSidebar={restoreMinimizedSidebar}
                    onToggleSidebar={toggleSidebar}
                    pinnedThreads={homeData?.pinnedThreads}
                    rightColumnRef={rightColumnRef}
                    showUserCenter={!isGuest}
                  />
                )}
              </Fragment>
            </>
          )}

          {!isAuthRoute && isInterfaceSettingsOpen ? (
            <InterfaceSettingsDialog
              fontScaleMax={FONT_SCALE_MAX}
              fontScaleMin={FONT_SCALE_MIN}
              fontScaleStep={FONT_SCALE_STEP}
              settings={interfaceSettings}
              onChange={updateInterfaceSettings}
              onClose={() => setIsInterfaceSettingsOpen(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isSoftRefreshShortcut(event: KeyboardEvent) {
  const isRefreshKey =
    event.key === 'F5' ||
    (event.key.toLowerCase() === 'r' && (event.ctrlKey || event.metaKey));

  return isRefreshKey && !event.altKey;
}
