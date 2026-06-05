import { Bell, Edit3, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { getActivityGradientClass } from '../../utils/activityGradients';
import { joinClassNames } from '../../utils/classNames';
import { Avatar } from '../common/Avatar';
import { ActionButton } from './ActionButton';

type ProfileSummaryCardProps = {
  avatarSrc?: string;
  isEditingProfile?: boolean;
  messageIcon?: ReactNode;
  messageLabel?: string;
  onAvatarClick?: () => void;
  onIntroChange?: (value: string) => void;
  onEditProfile?: () => void;
  onOpenAccountSecurity?: () => void;
  onOpenMessages: () => void;
  intro?: string;
  rating?: string;
  showEditAction?: boolean;
  showMessageAction?: boolean;
  userId: string;
};

export function ProfileSummaryCard({
  avatarSrc,
  isEditingProfile = false,
  messageIcon = <Bell size={15} />,
  messageLabel = '消息',
  onAvatarClick,
  onIntroChange,
  onEditProfile,
  onOpenAccountSecurity,
  onOpenMessages,
  intro = '',
  rating = '★★★',
  showEditAction = true,
  showMessageAction = true,
  userId,
}: ProfileSummaryCardProps) {
  const avatarCacheKey = userId.trim() ? `username:${userId.trim()}` : undefined;
  const avatar = (
    <Avatar
      alt={`${userId}的头像`}
      cacheKey={avatarCacheKey}
      className="h-full w-full"
      src={avatarSrc}
    />
  );

  return (
    <section
      className={joinClassNames(
        'overflow-hidden rounded-lg bg-gradient-to-r p-[1px] shadow-panel',
        getActivityGradientClass(userId),
      )}
    >
      <div className="card-surface relative overflow-hidden rounded-[7px] p-4">
        <div
          className={joinClassNames(
            'pointer-events-none absolute inset-0 bg-gradient-to-r opacity-[0.12] dark:opacity-[0.18]',
            getActivityGradientClass(userId),
          )}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {onAvatarClick ? (
              <button
                type="button"
                aria-label="查看头像"
                onClick={onAvatarClick}
                className={joinClassNames(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-full transition hover:ring-2 hover:ring-[#385772]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:hover:ring-white/55',
                  isEditingProfile && 'ring-2 ring-white shadow-[0_0_0_4px_rgba(255,255,255,0.28)] dark:ring-white dark:shadow-[0_0_0_4px_rgba(255,255,255,0.16)]',
                )}
              >
                {avatar}
              </button>
            ) : (
              <div className="h-16 w-16 shrink-0">{avatar}</div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-lg font-semibold text-[#385772] dark:text-white">{userId}</h3>
                <span className="text-sm font-semibold text-amber-500 dark:text-white">{rating}</span>
              </div>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={intro}
                  aria-label="个人简介"
                  placeholder="个人简介"
                  onChange={(event) => onIntroChange?.(event.target.value)}
                  className="mt-2 h-8 w-full min-w-[min(18rem,calc(100vw-9rem))] max-w-xl rounded-md border border-zinc-200 bg-white/70 px-2 text-sm font-semibold text-zinc-950 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              ) : (
                <p className="mt-1 max-w-xl break-words text-sm text-zinc-500 dark:text-zinc-400">
                  {intro.trim() || '暂无个人简介'}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:self-center">
            {showEditAction && (
              <>
                <ActionButton
                  icon={<Edit3 size={15} />}
                  label={isEditingProfile ? '保存资料' : '编辑资料'}
                  onClick={onEditProfile}
                />
                {onOpenAccountSecurity && (
                  <ActionButton
                    icon={<ShieldCheck size={15} />}
                    label="账号安全"
                    onClick={onOpenAccountSecurity}
                  />
                )}
              </>
            )}
            {showMessageAction ? <ActionButton icon={messageIcon} label={messageLabel} onClick={onOpenMessages} primary /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
