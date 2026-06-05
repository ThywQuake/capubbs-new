import type { ReactNode, RefObject, UIEventHandler } from 'react';
import { joinClassNames } from '../../utils/classNames';
import { DesktopSidebar, type SidebarActiveItem } from './Sidebar';

type SidebarRouteLayoutProps = {
  activeBoard?: string;
  activeItem: SidebarActiveItem;
  autoExpandSidebarOnCollapsedOptionClick: boolean;
  boards: string[];
  children: ReactNode;
  isSidebarCollapsed: boolean;
  isSidebarMinimized: boolean;
  isSidebarMinimizing: boolean;
  isTopBarCollapsed: boolean;
  middleColumnRef: RefObject<HTMLElement | null>;
  mobileColumnRef: RefObject<HTMLElement | null>;
  moreBoards: string[];
  onContentScroll?: UIEventHandler<HTMLElement>;
  onMinimizeSidebar: () => void;
  onMoreBoardsExpand: () => void;
  onOpenInterfaceSettings: () => void;
  onRestoreMinimizedSidebar: () => void;
  onToggleSidebar: () => void;
  showUserCenter: boolean;
};

export function SidebarRouteLayout({
  activeBoard,
  activeItem,
  autoExpandSidebarOnCollapsedOptionClick,
  boards,
  children,
  isSidebarCollapsed,
  isSidebarMinimized,
  isSidebarMinimizing,
  isTopBarCollapsed,
  middleColumnRef,
  mobileColumnRef,
  moreBoards,
  onContentScroll,
  onMinimizeSidebar,
  onMoreBoardsExpand,
  onOpenInterfaceSettings,
  onRestoreMinimizedSidebar,
  onToggleSidebar,
  showUserCenter,
}: SidebarRouteLayoutProps) {
  const sidebarColumnWidthClass =
    isSidebarMinimized || isSidebarMinimizing
      ? '[--left:var(--capubbs-sidebar-minimized-width)]'
      : isSidebarCollapsed
        ? '[--left:var(--capubbs-sidebar-collapsed-width)]'
        : '[--left:var(--capubbs-sidebar-expanded-width)]';

  return (
    <>
      <main
        ref={mobileColumnRef}
        onScroll={onContentScroll}
        className={joinClassNames(
          'scrollbar-none relative mx-auto h-screen max-w-[1480px] overflow-y-auto overscroll-contain px-4 pb-4 transition-[padding-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden',
          isTopBarCollapsed ? 'pt-6' : 'pt-[var(--capubbs-mobile-topbar-offset)]',
        )}
      >
        {children}
      </main>

      <main
        className={joinClassNames(
          'mx-auto hidden h-screen max-w-[1480px] gap-4 overflow-hidden px-4 lg:grid lg:grid-cols-[var(--left)_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
          sidebarColumnWidthClass,
        )}
      >
        <DesktopSidebar
          activeBoard={activeBoard}
          activeItem={activeItem}
          boards={boards}
          collapsed={isSidebarCollapsed}
          minimized={isSidebarMinimized}
          minimizing={isSidebarMinimizing}
          moreBoards={moreBoards}
          autoExpandOnCollapsedOptionClick={autoExpandSidebarOnCollapsedOptionClick}
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
          onScroll={onContentScroll}
          className={joinClassNames(
            'scrollbar-none min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-transparent pb-4 shadow-none transition-[padding-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [backdrop-filter:none]',
            isTopBarCollapsed
              ? 'pt-[var(--capubbs-desktop-topbar-collapsed-offset)] [--capubbs-route-column-top-offset:var(--capubbs-desktop-topbar-collapsed-offset)]'
              : 'pt-[var(--capubbs-desktop-topbar-offset)] [--capubbs-route-column-top-offset:var(--capubbs-desktop-topbar-offset)]',
          )}
        >
          {children}
        </section>
      </main>
    </>
  );
}
