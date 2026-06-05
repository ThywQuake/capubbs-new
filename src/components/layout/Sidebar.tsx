import {
  Bike,
  BookOpen,
  ChartNoAxesColumn,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Compass,
  Droplets,
  Fence,
  FlaskConical,
  FolderArchive,
  Footprints,
  Globe2,
  Home,
  Map,
  Megaphone,
  Newspaper,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Recycle,
  ServerCog,
  Settings2,
  Sparkles,
  Trophy,
  User,
  Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { Link } from 'react-router-dom';
import { getBoardPath } from '../../utils/boardRoutes';
import { joinClassNames } from '../../utils/classNames';

export type SidebarActiveItem = 'archive' | 'home' | 'me' | 'stats' | null;

type DesktopSidebarProps = {
  autoExpandOnCollapsedOptionClick?: boolean;
  collapsed: boolean;
  boards: string[];
  activeItem?: SidebarActiveItem;
  moreBoards?: string[];
  activeBoard?: string;
  minimized?: boolean;
  minimizing?: boolean;
  onMinimize?: () => void;
  onMoreBoardsExpand?: () => void;
  onOpenInterfaceSettings?: () => void;
  onRestoreMinimized?: () => void;
  onToggle: () => void;
  showUserCenter?: boolean;
  topBarCollapsed?: boolean;
};

type MobileSidebarOverlayProps = {
  boards: string[];
  activeItem?: SidebarActiveItem;
  activeBoard?: string;
  moreBoards?: string[];
  open: boolean;
  onClose: () => void;
  onMoreBoardsExpand?: () => void;
  onOpenInterfaceSettings?: () => void;
  showUserCenter?: boolean;
};

const boardIcons = {
  车协工作区: Megaphone,
  行者足音: Footprints,
  车友宝典: BookOpen,
  纯净水: Droplets,
  考察与社会: Compass,
  五湖四海: Globe2,
  一技之长: Wrench,
  竞技竞赛: Trophy,
  竞赛竞技: Trophy,
  网站维护: ServerCog,
  历史笔记: NotebookPen,
  资料整理: FolderArchive,
  回收: Recycle,
  公告栏: Fence,
  新闻发布: Newspaper,
  剧组工作: Clapperboard,
  游记: Map,
  测试: FlaskConical,
  精品集合: Sparkles,
} as const;
const DATA_DISPLAY_PATH = '/stats';

function getBoardIcon(board: string) {
  return boardIcons[board as keyof typeof boardIcons] ?? Bike;
}

export function DesktopSidebar({
  autoExpandOnCollapsedOptionClick = false,
  collapsed,
  boards,
  activeItem = 'home',
  moreBoards = [],
  activeBoard,
  minimized = false,
  minimizing = false,
  onMinimize,
  onMoreBoardsExpand,
  onOpenInterfaceSettings,
  onRestoreMinimized,
  onToggle,
  showUserCenter = true,
  topBarCollapsed = false,
}: DesktopSidebarProps) {
  const minimizeStartYRef = useRef<number | null>(null);
  const canMinimize = collapsed && !minimized && !minimizing && Boolean(onMinimize);

  const resetMinimizeGesture = () => {
    minimizeStartYRef.current = null;
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!canMinimize || event.button !== 0) {
      return;
    }

    minimizeStartYRef.current = event.clientY;
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!canMinimize || minimizeStartYRef.current === null) {
      return;
    }

    if (event.clientY - minimizeStartYRef.current > 36) {
      event.preventDefault();
      resetMinimizeGesture();
      onMinimize?.();
    }
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (!canMinimize || event.deltaY >= -24) {
      return;
    }

    event.preventDefault();
    resetMinimizeGesture();
    onMinimize?.();
  };

  if (minimized && !minimizing) {
    return (
      <aside className="hidden lg:block">
        <button
          type="button"
          aria-label="恢复折叠左侧栏"
          onClick={onRestoreMinimized}
          className="card-surface sidebar-toggle-option fixed bottom-4 left-[max(1rem,calc((100vw-1480px)/2+1rem))] z-20 flex h-[var(--capubbs-sidebar-minimized-width)] w-[var(--capubbs-sidebar-minimized-width)] items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 shadow-panel transition-[background-color,border-color,color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:text-zinc-950 focus:outline-none dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-white"
        >
          <ChevronUp size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="hidden lg:block"
      onPointerCancel={resetMinimizeGesture}
      onPointerDown={handlePointerDown}
      onPointerLeave={resetMinimizeGesture}
      onPointerMove={handlePointerMove}
      onPointerUp={resetMinimizeGesture}
      onWheel={handleWheel}
    >
      <SidebarNav
        activeItem={activeItem}
        activeBoard={activeBoard}
        autoExpandOnCollapsedOptionClick={autoExpandOnCollapsedOptionClick}
        boards={boards}
        collapsed={collapsed}
        containerClassName={joinClassNames(
          'card-surface fixed left-[max(1rem,calc((100vw-1480px)/2+1rem))] z-20 flex w-[var(--left)] origin-bottom-left flex-col overflow-hidden rounded-lg border border-zinc-200 p-3 shadow-panel transition-[width,top,height,padding,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-800',
          minimizing
            ? 'pointer-events-none top-[calc(100vh-4rem)] h-12 p-0 opacity-0 -translate-x-1 scale-95'
            : topBarCollapsed
              ? 'top-6 h-[calc(100vh-2.5rem)] opacity-100 translate-x-0 scale-100'
              : 'top-20 h-[calc(100vh-6rem)] opacity-100 translate-x-0 scale-100',
        )}
        focusActiveBoardWhenAutoExpanded
        moreBoards={moreBoards}
        onMoreBoardsExpand={onMoreBoardsExpand}
        onOpenInterfaceSettings={onOpenInterfaceSettings}
        onToggle={onToggle}
        showUserCenter={showUserCenter}
      />
    </aside>
  );
}

