import type { ReactNode, RefObject } from 'react';
import {
  PULL_REFRESH_REBOUND_MS,
  type PullRefreshHandlers,
  type PullRefreshState,
} from '../../hooks/usePullRefresh';
import { joinClassNames } from '../../utils/classNames';
import { DesktopSidebar } from './Sidebar';

type SectionRenderer = () => ReactNode;

type HomeSections = {
  renderActivitySection: SectionRenderer;
  renderCalendarSection: SectionRenderer;
  renderFeedSection: SectionRenderer;
  renderPinnedSection: SectionRenderer;
};

type MobileHomeLayoutProps = HomeSections & {
  isTopBarCollapsed: boolean;
  mobileColumnRef: RefObject<HTMLElement | null>;
  pullRefresh: PullRefreshState;
  pullRefreshHandlers: PullRefreshHandlers;
  refreshIndicatorText: string;
};

export function MobileHomeLayout({
  isTopBarCollapsed,
  mobileColumnRef,
  pullRefresh,
  pullRefreshHandlers,
  refreshIndicatorText,
  renderActivitySection,
  renderCalendarSection,
  renderFeedSection,
  renderPinnedSection,
}: MobileHomeLayoutProps) {
  return (
    <main
      ref={mobileColumnRef}
      {...pullRefreshHandlers}
      className={joinClassNames(
        'scrollbar-none relative mx-auto h-screen max-w-[1480px] overflow-y-auto overscroll-contain px-4 pb-4 transition-[padding-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden',
        isTopBarCollapsed ? 'pt-6' : 'pt-[var(--capubbs-mobile-topbar-offset)]',
      )}
    >
      {pullRefresh.distance > 0 || pullRefresh.isRefreshing ? (
        <div
          className={joinClassNames(
            'pointer-events-none absolute inset-x-0 z-20 flex h-0 justify-center transition-[top,transform] duration-100 ease-out',
            isTopBarCollapsed ? 'top-0' : 'top-[calc(var(--capubbs-mobile-topbar-offset)-1.5rem)]',
          )}
          style={{ transform: `translateY(${Math.min(pullRefresh.distance * 0.5, 48)}px)` }}
        >
          <div className="inline-flex h-7 items-center rounded-full border border-white/30 bg-white/[0.46] px-3 text-xs font-semibold text-[#385772] shadow-sm backdrop-blur-[2px] dark:border-white/15 dark:bg-white/[0.14] dark:text-white">
            {refreshIndicatorText}
          </div>
        </div>
      ) : null}
      <div
        className={joinClassNames('flex flex-col gap-4', pullRefresh.isReturning && 'transition-transform')}
        style={{
          transform: `translateY(${pullRefresh.distance}px)`,
          transitionDuration: pullRefresh.isReturning ? `${PULL_REFRESH_REBOUND_MS}ms` : undefined,
          transitionTimingFunction: pullRefresh.isReturning ? 'cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
        }}
      >
        {renderActivitySection()}
        {renderPinnedSection()}
        {renderFeedSection()}
        {renderCalendarSection()}
      </div>
    </main>
  );
}

type DesktopHomeLayoutProps = HomeSections & {
  autoExpandSidebarOnCollapsedOptionClick: boolean;
  boards: string[];
  isSidebarCollapsed: boolean;
  isSidebarMinimized: boolean;
  isSidebarMinimizing: boolean;
  isTopBarCollapsed: boolean;
  middleColumnRef: RefObject<HTMLElement | null>;
  moreBoards: string[];
  onMinimizeSidebar: () => void;
  onMoreBoardsExpand: () => void;
  onOpenInterfaceSettings: () => void;
  onRestoreMinimizedSidebar: () => void;
  onToggleSidebar: () => void;
  pullRefresh: PullRefreshState;
  pullRefreshHandlers: PullRefreshHandlers;
  refreshIndicatorText: string;
  rightColumnRef: RefObject<HTMLElement | null>;
  showUserCenter?: boolean;
};

