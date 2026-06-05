import { useState, type RefObject } from 'react';
import { ActivityCarousel } from '../activity/ActivityCarousel';
import { FeedSection } from '../feed/FeedSection';
import { CalendarPanel } from '../panels/CalendarPanel';
import { PinnedThreads } from '../panels/PinnedThreads';
import { useHomeFeedControls } from '../../hooks/useHomeFeedControls';
import { usePullRefresh } from '../../hooks/usePullRefresh';
import type { ActivityBanner, CalendarEvent, HotThread, ReplyItem, TopicItem } from '../../types/forum';
import { DesktopHomeLayout, MobileHomeLayout } from '../layout/ForumHomeLayouts';

const MOBILE_PULL_REFRESH_THRESHOLD = 12;
const MOBILE_PULL_REFRESH_MAX_DISTANCE = 82;
const MOBILE_PULL_REFRESH_DAMPING = 1;

type PinnedThreadItem = {
  href: string;
  id: string;
  title: string;
};

type ForumHomeRouteProps = {
  activities: ActivityBanner[];
  alwaysShowCompactMode: boolean;
  autoExpandSidebarOnCollapsedOptionClick: boolean;
  boards: string[];
  calendarEvents: CalendarEvent[];
  canManagePinnedThreads: boolean;
  hasRemoteHomeFeeds: boolean;
  hotThreads: HotThread[];
  isSidebarCollapsed: boolean;
  isSidebarMinimized: boolean;
  isSidebarMinimizing: boolean;
  isTopBarCollapsed: boolean;
  latestReplies: ReplyItem[];
  latestTopics: TopicItem[];
  listCompactMode: boolean;
  middleColumnRef: RefObject<HTMLElement | null>;
  mobileColumnRef: RefObject<HTMLElement | null>;
  moreBoards: string[];
  onListCompactModeChange: (compact: boolean) => void;
  onMinimizeSidebar: () => void;
  onMoreBoardsExpand: () => void;
  onOpenInterfaceSettings: () => void;
  onRestoreMinimizedSidebar: () => void;
  onToggleSidebar: () => void;
  pinnedThreads?: PinnedThreadItem[];
  rightColumnRef: RefObject<HTMLElement | null>;
  showUserCenter: boolean;
};

export function ForumHomeRoute({
  activities,
  alwaysShowCompactMode,
  autoExpandSidebarOnCollapsedOptionClick,
  boards,
  calendarEvents,
  canManagePinnedThreads,
  hasRemoteHomeFeeds,
  hotThreads,
  isSidebarCollapsed,
  isSidebarMinimized,
  isSidebarMinimizing,
  isTopBarCollapsed,
  latestReplies,
  latestTopics,
  listCompactMode,
  middleColumnRef,
  mobileColumnRef,
  moreBoards,
  onListCompactModeChange,
  onMinimizeSidebar,
  onMoreBoardsExpand,
  onOpenInterfaceSettings,
  onRestoreMinimizedSidebar,
  onToggleSidebar,
  pinnedThreads,
  rightColumnRef,
  showUserCenter,
}: ForumHomeRouteProps) {
  const [activeBanner, setActiveBanner] = useState(0);
  const {
    activeTab,
    changeHomeFeedPageSize,
    feedItemCounts,
    homeFeedPageSize,
    loadMoreFeedItems,
    resetFeedItems,
    setActiveTab,
  } = useHomeFeedControls();
  const {
    pullRefresh: mobilePullRefresh,
    pullRefreshHandlers: mobilePullRefreshHandlers,
    refreshIndicatorText: mobileRefreshIndicatorText,
  } = usePullRefresh({
    maxDistance: MOBILE_PULL_REFRESH_MAX_DISTANCE,
    pullDamping: MOBILE_PULL_REFRESH_DAMPING,
    scrollContainerRef: mobileColumnRef,
    onRefresh: resetFeedItems,
    threshold: MOBILE_PULL_REFRESH_THRESHOLD,
    triggerDistanceMode: 'gesture',
  });
  const { pullRefresh, pullRefreshHandlers, refreshIndicatorText } = usePullRefresh({
    scrollContainerRef: middleColumnRef,
    onRefresh: resetFeedItems,
  });

  const renderActivitySection = () => (
    <ActivityCarousel activities={activities} activeIndex={activeBanner} onChange={setActiveBanner} />
  );

  const renderFeedSection = () => (
    <FeedSection
      activeTab={activeTab}
      compact={alwaysShowCompactMode || listCompactMode}
      compactLocked={alwaysShowCompactMode}
      hotThreads={hotThreads}
      latestReplies={latestReplies}
      latestTopics={latestTopics}
      onChangeTab={setActiveTab}
      onChangeCompact={onListCompactModeChange}
      onChangePageSize={changeHomeFeedPageSize}
      onLoadMore={loadMoreFeedItems}
      pageSize={homeFeedPageSize}
      repeatItems={!hasRemoteHomeFeeds && activeTab !== 'hot'}
      visibleCount={feedItemCounts[activeTab]}
    />
  );

  const renderPinnedSection = () => <PinnedThreads canManage={canManagePinnedThreads} threads={pinnedThreads} />;

  const renderCalendarSection = () => <CalendarPanel events={calendarEvents} />;

  const homeSections = {
    renderActivitySection,
    renderCalendarSection,
    renderFeedSection,
    renderPinnedSection,
  };

  return (
    <>
      <MobileHomeLayout
        {...homeSections}
        isTopBarCollapsed={isTopBarCollapsed}
        mobileColumnRef={mobileColumnRef}
        pullRefresh={mobilePullRefresh}
        pullRefreshHandlers={mobilePullRefreshHandlers}
        refreshIndicatorText={mobileRefreshIndicatorText}
      />

      <DesktopHomeLayout
        {...homeSections}
        boards={boards}
        isSidebarCollapsed={isSidebarCollapsed}
        isSidebarMinimized={isSidebarMinimized}
        isSidebarMinimizing={isSidebarMinimizing}
        isTopBarCollapsed={isTopBarCollapsed}
        middleColumnRef={middleColumnRef}
        moreBoards={moreBoards}
        autoExpandSidebarOnCollapsedOptionClick={autoExpandSidebarOnCollapsedOptionClick}
        onMinimizeSidebar={onMinimizeSidebar}
        onMoreBoardsExpand={onMoreBoardsExpand}
        onOpenInterfaceSettings={onOpenInterfaceSettings}
        onRestoreMinimizedSidebar={onRestoreMinimizedSidebar}
        onToggleSidebar={onToggleSidebar}
        showUserCenter={showUserCenter}
        pullRefresh={pullRefresh}
        pullRefreshHandlers={pullRefreshHandlers}
        refreshIndicatorText={refreshIndicatorText}
        rightColumnRef={rightColumnRef}
      />
    </>
  );
}
