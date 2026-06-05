import { ChevronDown, Menu, Moon, Search, Sun } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TopBarMessages } from '../messages/TopBarMessages';
import { isGuestViewer } from '../../utils/viewerPermissions';
import {
  DESKTOP_TOPBAR_COLLAPSE_DISTANCE,
  MOBILE_TOPBAR_COLLAPSE_DISTANCE,
  SEARCH_PAGE_PATH,
  topBarActionButtonClass,
} from './TopBar.constants';
import { TopBarLogo } from './TopBarLogo';
import type { TopBarProps } from './TopBar.types';
import { TopBarUserMenu } from './TopBarUserMenu';
import { isReturnToTopIgnoredTarget, isTextInputTarget } from './TopBar.utils';

export function TopBar({
  collapsed,
  directConversations,
  hasMoreReplies = false,
  isDark,
  isLoadingMoreReplies = false,
  isMessagesLoading = false,
  isSessionRestoring = false,
  messages,
  logoClickPrompt = null,
  openDirectConversationRequest = null,
  openMessagesRequest = 0,
  readingThreadTitle,
  readingThreadTitleVisible = false,
  searchPlaceholder = '搜索帖子标题 / 正文',
  viewer,
  onCollapsedChange,
  onLogoClick,
  onLoadMessageConversation,
  onLoadMoreReplies,
  onLogout,
  onMarkMessageCategoryRead,
  onMarkMessageConversationRead,
  onMarkMessageRead,
  onOpenSidebar,
  onRequestMessages,
  onReturnToTop,
  onSendDirectMessage,
  onToggleDark,
  unreadMessageCount,
}: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [messageDismissKey, setMessageDismissKey] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const closeUserMenuTimer = useRef<number | null>(null);
  const userMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const collapseGestureStartYRef = useRef<number | null>(null);
  const collapseTouchStartYRef = useRef<number | null>(null);
  const lastTopBarTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const isGuest = isGuestViewer(viewer);
  const showReadingThreadTitle = Boolean(readingThreadTitle && readingThreadTitleVisible && !collapsed);
  const searchPath = buildSearchPath(searchDraft);

  const clearUserMenuCloseTimer = () => {
    if (closeUserMenuTimer.current !== null) {
      window.clearTimeout(closeUserMenuTimer.current);
      closeUserMenuTimer.current = null;
    }
  };

  const openUserMenu = () => {
    clearUserMenuCloseTimer();
    dismissTopBarMessages();
    setIsUserMenuOpen(true);
  };

  const closeUserMenu = () => {
    clearUserMenuCloseTimer();
    setIsUserMenuOpen(false);
  };

  const scheduleCloseUserMenu = () => {
    clearUserMenuCloseTimer();
    closeUserMenuTimer.current = window.setTimeout(() => {
      setIsUserMenuOpen(false);
      closeUserMenuTimer.current = null;
    }, 280);
  };

  const dismissTopBarMessages = () => {
    setMessageDismissKey((value) => value + 1);
  };

  const closeTopBarOverlays = () => {
    closeUserMenu();
    dismissTopBarMessages();
  };

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    closeTopBarOverlays();
    onLogoClick?.(event);
  };

  useEffect(() => {
    if (showReadingThreadTitle) {
      closeTopBarOverlays();
    }
  }, [showReadingThreadTitle]);

  const toggleUserMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    clearUserMenuCloseTimer();
    dismissTopBarMessages();
    setIsUserMenuOpen((value) => !value);
  };

  useEffect(() => () => clearUserMenuCloseTimer(), []);

  useEffect(() => {
    if (location.pathname !== SEARCH_PAGE_PATH) {
      setSearchDraft('');
      return;
    }

    setSearchDraft(new URLSearchParams(location.search).get('q') ?? '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeUserMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        (userMenuRef.current?.contains(target) || userMenuPanelRef.current?.contains(target))
      ) {
        return;
      }

      closeUserMenu();
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }, [isUserMenuOpen]);

  const handleTopBarDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;

    if (isReturnToTopIgnoredTarget(target)) {
      return;
    }

    onReturnToTop();
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    closeTopBarOverlays();
    navigate(searchPath);
  };

  const collapseTopBar = () => {
    setIsUserMenuOpen(false);
    dismissTopBarMessages();
    onCollapsedChange(true);
    collapseGestureStartYRef.current = null;
  };

  const expandTopBar = () => {
    onCollapsedChange(false);
  };

  const handleTopBarWheel = (event: WheelEvent<HTMLElement>) => {
    if (collapsed || isTextInputTarget(event.target) || event.deltaY < 18) {
      return;
    }

    collapseTopBar();
  };

  const handleTopBarPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (collapsed || isTextInputTarget(event.target) || event.button !== 0) {
      collapseGestureStartYRef.current = null;
      return;
    }

    collapseGestureStartYRef.current = event.clientY;
  };

  const handleTopBarPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (collapseGestureStartYRef.current === null) {
      return;
    }

    const collapseDistance =
      event.pointerType === 'mouse' ? DESKTOP_TOPBAR_COLLAPSE_DISTANCE : MOBILE_TOPBAR_COLLAPSE_DISTANCE;

    if (collapseGestureStartYRef.current - event.clientY > collapseDistance) {
      collapseTopBar();
    }
  };

  const handleTopBarPointerUp = (event: PointerEvent<HTMLElement>) => {
    resetCollapseGesture();

    if (
      collapsed ||
      event.pointerType === 'mouse' ||
      isReturnToTopIgnoredTarget(event.target)
    ) {
      lastTopBarTapRef.current = null;
      return;
    }

    const now = window.performance.now();
    const lastTap = lastTopBarTapRef.current;

    if (
      lastTap &&
      now - lastTap.time <= 320 &&
      Math.abs(event.clientX - lastTap.x) <= 28 &&
      Math.abs(event.clientY - lastTap.y) <= 28
    ) {
      event.preventDefault();
      lastTopBarTapRef.current = null;
      onReturnToTop();
      return;
    }

    lastTopBarTapRef.current = {
      time: now,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handleTopBarTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (
      collapsed ||
      event.touches.length !== 1 ||
      isTextInputTarget(event.target)
    ) {
      collapseTouchStartYRef.current = null;
      return;
    }

    collapseTouchStartYRef.current = event.touches[0].clientY;
  };

  const handleTopBarTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (collapseTouchStartYRef.current === null || event.touches.length !== 1) {
      return;
    }

    if (collapseTouchStartYRef.current - event.touches[0].clientY > MOBILE_TOPBAR_COLLAPSE_DISTANCE) {
      collapseTopBar();
    }
  };

  const resetTopBarTouchGesture = () => {
    collapseTouchStartYRef.current = null;
  };

  const resetCollapseGesture = () => {
    collapseGestureStartYRef.current = null;
  };

  return (
    <>
      <header
        onDoubleClick={handleTopBarDoubleClick}
        onPointerCancel={resetCollapseGesture}
        onPointerDown={handleTopBarPointerDown}
        onPointerLeave={resetCollapseGesture}
        onPointerMove={handleTopBarPointerMove}
        onPointerUp={handleTopBarPointerUp}
        onTouchCancel={resetTopBarTouchGesture}
        onTouchEnd={resetTopBarTouchGesture}
        onTouchMove={handleTopBarTouchMove}
        onTouchStart={handleTopBarTouchStart}
        onWheel={handleTopBarWheel}
        className={
          `topbar-surface fixed inset-x-0 top-0 z-30 border-b shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            collapsed ? 'pointer-events-none -translate-y-full' : 'translate-y-0'
          }`
        }
      >
        <div className="topbar-shell relative mx-auto h-[var(--capubbs-topbar-height)] max-w-[1480px] overflow-visible px-[var(--capubbs-topbar-x)]">
          <div
            className={`flex h-full items-center gap-[var(--capubbs-topbar-gap)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              showReadingThreadTitle ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            <button
            type="button"
            aria-label="展开左侧栏"
            onClick={onOpenSidebar}
            className={`${topBarActionButtonClass} lg:hidden`}
          >
            <Menu className="topbar-icon" />
          </button>
          <TopBarLogo onClick={handleLogoClick} />
          <label className="topbar-search topbar-search-inline relative flex h-[var(--capubbs-topbar-button-size)] min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 text-zinc-500/80 dark:text-white/[0.68]" size={18} />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="topbar-search-field h-full min-w-0 w-full rounded-md border border-white/[0.28] bg-[rgb(164_193_172_/_0.36)] pl-10 pr-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-700/[0.62] focus:border-white/45 focus:bg-[rgb(164_193_172_/_0.48)] dark:border-white/[0.16] dark:bg-zinc-200/10 dark:text-white dark:placeholder:text-white/[0.58] dark:focus:border-white/[0.28] dark:focus:bg-zinc-200/[0.16]"
              placeholder={searchPlaceholder}
            />
          </label>
          <div className="topbar-actions flex shrink-0 items-center gap-[var(--capubbs-topbar-action-gap)]">
            <Link
              to={searchPath}
              aria-label="搜索"
              onClick={closeTopBarOverlays}
              className={`${topBarActionButtonClass} topbar-search-button`}
            >
              <Search className="topbar-icon" />
            </Link>
            <button
              type="button"
              aria-label={isDark ? '切换到亮色模式' : '切换到暗黑模式'}
              onClick={onToggleDark}
              className={topBarActionButtonClass}
            >
              {isDark ? <Sun className="topbar-icon" /> : <Moon className="topbar-icon" />}
            </button>
            <TopBarMessages
              directConversations={directConversations}
              dismissKey={messageDismissKey}
              hasMoreReplies={hasMoreReplies}
              isGuest={isGuest}
              isLoading={isMessagesLoading}
              isLoadingMoreReplies={isLoadingMoreReplies}
              messages={messages}
              openDirectConversationRequest={openDirectConversationRequest}
              openMessagesRequest={openMessagesRequest}
              onBeforeOpen={closeUserMenu}
              onLoadMessageConversation={onLoadMessageConversation}
              onLoadMoreReplies={onLoadMoreReplies}
              onMarkMessageCategoryRead={onMarkMessageCategoryRead}
              onMarkMessageConversationRead={onMarkMessageConversationRead}
              onMarkMessageRead={onMarkMessageRead}
              onRequestMessages={onRequestMessages}
              onSendDirectMessage={onSendDirectMessage}
              unreadMessageCount={unreadMessageCount}
            />
            <TopBarUserMenu
              isOpen={isUserMenuOpen}
              isSessionRestoring={isSessionRestoring}
              viewer={viewer}
              userMenuRef={userMenuRef}
              onClose={closeUserMenu}
              onLogout={onLogout}
              onMouseEnter={openUserMenu}
              onMouseLeave={scheduleCloseUserMenu}
              onToggle={toggleUserMenu}
              userMenuPanelRef={userMenuPanelRef}
            />
          </div>
          </div>

          <div
            aria-hidden={!showReadingThreadTitle}
            className={`pointer-events-none absolute inset-x-[var(--capubbs-topbar-x)] inset-y-0 flex items-center justify-center transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              showReadingThreadTitle ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
            <div className="flex min-w-0 max-w-full items-center rounded-full border border-white/45 bg-white/[0.34] px-4 py-2 text-center shadow-sm dark:border-white/[0.16] dark:bg-white/[0.1]">
              <span className="capubbs-title-wrap min-w-0 text-sm font-bold leading-tight text-[#385772] dark:text-white sm:text-base">
                {readingThreadTitle}
              </span>
            </div>
          </div>
        </div>
      </header>

      {logoClickPrompt ? (
        <div
          key={logoClickPrompt}
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-[calc(var(--capubbs-topbar-height)+0.5rem)] z-[1000] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/40 bg-white/[0.9] px-4 py-2 text-sm font-semibold text-[#385772] shadow-panel backdrop-blur-xl dark:border-white/[0.18] dark:bg-zinc-950/[0.86] dark:text-white"
          style={{ animation: 'capubbs-logo-click-prompt-in 180ms ease-out both' }}
        >
          {logoClickPrompt}
        </div>
      ) : null}

      <button
        type="button"
        aria-label="展开顶栏"
        aria-hidden={!collapsed}
        tabIndex={collapsed ? 0 : -1}
        onClick={expandTopBar}
        className={
          `topbar-collapse-surface fixed left-1/2 top-0 z-40 flex h-5 w-10 -translate-x-1/2 items-center justify-center rounded-b-full border border-t-0 text-zinc-700 shadow-sm transition-[opacity,transform,border-color,background-color,color] duration-200 hover:bg-[rgb(220_232_224)] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white/[0.86] dark:hover:bg-[rgb(12_42_22)] dark:hover:text-white ${
            collapsed ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'
          }`
        }
      >
        <ChevronDown size={14} />
      </button>

    </>
  );
}

function buildSearchPath(keyword: string) {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword) {
    return SEARCH_PAGE_PATH;
  }

  return `${SEARCH_PAGE_PATH}?q=${encodeURIComponent(normalizedKeyword)}`;
}