export function DesktopHomeLayout({
  autoExpandSidebarOnCollapsedOptionClick,
  boards,
  isSidebarCollapsed,
  isSidebarMinimized,
  isSidebarMinimizing,
  isTopBarCollapsed,
  middleColumnRef,
  moreBoards,
  onMinimizeSidebar,
  onMoreBoardsExpand,
  onOpenInterfaceSettings,
  onRestoreMinimizedSidebar,
  onToggleSidebar,
  pullRefresh,
  pullRefreshHandlers,
  refreshIndicatorText,
  rightColumnRef,
  renderActivitySection,
  renderCalendarSection,
  renderFeedSection,
  renderPinnedSection,
  showUserCenter = true,
}: DesktopHomeLayoutProps) {
  return (
    <main
      className={joinClassNames(
        'mx-auto hidden h-screen max-w-[1480px] gap-4 overflow-hidden px-4 lg:grid lg:grid-cols-[var(--left)_minmax(0,1fr)_18rem] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
        isSidebarMinimized || isSidebarMinimizing
          ? '[--left:var(--capubbs-sidebar-minimized-width)]'
          : isSidebarCollapsed
            ? '[--left:var(--capubbs-sidebar-collapsed-width)]'
            : '[--left:var(--capubbs-sidebar-expanded-width)]',
      )}
    >
      <DesktopSidebar
        autoExpandOnCollapsedOptionClick={autoExpandSidebarOnCollapsedOptionClick}
        collapsed={isSidebarCollapsed}
        boards={boards}
        minimized={isSidebarMinimized}
        minimizing={isSidebarMinimizing}
        moreBoards={moreBoards}
        onMinimize={onMinimizeSidebar}
        onMoreBoardsExpand={onMoreBoardsExpand}
        onOpenInterfaceSettings={onOpenInterfaceSettings}
        onRestoreMinimized={onRestoreMinimizedSidebar}
        onToggle={onToggleSidebar}
        showUserCenter={showUserCenter}
        topBarCollapsed={isTopBarCollapsed}
      />

      <section
        ref={middleColumnRef}
        {...pullRefreshHandlers}
        className={joinClassNames(
          'scrollbar-none relative min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-transparent pb-4 shadow-none transition-[padding-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [backdrop-filter:none]',
          isTopBarCollapsed ? 'pt-6' : 'pt-20',
        )}
      >
        {pullRefresh.distance > 0 || pullRefresh.isRefreshing ? (
          <div
            className={joinClassNames(
              'pointer-events-none absolute inset-x-0 z-20 flex h-0 justify-center transition-[top,transform] duration-100 ease-out',
              isTopBarCollapsed ? 'top-0' : 'top-14',
            )}
            style={{ transform: `translateY(${Math.min(pullRefresh.distance * 0.5, 48)}px)` }}
          >
            <div className="inline-flex h-7 items-center rounded-full border border-white/30 bg-white/[0.46] px-3 text-xs font-semibold text-[#385772] shadow-sm backdrop-blur-[2px] dark:border-white/15 dark:bg-white/[0.14] dark:text-white">
              {refreshIndicatorText}
            </div>
          </div>
        ) : null}
        <div
          className={joinClassNames('space-y-4', pullRefresh.isReturning && 'transition-transform')}
          style={{
            transform: `translateY(${pullRefresh.distance}px)`,
            transitionDuration: pullRefresh.isReturning ? `${PULL_REFRESH_REBOUND_MS}ms` : undefined,
            transitionTimingFunction: pullRefresh.isReturning ? 'cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
          }}
        >
          {renderActivitySection()}
          {renderFeedSection()}
        </div>
      </section>

      <aside
        ref={rightColumnRef}
        className={joinClassNames(
          'scrollbar-none min-h-0 space-y-4 overflow-y-auto overscroll-contain bg-transparent pb-4 shadow-none transition-[padding-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [backdrop-filter:none]',
          isTopBarCollapsed ? 'pt-6' : 'pt-20',
        )}
      >
        {renderPinnedSection()}
        {renderCalendarSection()}
      </aside>
    </main>
  );
}