export function MobileSidebarOverlay({
  activeBoard,
  boards,
  activeItem = 'home',
  moreBoards = [],
  open,
  onClose,
  onMoreBoardsExpand,
  onOpenInterfaceSettings,
  showUserCenter = true,
}: MobileSidebarOverlayProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={joinClassNames(
        'fixed inset-0 z-40 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <button
        type="button"
        aria-label="关闭左侧栏"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={joinClassNames(
          'absolute inset-0 border-0 bg-zinc-950/55 p-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        aria-hidden={!open}
        className={joinClassNames(
          'absolute left-0 top-0 z-10 h-screen w-[17.5rem] max-w-[calc(100vw-3rem)] transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarNav
          activeItem={activeItem}
          activeBoard={activeBoard}
          boards={boards}
          autoExpandActiveBoard={open}
          collapsed={false}
          containerClassName="card-surface flex h-full flex-col overflow-hidden rounded-r-lg border-y-0 border-l-0 border-r border-zinc-200 p-3 shadow-2xl dark:border-zinc-800"
          moreBoards={moreBoards}
          onNavigate={onClose}
          onMoreBoardsExpand={onMoreBoardsExpand}
          onOpenInterfaceSettings={onOpenInterfaceSettings}
          onToggle={onClose}
          showCollapseToggle={false}
          showUserCenter={showUserCenter}
        />
      </aside>
    </div>
  );
}

type SidebarNavProps = {
  collapsed: boolean;
  boards: string[];
  moreBoards: string[];
  activeItem?: SidebarActiveItem;
  activeBoard?: string;
  autoExpandActiveBoard?: boolean;
  autoExpandOnCollapsedOptionClick?: boolean;
  containerClassName: string;
  focusActiveBoardWhenAutoExpanded?: boolean;
  onNavigate?: () => void;
  onMoreBoardsExpand?: () => void;
  onOpenInterfaceSettings?: () => void;
  onToggle: () => void;
  showCollapseToggle?: boolean;
  showUserCenter?: boolean;
};

function SidebarNav({
  collapsed,
  boards,
  moreBoards,
  activeItem = 'home',
  activeBoard,
  autoExpandActiveBoard = true,
  autoExpandOnCollapsedOptionClick = false,
  containerClassName,
  focusActiveBoardWhenAutoExpanded = false,
  onNavigate,
  onMoreBoardsExpand,
  onOpenInterfaceSettings,
  onToggle,
  showCollapseToggle = true,
  showUserCenter = true,
}: SidebarNavProps) {
  const [isMoreBoardsOpen, setIsMoreBoardsOpen] = useState(false);
  const activeBoardLinkRef = useRef<HTMLAnchorElement | null>(null);
  const isActiveBoardInMoreBoards = activeBoard ? moreBoards.includes(activeBoard) : false;
  const itemClass = joinClassNames(
    'card-option sidebar-option flex h-10 items-center rounded-md text-sm font-medium duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3',
  );
  const activeItemClass = 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200';
  const bottomItemClass = joinClassNames(
    'card-option sidebar-option flex h-10 w-full items-center rounded-md text-sm font-medium text-zinc-600 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:text-zinc-300',
    collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3',
  );
  const iconClass = 'flex h-5 w-5 shrink-0 items-center justify-center';

  const labelClass = joinClassNames(
    'inline-block overflow-hidden whitespace-nowrap align-middle transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    collapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100',
  );
  const hasMoreBoards = moreBoards.length > 0;
  const expandAfterCollapsedOptionClick = () => {
    if (collapsed && autoExpandOnCollapsedOptionClick) {
      onToggle();
    }
  };

  const handleOptionNavigate = () => {
    expandAfterCollapsedOptionClick();
    onNavigate?.();
  };

  useEffect(() => {
    if (!autoExpandActiveBoard || !isActiveBoardInMoreBoards) {
      return;
    }

    setIsMoreBoardsOpen(true);
    onMoreBoardsExpand?.();
  }, [autoExpandActiveBoard, isActiveBoardInMoreBoards, onMoreBoardsExpand]);

  useEffect(() => {
    if (!focusActiveBoardWhenAutoExpanded || !isActiveBoardInMoreBoards || !isMoreBoardsOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const activeBoardLink = activeBoardLinkRef.current;

      if (!activeBoardLink || activeBoardLink.offsetParent === null) {
        return;
      }

      activeBoardLink.scrollIntoView({ block: 'nearest' });
      activeBoardLink.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeBoard, focusActiveBoardWhenAutoExpanded, isActiveBoardInMoreBoards, isMoreBoardsOpen]);

  return (
    <nav className={containerClassName}>
      <div className="shrink-0 space-y-1">
        <Link
          to="/"
          onClick={handleOptionNavigate}
          className={joinClassNames(
            itemClass,
            activeItem === 'home' ? activeItemClass : 'text-zinc-600 dark:text-zinc-300',
          )}
        >
          <span className={iconClass}>
            <Home size={18} />
          </span>
          <span className={labelClass}>首页</span>
        </Link>
        {showUserCenter ? (
          <Link
            to="/user-center"
            onClick={handleOptionNavigate}
            className={joinClassNames(
              itemClass,
              activeItem === 'me' ? activeItemClass : 'text-zinc-600 dark:text-zinc-300',
            )}
          >
            <span className={iconClass}>
              <User size={18} />
            </span>
            <span className={labelClass}>我的</span>
          </Link>
        ) : null}
      </div>

      <div className="my-3 shrink-0 border-t border-zinc-200 dark:border-zinc-800" />

      <div
        className={joinClassNames(
          'sidebar-board-scroll scrollbar-none min-h-0 flex-1 overflow-y-auto',
          collapsed ? 'pr-0' : 'pr-1',
        )}
      >
        <div className="space-y-1 pb-10">
          {boards.map((board) => {
            const BoardIcon = getBoardIcon(board);

            return (
              <Link
                key={board}
                ref={board === activeBoard ? activeBoardLinkRef : undefined}
                to={getBoardPath(board)}
                onClick={handleOptionNavigate}
                aria-current={board === activeBoard ? 'page' : undefined}
                className={joinClassNames(
                  itemClass,
                  board === activeBoard ? activeItemClass : 'text-zinc-600 dark:text-zinc-300',
                )}
              >
                <span className={iconClass}>
                  <BoardIcon size={18} />
                </span>
                <span className={labelClass}>{board}</span>
              </Link>
            );
          })}

          {hasMoreBoards ? (
            <>
              <div
                className={joinClassNames(
                  'grid transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isMoreBoardsOpen
                    ? 'grid-rows-[1fr] translate-y-0 opacity-100'
                    : 'grid-rows-[0fr] -translate-y-1 opacity-0',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-1 pt-1">
                    {moreBoards.map((board) => {
                      const BoardIcon = getBoardIcon(board);

                      return (
                        <Link
                          key={board}
                          ref={board === activeBoard ? activeBoardLinkRef : undefined}
                          to={getBoardPath(board)}
                          onClick={handleOptionNavigate}
                          aria-current={board === activeBoard ? 'page' : undefined}
                          className={joinClassNames(
                            itemClass,
                            board === activeBoard ? activeItemClass : 'text-zinc-600 dark:text-zinc-300',
                          )}
                        >
                          <span className={iconClass}>
                            <BoardIcon size={18} />
                          </span>
                          <span className={labelClass}>{board}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-expanded={isMoreBoardsOpen}
                aria-label={isMoreBoardsOpen ? '收起更多板块' : '展开更多板块'}
                onClick={() => {
                  expandAfterCollapsedOptionClick();
                  setIsMoreBoardsOpen((value) => {
                    const nextValue = !value;

                    if (nextValue) {
                      onMoreBoardsExpand?.();
                    }

                    return nextValue;
                  });
                }}
                className={joinClassNames(
                  itemClass,
                  'sidebar-toggle-option w-full text-zinc-600 dark:text-zinc-300',
                )}
              >
                <span className={iconClass}>
                  {isMoreBoardsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
                <span className={labelClass}>{isMoreBoardsOpen ? '收起' : '更多'}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 shrink-0 space-y-1">
        <Link
          to={DATA_DISPLAY_PATH}
          onClick={handleOptionNavigate}
          className={joinClassNames(
            bottomItemClass,
            activeItem === 'stats' ? activeItemClass : 'text-zinc-600 dark:text-zinc-300',
          )}
        >
          <span className={iconClass}>
            <ChartNoAxesColumn size={18} />
          </span>
          <span className={labelClass}>数据展示</span>
        </Link>
        <button
          type="button"
          aria-label="打开界面设置"
          onClick={() => {
            onOpenInterfaceSettings?.();
            handleOptionNavigate();
          }}
          className={joinClassNames(bottomItemClass, 'sidebar-toggle-option')}
        >
          <span className={iconClass}>
            <Settings2 size={18} />
          </span>
          <span className={labelClass}>界面设置</span>
        </button>
        {showCollapseToggle ? (
          <>
            <div className="border-t border-zinc-200 dark:border-zinc-800" />
            <button
              type="button"
              aria-label={collapsed ? '展开左侧栏' : '折叠左侧栏'}
              onClick={onToggle}
              className={joinClassNames(bottomItemClass, 'sidebar-toggle-option')}
            >
              <span className={iconClass}>
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </span>
              <span className={labelClass}>{collapsed ? '展开侧栏' : '折叠侧栏'}</span>
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
}
