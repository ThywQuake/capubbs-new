import { Bell } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import type { DirectConversation, ForumMessage, MessageCategory } from '../../types/forum';
import type { OpenDirectConversationRequest } from '../../types/messages';
import { getPublicProfilePath } from '../../utils/userRoutes';
import { topBarActionButtonClass } from '../layout/TopBar.constants';
import { DirectMessageWindow } from './DirectMessageWindow';
import { MessagePopover } from './MessagePopover';

type TopBarMessagesProps = {
  directConversations: DirectConversation[];
  dismissKey: number;
  hasMoreReplies?: boolean;
  isGuest: boolean;
  isLoading?: boolean;
  isLoadingMoreReplies?: boolean;
  messages: ForumMessage[];
  openDirectConversationRequest?: OpenDirectConversationRequest | null;
  openMessagesRequest?: number;
  onBeforeOpen?: () => void;
  onLoadMessageConversation?: (conversationId: string) => Promise<void>;
  onLoadMoreReplies?: () => Promise<void>;
  onMarkMessageCategoryRead?: (category: MessageCategory) => void;
  onMarkMessageConversationRead?: (conversationId: string) => void;
  onMarkMessageRead?: (messageId: string) => void;
  onRequestMessages?: () => void;
  onSendDirectMessage?: (conversationId: string, text: string) => Promise<void>;
  unreadMessageCount?: number;
};

export function TopBarMessages({
  directConversations,
  dismissKey,
  hasMoreReplies = false,
  isGuest,
  isLoading = false,
  isLoadingMoreReplies = false,
  messages,
  openDirectConversationRequest = null,
  openMessagesRequest = 0,
  onBeforeOpen,
  onLoadMessageConversation,
  onLoadMoreReplies,
  onMarkMessageCategoryRead,
  onMarkMessageConversationRead,
  onMarkMessageRead,
  onRequestMessages,
  onSendDirectMessage,
  unreadMessageCount,
}: TopBarMessagesProps) {
  const [isMessagePopoverOpen, setIsMessagePopoverOpen] = useState(false);
  const [activeDirectConversationId, setActiveDirectConversationId] = useState<string | null>(null);
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(() => new Set());
  const [readDirectConversationIds, setReadDirectConversationIds] = useState<Set<string>>(() => new Set());
  const localUnreadMessageCount = messages.filter(
    (message) => message.unread && !readMessageIds.has(message.id),
  ).length;
  const visibleUnreadMessageCount = unreadMessageCount ?? localUnreadMessageCount;
  const directConversationsWithRequestedUser =
    openDirectConversationRequest && !directConversations.some((conversation) => conversation.id === openDirectConversationRequest.id)
      ? [
          {
            id: openDirectConversationRequest.id,
            user: openDirectConversationRequest.user,
            rating: '★★★',
            status: '新建私信',
            profileHref: getPublicProfilePath(openDirectConversationRequest.user),
            lastMessage: '',
            lastTime: '',
            unread: 0,
            messages: [],
            messagesLoaded: false,
          },
          ...directConversations,
        ]
      : directConversations;
  const visibleDirectConversations = directConversationsWithRequestedUser.map((conversation) =>
    readDirectConversationIds.has(conversation.id)
      ? { ...conversation, unread: 0 }
      : conversation,
  );

  const closeMessagePopover = () => {
    setIsMessagePopoverOpen(false);
  };

  const closeDirectMessageWindow = () => {
    setActiveDirectConversationId(null);
  };

  const closeMessages = () => {
    closeMessagePopover();
    closeDirectMessageWindow();
  };

  const markDirectConversationRead = (conversationId: string) => {
    onMarkMessageConversationRead?.(conversationId);
    setReadDirectConversationIds((current) => {
      if (current.has(conversationId)) {
        return current;
      }

      const next = new Set(current);
      next.add(conversationId);
      return next;
    });

    setReadMessageIds((current) => {
      const next = new Set(current);

      messages
        .filter((message) => message.category === 'direct' && message.conversationId === conversationId)
        .forEach((message) => next.add(message.id));

      return next;
    });
  };

  const openDirectConversation = (conversationId: string) => {
    onBeforeOpen?.();
    onRequestMessages?.();
    closeMessagePopover();
    markDirectConversationRead(conversationId);
    setActiveDirectConversationId(conversationId);
  };

  const toggleMessagePopover = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isGuest) {
      return;
    }

    onBeforeOpen?.();
    onRequestMessages?.();
    closeDirectMessageWindow();
    setIsMessagePopoverOpen((value) => !value);
  };

  const markMessageCategoryRead = (category: MessageCategory) => {
    onMarkMessageCategoryRead?.(category);
    setReadMessageIds((current) => {
      const next = new Set(current);

      messages
        .filter((message) => message.category === category)
        .forEach((message) => next.add(message.id));

      return next;
    });
  };

  const openThreadMessage = (messageId: string) => {
    onMarkMessageRead?.(messageId);
    setReadMessageIds((current) => {
      if (current.has(messageId)) {
        return current;
      }

      const next = new Set(current);
      next.add(messageId);
      return next;
    });
    closeMessagePopover();
  };

  useEffect(() => {
    closeMessages();
  }, [dismissKey]);

  useEffect(() => {
    if (openMessagesRequest === 0 || isGuest) {
      return;
    }

    onBeforeOpen?.();
    onRequestMessages?.();
    closeDirectMessageWindow();
    setIsMessagePopoverOpen(true);
  }, [isGuest, openMessagesRequest]);

  useEffect(() => {
    if (!openDirectConversationRequest || isGuest) {
      return;
    }

    openDirectConversation(openDirectConversationRequest.id);
  }, [isGuest, openDirectConversationRequest?.id, openDirectConversationRequest?.requestKey]);

  useEffect(() => {
    if (!isGuest) {
      return;
    }

    closeMessages();
  }, [isGuest]);

  useEffect(() => {
    if (!isMessagePopoverOpen && activeDirectConversationId === null) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMessages();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeDirectConversationId, isMessagePopoverOpen]);

  if (isGuest) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          className={`${topBarActionButtonClass} relative`}
          aria-label="消息"
          aria-haspopup="dialog"
          aria-expanded={isMessagePopoverOpen}
          data-topbar-ignore-return
          onClick={toggleMessagePopover}
        >
          <Bell className="topbar-icon" />
          {visibleUnreadMessageCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-emerald-800 px-1 text-[0.62rem] font-bold leading-4 text-white ring-2 ring-white/70 dark:bg-emerald-200 dark:text-zinc-950 dark:ring-zinc-950/70">
              {visibleUnreadMessageCount}
            </span>
          ) : null}
        </button>
        {isMessagePopoverOpen ? (
          <MessagePopover
            hasMoreReplies={hasMoreReplies}
            isLoading={isLoading}
            isLoadingMoreReplies={isLoadingMoreReplies}
            messages={messages}
            readMessageIds={readMessageIds}
            onClose={closeMessagePopover}
            onLoadMoreReplies={onLoadMoreReplies}
            onOpenDirectConversation={openDirectConversation}
            onOpenThreadMessage={openThreadMessage}
            onMarkCategoryRead={markMessageCategoryRead}
          />
        ) : null}
      </div>

      {activeDirectConversationId ? (
        <DirectMessageWindow
          activeConversationId={activeDirectConversationId}
          conversations={visibleDirectConversations}
          onClose={closeDirectMessageWindow}
          onLoadConversation={onLoadMessageConversation}
          onSelectConversation={openDirectConversation}
          onSendMessage={onSendDirectMessage}
        />
      ) : null}
    </>
  );
}
