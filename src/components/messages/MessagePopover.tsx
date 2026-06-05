import { CheckCheck, LoaderCircle, Mail, MessageCircleReply, MessageSquareText, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ForumMessage, MessageCategory } from '../../types/forum';
import { joinClassNames } from '../../utils/classNames';
import { getThreadPathFromHref } from '../../utils/threadRoutes';

type MessagePopoverProps = {
  hasMoreReplies?: boolean;
  isLoading?: boolean;
  isLoadingMoreReplies?: boolean;
  messages: ForumMessage[];
  readMessageIds: Set<string>;
  onClose: () => void;
  onLoadMoreReplies?: () => Promise<void>;
  onOpenDirectConversation: (conversationId: string) => void;
  onOpenThreadMessage: (messageId: string) => void;
  onMarkCategoryRead: (category: MessageCategory) => void;
};

const messageTabs: Array<{ key: MessageCategory; label: string; icon: ReactNode }> = [
  { key: 'replies', label: '回复', icon: <MessageCircleReply size={16} /> },
  { key: 'direct', label: '私信', icon: <Mail size={16} /> },
];

export function MessagePopover({
  hasMoreReplies = false,
  isLoading = false,
  isLoadingMoreReplies = false,
  messages,
  readMessageIds,
  onClose,
  onLoadMoreReplies,
  onOpenDirectConversation,
  onOpenThreadMessage,
  onMarkCategoryRead,
}: MessagePopoverProps) {
  const [activeCategory, setActiveCategory] = useState<MessageCategory>('replies');
  const unreadCounts = useMemo(
    () =>
      messageTabs.reduce<Record<MessageCategory, number>>(
        (counts, tab) => ({
          ...counts,
          [tab.key]: messages.filter(
            (message) =>
              message.category === tab.key &&
              message.unread &&
              !readMessageIds.has(message.id),
          ).length,
        }),
        { replies: 0, mentions: 0, direct: 0 },
      ),
    [messages, readMessageIds],
  );
  const activeMessages = messages.filter((message) => message.category === activeCategory);
  const groupedMessages = groupMessagesByTime(activeMessages);
  const activeUnreadCount = unreadCounts[activeCategory];
  const showLoadMoreReplies = activeCategory === 'replies' && hasMoreReplies;

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-[1px] dark:bg-black/80"
      onClick={onClose}
      onDoubleClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <section
        role="dialog"
        aria-label="消息"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        className="grid h-[min(38rem,calc(100vh-1.5rem))] w-[min(calc(100vw-1.5rem),44rem)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/55 bg-white text-zinc-950 shadow-2xl dark:border-white/[0.16] dark:bg-zinc-950 dark:text-white sm:grid-cols-[9.25rem_minmax(0,1fr)] sm:grid-rows-[auto_minmax(0,1fr)]"
      >
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-white/10 sm:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgb(164_193_172_/_0.34)] text-emerald-800 dark:bg-white/[0.1] dark:text-emerald-100">
              <MessageSquareText size={17} />
            </span>
            <div>
              <h2 className="text-base font-semibold">消息</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">回复和私信</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭消息"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/[0.38] text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <nav className="scrollbar-none flex gap-1 overflow-x-auto border-b border-zinc-200 p-2 dark:border-white/10 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
          {messageTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={activeCategory === tab.key}
              aria-label={tab.label}
              onClick={() => setActiveCategory(tab.key)}
              className={joinClassNames(
                'flex h-10 min-w-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] sm:min-w-0 sm:justify-between sm:gap-3',
                activeCategory === tab.key
                  ? 'border-emerald-700/20 bg-[rgb(164_193_172_/_0.34)] text-zinc-950 dark:border-white/12 dark:bg-white/[0.12] dark:text-white'
                  : 'border-transparent bg-transparent text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-700/80 dark:text-emerald-100/80">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {unreadCounts[tab.key] > 0 ? (
                <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-[0.68rem] font-bold leading-none text-white dark:bg-emerald-200 dark:text-zinc-950">
                  {unreadCounts[tab.key]}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {isLoading ? (
              <LoadingMessagesPanel />
            ) : groupedMessages.length > 0 ? (
              <div className="space-y-4">
                {groupedMessages.map((group) => (
                  <section key={group.label}>
                    <h4 className="mb-2 px-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{group.label}</h4>
                    <div className="space-y-2">
                      {group.items.map((message) => (
                        <MessageCard
                          key={message.id}
                          message={message}
                          isRead={!message.unread || readMessageIds.has(message.id)}
                          onOpenDirectConversation={onOpenDirectConversation}
                          onOpenThreadMessage={onOpenThreadMessage}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                {showLoadMoreReplies ? (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        void onLoadMoreReplies?.();
                      }}
                      disabled={isLoadingMoreReplies || !onLoadMoreReplies}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#385772] transition hover:border-emerald-700/30 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                    >
                      {isLoadingMoreReplies ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      下一页
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                暂无消息
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => onMarkCategoryRead(activeCategory)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/25 bg-white/[0.38] px-3 text-sm font-semibold text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
              disabled={isLoading || activeUnreadCount === 0}
            >
              <CheckCheck size={15} />
              全部已读
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function LoadingMessagesPanel() {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400" role="status">
      <LoaderCircle className="h-5 w-5 animate-spin text-emerald-800 dark:text-emerald-100" />
      <span>正在加载消息</span>
    </div>
  );
}

type MessageCardProps = {
  message: ForumMessage;
  isRead: boolean;
  onOpenDirectConversation: (conversationId: string) => void;
  onOpenThreadMessage: (messageId: string) => void;
};

function MessageCard({ message, isRead, onOpenDirectConversation, onOpenThreadMessage }: MessageCardProps) {
  const isDirect = message.category === 'direct';
  const messagePath = getThreadPathFromHref(message.href);
  const openDirectConversation = () => {
    if (message.conversationId) {
      onOpenDirectConversation(message.conversationId);
    }
  };

  return (
    <article
      className={joinClassNames(
        'rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-lg',
        isRead
          ? 'border-zinc-200/80 bg-white/[0.36] dark:border-white/[0.08] dark:bg-white/[0.06]'
          : 'border-emerald-700/20 bg-[rgb(164_193_172_/_0.3)] dark:border-emerald-100/20 dark:bg-emerald-950/30',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={joinClassNames(
            'mt-1 h-2 w-2 shrink-0 rounded-full',
            isRead ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-emerald-700 dark:bg-emerald-200',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h4 className="text-sm font-semibold text-[#385772] dark:text-white">
              {isDirect ? message.title : `${message.sender} ${message.title}`}
            </h4>
            <span className="text-xs font-medium text-[#875A41] dark:text-white/80">{message.time}</span>
          </div>
          {message.context ? (
            <Link
              to={messagePath}
              onClick={() => onOpenThreadMessage(message.id)}
              className="mt-1 block truncate rounded-sm text-sm font-medium text-zinc-700 outline-none transition hover:text-zinc-950 hover:underline focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-200 dark:hover:text-white"
            >
              {message.context}
            </Link>
          ) : null}
          {isDirect ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{message.excerpt}</p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            {isDirect ? (
              <button
                type="button"
                onClick={openDirectConversation}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-100 dark:hover:bg-white/[0.08]"
              >
                打开对话
              </button>
            ) : (
              <Link
                to={messagePath}
                onClick={() => onOpenThreadMessage(message.id)}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-100 dark:hover:bg-white/[0.08]"
              >
                打开
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function groupMessagesByTime(messages: ForumMessage[]) {
  return messages.reduce<Array<{ label: string; items: ForumMessage[] }>>((groups, message) => {
    const existingGroup = groups.find((group) => group.label === message.group);

    if (existingGroup) {
      existingGroup.items.push(message);
      return groups;
    }

    return [...groups, { label: message.group, items: [message] }];
  }, []);
}
