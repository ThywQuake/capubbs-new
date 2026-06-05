import { joinClassNames } from '../../utils/classNames';
import { DEFAULT_LIST_PAGE_SIZE } from '../../types/listDisplay';

type HomeSkeletonProps = {
  alwaysShowCompactMode?: boolean;
  isSidebarCollapsed?: boolean;
  isSidebarMinimized?: boolean;
  isSidebarMinimizing?: boolean;
  isTopBarCollapsed: boolean;
};

export function HomeSkeleton({
  alwaysShowCompactMode = false,
  isSidebarCollapsed = false,
  isSidebarMinimized = false,
  isSidebarMinimizing = false,
  isTopBarCollapsed,
}: HomeSkeletonProps) {
  const sidebarColumnWidthClass = getSidebarColumnWidthClass({
    isSidebarCollapsed,
    isSidebarMinimized,
    isSidebarMinimizing,
  });

  return (
    <>
      <main
        className={joinClassNames(
          'scrollbar-none relative mx-auto h-screen max-w-[1480px] overflow-y-auto overscroll-contain px-4 pb-4 lg:hidden',
          isTopBarCollapsed ? 'pt-6' : 'pt-[var(--capubbs-mobile-topbar-offset)]',
        )}
      >
        <div className="flex flex-col gap-4">
          <ActivitySkeleton />
          <PinnedSkeleton />
          <FeedSkeleton compact={alwaysShowCompactMode} />
          <CalendarSkeleton />
        </div>
      </main>

      <main
        className={joinClassNames(
          'mx-auto hidden h-screen max-w-[1480px] gap-4 overflow-hidden px-4 lg:grid lg:grid-cols-[var(--left)_minmax(0,1fr)_18rem] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
          sidebarColumnWidthClass,
        )}
      >
        <SidebarSkeleton
          isSidebarCollapsed={isSidebarCollapsed}
          isSidebarMinimized={isSidebarMinimized}
          isSidebarMinimizing={isSidebarMinimizing}
          isTopBarCollapsed={isTopBarCollapsed}
        />
        <section
          className={joinClassNames(
            'scrollbar-none min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain bg-transparent pb-4 shadow-none',
            isTopBarCollapsed
              ? 'pt-[var(--capubbs-desktop-topbar-collapsed-offset)]'
              : 'pt-[var(--capubbs-desktop-topbar-offset)]',
          )}
        >
          <ActivitySkeleton />
          <FeedSkeleton compact={alwaysShowCompactMode} />
        </section>
        <aside
          className={joinClassNames(
            'scrollbar-none min-h-0 space-y-4 overflow-y-auto overscroll-contain bg-transparent pb-4 shadow-none',
            isTopBarCollapsed
              ? 'pt-[var(--capubbs-desktop-topbar-collapsed-offset)]'
              : 'pt-[var(--capubbs-desktop-topbar-offset)]',
          )}
        >
          <PinnedSkeleton />
          <CalendarSkeleton />
        </aside>
      </main>
    </>
  );
}

export function ProfileSkeleton({
  isSidebarCollapsed = false,
  isSidebarMinimized = false,
  isSidebarMinimizing = false,
  isTopBarCollapsed,
}: HomeSkeletonProps) {
  const sidebarColumnWidthClass = getSidebarColumnWidthClass({
    isSidebarCollapsed,
    isSidebarMinimized,
    isSidebarMinimizing,
  });

  return (
    <>
      <main
        className={joinClassNames(
          'scrollbar-none relative mx-auto h-screen max-w-[1480px] overflow-y-auto overscroll-contain px-4 pb-4 lg:hidden',
          isTopBarCollapsed ? 'pt-6' : 'pt-[var(--capubbs-mobile-topbar-offset)]',
        )}
      >
        <ProfileSkeletonContent />
      </main>
      <main
        className={joinClassNames(
          'mx-auto hidden h-screen max-w-[1480px] gap-4 overflow-hidden px-4 lg:grid lg:grid-cols-[var(--left)_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
          sidebarColumnWidthClass,
        )}
      >
        <SidebarSkeleton
          isSidebarCollapsed={isSidebarCollapsed}
          isSidebarMinimized={isSidebarMinimized}
          isSidebarMinimizing={isSidebarMinimizing}
          isTopBarCollapsed={isTopBarCollapsed}
        />
        <section
          className={joinClassNames(
            'scrollbar-none min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-transparent pb-4 shadow-none',
            isTopBarCollapsed
              ? 'pt-[var(--capubbs-desktop-topbar-collapsed-offset)]'
              : 'pt-[var(--capubbs-desktop-topbar-offset)]',
          )}
        >
          <ProfileSkeletonContent />
        </section>
      </main>
    </>
  );
}

function ActivitySkeleton() {
  return (
    <section className="overflow-hidden rounded-lg bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300 p-[1px] shadow-panel">
      <div className="card-surface relative min-h-[144px] overflow-hidden rounded-[7px] p-4 md:min-h-[110px]">
        <div className="absolute inset-0 bg-white/35 dark:bg-white/[0.04]" />
        <div className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-10 py-2 md:px-12">
          <div className="min-w-0 space-y-3">
            <SkeletonLine className="h-7 w-3/5 max-w-[24rem]" />
            <div className="flex flex-wrap gap-3">
              <SkeletonLine className="h-4 w-28" />
              <SkeletonLine className="h-4 w-20" />
            </div>
          </div>
          <SkeletonLine className="hidden h-9 w-20 md:block" />
        </div>
      </div>
    </section>
  );
}

function FeedSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="segmented-tabs-surface flex gap-1 overflow-hidden rounded-lg border p-1 shadow-sm">
        <SkeletonLine className="h-10 min-w-[4.25rem] flex-1 rounded-md" />
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <SkeletonLine className="h-9 w-32 rounded-lg" />
        <SkeletonLine className="h-9 w-36 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: DEFAULT_LIST_PAGE_SIZE }, (_, index) => (
          <FeedCardSkeleton key={index} compact={compact} />
        ))}
      </div>
      <SkeletonLine className="h-11 w-full rounded-lg" />
    </section>
  );
}

function FeedCardSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <section className="card-surface flex h-[4.5rem] flex-col justify-center overflow-hidden rounded-lg border border-zinc-200 p-3 shadow-panel dark:border-zinc-800">
        <SkeletonLine className="h-5 w-3/4" />
        <SkeletonLine className="mt-1.5 h-5 w-2/5" />
      </section>
    );
  }

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-[44px_1fr] items-center gap-3">
          <SkeletonLine className="h-11 w-11 rounded-md" />
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-4 w-16" />
          </div>
        </div>
        <SkeletonLine className="h-7 w-20 shrink-0" />
      </div>
      <SkeletonLine className="mt-4 h-5 w-3/4" />
      <div className="mt-4 flex items-center gap-4">
        <SkeletonLine className="h-5 w-32" />
        <SkeletonLine className="ml-auto h-5 w-8" />
      </div>
    </section>
  );
}

function PinnedSkeleton() {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <SkeletonLine className="h-5 w-24" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2].map((item) => (
          <SkeletonLine key={item} className="h-9 w-full" />
        ))}
      </div>
    </section>
  );
}

function CalendarSkeleton() {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-3 shadow-panel dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-5 w-24" />
        <SkeletonLine className="h-7 w-16" />
      </div>
      <div className="mt-4 grid grid-cols-8 gap-1">
        {Array.from({ length: 48 }, (_, index) => (
          <SkeletonLine key={index} className="aspect-square w-full rounded-md" />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine className="h-5 w-36" />
        <SkeletonLine className="h-12 w-full" />
      </div>
    </section>
  );
}

function SidebarSkeleton({
  isSidebarCollapsed = false,
  isSidebarMinimized = false,
  isSidebarMinimizing = false,
  isTopBarCollapsed,
}: HomeSkeletonProps) {
  if (isSidebarMinimized && !isSidebarMinimizing) {
    return (
      <aside className="hidden lg:block">
        <div className="card-surface sidebar-toggle-option fixed bottom-4 left-[max(1rem,calc((100vw-1480px)/2+1rem))] z-20 flex h-[var(--capubbs-sidebar-minimized-width)] w-[var(--capubbs-sidebar-minimized-width)] items-center justify-center rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
          <SkeletonLine className="h-5 w-5 rounded-md" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block">
      <div
        className={joinClassNames(
          'card-surface fixed left-[max(1rem,calc((100vw-1480px)/2+1rem))] z-20 flex w-[var(--left)] origin-bottom-left flex-col overflow-hidden rounded-lg border border-zinc-200 p-3 shadow-panel transition-[width,top,height,padding,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-800',
          isSidebarMinimizing
            ? 'pointer-events-none top-[calc(100vh-4rem)] h-12 p-0 opacity-0 -translate-x-1 scale-95'
            : isTopBarCollapsed
              ? 'top-6 h-[calc(100vh-2.5rem)] opacity-100 translate-x-0 scale-100'
              : 'top-20 h-[calc(100vh-6rem)] opacity-100 translate-x-0 scale-100',
        )}
      >
        <SkeletonLine className="h-10 w-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: isSidebarCollapsed ? 7 : 8 }, (_, index) => (
            <SkeletonLine key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </aside>
  );
}

function getSidebarColumnWidthClass({
  isSidebarCollapsed = false,
  isSidebarMinimized = false,
  isSidebarMinimizing = false,
}: Pick<HomeSkeletonProps, 'isSidebarCollapsed' | 'isSidebarMinimized' | 'isSidebarMinimizing'>) {
  if (isSidebarMinimized || isSidebarMinimizing) {
    return '[--left:var(--capubbs-sidebar-minimized-width)]';
  }

  return isSidebarCollapsed
    ? '[--left:var(--capubbs-sidebar-collapsed-width)]'
    : '[--left:var(--capubbs-sidebar-expanded-width)]';
}

export function ProfileSkeletonContent() {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 p-[1px] shadow-panel">
        <div className="card-surface rounded-[7px] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SkeletonLine className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <SkeletonLine className="h-5 w-28" />
                <SkeletonLine className="h-4 w-36" />
              </div>
            </div>
            <div className="hidden gap-2 md:flex">
              <SkeletonLine className="h-9 w-24" />
              <SkeletonLine className="h-9 w-24" />
            </div>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <section key={index} className="card-surface rounded-lg border border-zinc-200 px-3 py-2 shadow-panel dark:border-zinc-800">
            <SkeletonLine className="h-3 w-12" />
            <SkeletonLine className="mt-2 h-5 w-24" />
          </section>
        ))}
      </div>
      <FeedSkeleton />
    </div>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={joinClassNames(
        'animate-pulse rounded-md bg-zinc-200/75 dark:bg-white/[0.09]',
        className,
      )}
    />
  );
}
