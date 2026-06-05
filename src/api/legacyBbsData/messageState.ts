import type { DirectConversation, ForumMessage, MessageCategory } from '../../types/forum';
import type { LegacyBbsMessagesResponse } from '../legacyBbsClient';

export function markMessagesStateRead(
  data: LegacyBbsMessagesResponse,
  shouldMarkMessageRead: (message: ForumMessage) => boolean,
): LegacyBbsMessagesResponse {
  const messages = data.messages.map((message) =>
    shouldMarkMessageRead(message) ? { ...message, unread: false } : message,
  );
  const conversations = recalculateDirectConversationUnread(data.directConversations, messages);

  return {
    ...data,
    directConversations: conversations,
    messages,
    unreadCounts: countUnreadMessages(messages),
  };
}

export function markDirectConversationStateRead(
  data: LegacyBbsMessagesResponse,
  conversationId: string,
): LegacyBbsMessagesResponse {
  const messages = data.messages.map((message) =>
    message.category === 'direct' && message.conversationId === conversationId
      ? { ...message, unread: false }
      : message,
  );
  const directConversations = data.directConversations.map((conversation) =>
    conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation,
  );

  return {
    ...data,
    directConversations,
    messages,
    unreadCounts: countUnreadMessages(messages),
  };
}

export function appendReplyMessagesState(
  data: LegacyBbsMessagesResponse,
  incoming: LegacyBbsMessagesResponse,
): LegacyBbsMessagesResponse {
  const existingIds = new Set(data.messages.map((message) => message.id));
  const appendedReplies = incoming.messages.filter(
    (message) => message.category === 'replies' && !existingIds.has(message.id),
  );

  return {
    ...data,
    hasMoreReplies: incoming.hasMoreReplies,
    messages: [...data.messages, ...appendedReplies],
    replyPage: incoming.replyPage,
  };
}

export function mergeDirectConversationState(
  data: LegacyBbsMessagesResponse,
  conversation: DirectConversation,
  unreadCounts = data.unreadCounts,
): LegacyBbsMessagesResponse {
  const hasConversation = data.directConversations.some((item) => item.id === conversation.id);
  const directConversations = hasConversation
    ? data.directConversations.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              ...conversation,
            }
          : item,
      )
    : [conversation, ...data.directConversations];
  const conversationMessage = mapDirectConversationMessage(conversation);
  const hasMessage = data.messages.some((message) => message.id === conversationMessage.id);
  const messages = hasMessage
    ? data.messages.map((message) =>
        message.id === conversationMessage.id ? conversationMessage : message,
      )
    : [conversationMessage, ...data.messages];

  return {
    ...data,
    directConversations,
    messages,
    unreadCounts,
  };
}

function recalculateDirectConversationUnread(
  conversations: DirectConversation[],
  messages: ForumMessage[],
) {
  return conversations.map((conversation) => {
    const directMessage = messages.find(
      (message) => message.category === 'direct' && message.conversationId === conversation.id,
    );

    return directMessage && !directMessage.unread ? { ...conversation, unread: 0 } : conversation;
  });
}

function countUnreadMessages(messages: ForumMessage[]): Record<MessageCategory | 'total', number> {
  const counts: Record<MessageCategory | 'total', number> = {
    direct: 0,
    mentions: 0,
    replies: 0,
    total: 0,
  };

  messages.forEach((message) => {
    if (!message.unread) {
      return;
    }

    counts[message.category] += 1;
    counts.total += 1;
  });

  return counts;
}

function mapDirectConversationMessage(conversation: DirectConversation): ForumMessage {
  return {
    id: `direct-${conversation.id}`,
    category: 'direct',
    sender: conversation.user,
    title: conversation.user,
    conversationId: conversation.id,
    excerpt: conversation.lastMessage || '打开对话查看私信记录',
    time: conversation.lastTime,
    group: conversation.lastTime ? '私信' : '更早',
    href: `#message-${conversation.id}`,
    unread: conversation.unread > 0,
  };
}
