import { LogIn, LogOut, MessageCircle, User, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import type { LegacyBbsViewer } from '../../api/legacyBbsClient';
import { getLoginPathWithReturnTo } from '../../utils/authRoutes';
import { getViewerStorageOwnerKey } from '../../utils/viewerStorage';
import { isGuestViewer } from '../../utils/viewerPermissions';
import { Avatar } from '../common/Avatar';

type TopBarUserMenuProps = {
  isOpen: boolean;
  isSessionRestoring?: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  userMenuPanelRef: RefObject<HTMLDivElement | null>;
  userMenuRef: RefObject<HTMLDivElement | null>;
  viewer: LegacyBbsViewer;
};

export function TopBarUserMenu({
  isOpen,
  isSessionRestoring = false,
  onClose,
  onLogout,
  onMouseEnter,
  onMouseLeave,
  onToggle,
  userMenuPanelRef,
  userMenuRef,
  viewer,
}: TopBarUserMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const isGuest = isGuestViewer(viewer);
  const viewerUsername = viewer?.username.trim();
  const avatarCacheKey = viewerUsername ? `username:${viewerUsername}` : getViewerStorageOwnerKey(viewer) ?? undefined;

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return undefined;
    }

    const updateMenuPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setMenuStyle({
        position: 'fixed',
        right: Math.max(12, window.innerWidth - buttonRect.right),
        top: buttonRect.bottom + 12,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  if (isGuest && isSessionRestoring) {
    return (
      <div
        aria-label="正在恢复登录状态"
        className="flex h-[var(--capubbs-topbar-button-size)] min-w-[var(--capubbs-topbar-button-size)] shrink-0 items-center justify-center rounded-md border border-white/[0.28] bg-white/[0.24] dark:border-white/[0.14] dark:bg-white/[0.08]"
      >
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#385772]/35 border-t-[#385772] dark:border-white/25 dark:border-t-white" />
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="flex h-[var(--capubbs-topbar-button-size)] shrink-0 items-center gap-1.5">
        <AuthLink icon={<LogIn size={15} />} label="登录" to={getLoginPathWithReturnTo(location)} />
        <AuthLink icon={<UserPlus size={15} />} label="注册" to="/register" subtle />
      </div>
    );
  }

  return (
    <div
      ref={userMenuRef}
      className="relative flex h-[var(--capubbs-topbar-button-size)] w-[var(--capubbs-topbar-button-size)] items-center justify-center"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-topbar-ignore-return
        onClick={onToggle}
        className="flex h-[var(--capubbs-topbar-avatar-size)] w-[var(--capubbs-topbar-avatar-size)] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.36] ring-1 ring-white/30 transition hover:bg-white/[0.48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-white/[0.14] dark:ring-white/[0.18] dark:hover:bg-white/[0.22]"
        aria-label="个人菜单"
      >
        <Avatar
          alt={`${viewer?.username ?? '个人'}头像`}
          cacheKey={avatarCacheKey}
          className="h-full w-full ring-0"
          src={viewer?.avatar || undefined}
        />
      </button>

      {isOpen && menuStyle ? createPortal(
        <div
          ref={userMenuPanelRef}
          role="menu"
          aria-label="个人菜单"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          style={menuStyle}
          className="z-[1000] w-56 overflow-hidden rounded-lg border border-white/45 bg-white/[0.88] shadow-panel backdrop-blur-[120px] backdrop-saturate-150 dark:border-white/[0.22] dark:bg-zinc-950/[0.82]"
        >
          <div className="p-2">
            <MenuItem icon={<User size={16} />} label="个人中心" to="/user-center" onClick={onClose} />
            <MenuItem icon={<MessageCircle size={16} />} label="问题反馈" onClick={onClose} />
            <MenuItem
              icon={<LogOut size={16} />}
              label="退出登录"
              destructive
              onClick={() => {
                onClose();
                void onLogout();
              }}
            />
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function AuthLink({
  icon,
  label,
  subtle = false,
  to,
}: {
  icon: ReactNode;
  label: string;
  subtle?: boolean;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={
        subtle
          ? 'inline-flex h-[var(--capubbs-topbar-button-size)] items-center gap-1.5 rounded-md border border-white/[0.28] bg-white/[0.24] px-2.5 text-xs font-bold text-[#385772] transition hover:bg-white/[0.38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14] sm:px-3 sm:text-sm'
          : 'inline-flex h-[var(--capubbs-topbar-button-size)] items-center gap-1.5 rounded-md bg-[#385772] px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 sm:px-3 sm:text-sm'
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

type MenuItemProps = {
  icon: ReactNode;
  label: string;
  destructive?: boolean;
  to?: string;
  onClick: () => void;
};

function MenuItem({ icon, label, destructive = false, to, onClick }: MenuItemProps) {
  const className = destructive
    ? 'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40'
    : 'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-700 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-50 dark:hover:bg-emerald-900/40 dark:hover:text-white';
  const content = (
    <>
      <span className={destructive ? 'text-rose-500 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-200'}>
        {icon}
      </span>
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} role="menuitem" onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
