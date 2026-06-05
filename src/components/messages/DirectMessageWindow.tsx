import { LoaderCircle, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DirectChatMessage, DirectConversation } from '../../types/forum';
import { joinClassNames } from '../../utils/classNames';
import { Avatar } from '../common/Avatar';

type DirectMessageWindowProps = {
  activeConversationId: string;
  conversations: DirectConversation[];
  onClose: () => void;
  onLoadConversation?: (conversationId: string) => Promise<void>;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage?: (conversationId: string, text: string) => Promise<void>;
};

export function DirectMessageWindow({
  activeConversationId,
  conversations,
  onClose,
  onLoadConversation,
  onSelectConversation,
  onSendMessage,
}: DirectMessageWindowProps) {
  const [draft, setDraft] = useState('');
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];
  const activeMessages = activeConversation?.messages ?? [];
  const isLoadingActiveConversation = loadingConversationId === activeConversation?.id;

  useEffect(() => {
    if (!activeConversation || activeConversation.messagesLoaded || !onLoadConversation) {
      return;
    }

    let isStale = false;

    setLoadError(null);
    setLoadingConversationId(activeConversation.id);
    onLoadConversation(activeConversation.id)
      .catch((error: unknown) => {
        if (!isStale) {
          setLoadError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!isStale) {
          setLoadingConversationId(null);
        }
      });

    return () => {
      isStale = true;
    };
  }, [activeConversation?.id, activeConversation?.messagesLoaded, onLoadConversation]);

  if (!activeConversation || typeof document === 'undefined') {
    return null;
  }

  const sendDraftMessage = async () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    if (!onSendMessage) {
      setSendError('私信发送接口未初始化，请刷新页面后重试。');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      await onSendMessage(activeConversation.id, text);
      setDraft('');
    } catch (error) {
      setSendError(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

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
        aria-label={`私信：${activeConversation.user}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        className="grid h-[min(42rem,calc(100vh-1.5rem))] w-[min(calc(100vw-1.5rem),52rem)] grid-rows-[auto_7.75rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/55 bg-white text-zinc-950 shadow-2xl dark:border-white/[0.16] dark:bg-zinc-950 dark:text-white sm:grid-cols-[15.5rem_minmax(0,1fr)] sm:grid-rows-[auto_minmax(0,1fr)]"
      >
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-white/10 sm:col-span-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">私信：{activeConversation.user}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">选择对象后查看消息记录</p>
          </div>
          <button
            type="button"
            aria-label="关闭私信"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/[0.38] text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <aside className="scrollbar-none flex gap-2 overflow-x-auto border-b border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-zinc-900/80 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              aria-pressed={conversation.id === activeConversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={joinClassNames(
                'flex min-w-20 flex-col items-center gap-1.5 rounded-md border px-2.5 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] sm:min-w-0 sm:flex-row sm:gap-3 sm:p-3 sm:text-left',
                conversation.id === activeConversation.id
                  ? 'border-emerald-700/20 bg-[rgb(164_193_172_/_0.34)]'
                  : 'border-transparent bg-transparent hover:bg-white dark:hover:bg-white/[0.06]',
              )}
            >
              <Avatar alt={`${conversation.user}的头像`} className="h-9 w-9" />
              <span className="min-w-0 max-w-full sm:flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#385772] dark:text-white">{conversation.user}</span>
                  <span className="hidden shrink-0 text-xs text-[#875A41] dark:text-white/70 sm:inline">{conversation.lastTime}</span>
                </span>
                <span className="mt-1 hidden items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex">
                  <span className="truncate">{conversation.lastMessage || '还没有历史私信'}</span>
                  {conversation.unread > 0 ? (
                    <span className="ml-auto rounded-full bg-emerald-800 px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-white dark:bg-emerald-200 dark:text-zinc-950">
                      {conversation.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-4 py-4 dark:bg-zinc-900/60">
            {isLoadingActiveConversation ? (
              <div className="flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-800 dark:text-emerald-100" />
                <span>正在读取私信记录</span>
              </div>
            ) : loadError ? (
              <div className="flex h-full min-h-44 items-center justify-center rounded-lg border border-dashed border-red-200 bg-white px-4 text-center text-sm text-red-700 dark:border-red-400/30 dark:bg-zinc-950 dark:text-red-200">
                {loadError}
              </div>
            ) : activeMessages.length > 0 ? (
              <MessageTimeline conversation={activeConversation} messages={activeMessages} />
            ) : (
              <div className="flex h-full min-h-44 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                还没有历史私信
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="输入私信内容"
              disabled={isSending}
              className="h-20 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-700/40 focus:bg-white focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500 dark:focus:bg-white/[0.08]"
            />
            {sendError ? (
              <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-200" role="status">
                {sendError}
              </p>
            ) : null}
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={sendDraftMessage}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
                disabled={draft.trim().length === 0 || isSending}
              >
                <Send size={15} />
                {isSending ? '发送中' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

type MessageTimelineProps = {
  conversation: DirectConversation;
  messages: DirectChatMessage[];
};

function MessageTimeline({ conversation, messages }: MessageTimelineProps) {
  let lastDate = '';

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const showDate = message.date !== lastDate;
        lastDate = message.date;

        return (
          <div key={message.id} className="space-y-2">
            {showDate ? (
              <div className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">{message.date}</div>
            ) : null}
            <div
              className={joinClassNames(
                'flex flex-col',
                message.author === 'me' ? 'items-end' : 'items-start',
              )}
            >
              <span className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {message.author === 'me' ? '你' : conversation.user}
              </span>
              <div
                className={joinClassNames(
                  'max-w-[82%] whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-sm leading-6 shadow-sm',
                  message.author === 'me'
                    ? 'border-emerald-700/20 bg-[rgb(164_193_172_/_0.34)] text-zinc-950 dark:border-emerald-100/20 dark:bg-emerald-950/40 dark:text-white'
                    : 'border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100',
                )}
              >
                {message.text}
              </div>
              <span className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{message.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '私信请求失败，请稍后重试。';
}
