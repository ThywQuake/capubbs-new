import type { DirectChatMessage, DirectConversation, ForumMessage, MessageCategory } from '../../types/forum';
import { getThreadFloorPath, getThreadPath } from '../../utils/threadRoutes';
import { getPublicProfilePath } from '../../utils/userRoutes';
import { callOptionalLegacyCurrentUser } from './currentUser';
import { callLegacyAsk } from './transport';
import type { LegacyBbsDirectConversationResponse, LegacyBbsMessagesResponse, LegacyRequestBody, LegacyRow } from './types';
import { decodeLegacyHtmlEntities, isRecord, padDatePart, stringValue, toNumber } from './utils';

const SYSTEM_MESSAGE_PAGE_SIZE = 10;

export async function fetchLegacyMessages(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsMessagesResponse> {
  const conversationLimit = toNumber(params.conversationLimit, 24);
  const systemPage = Math.max(1, toNumber(params.systemPage, 1));
  const [conversationRows, systemRows, viewerRows] = await Promise.all([
    callLegacyAsk(
      {
        ask: 'msg',
        shrink: 'no',
        type: 'private',
      },
      signal,
    ),
    callLegacyAsk(
      {
        ask: 'msg',
        p: systemPage,
        type: 'system',
      },
      signal,
    ),
    callOptionalLegacyCurrentUser(signal),
  ]);
  const unreadTotal = toNumber(viewerRows[0]?.newmsg);
  const directConversations = conversationRows
    .filter(isLegacyDirectConversationRow)
    .slice(0, conversationLimit)
    .map(mapLegacyDirectConversationRow);
  const systemMessages = systemRows
    .filter(isLegacySystemMessageRow)
    .map(mapLegacySystemMessageRow);
  const directUnread = directConversations.reduce((total, conversation) => total + conversation.unread, 0);
  const systemUnreadCounts = countMessagesByCategory(systemMessages.filter((message) => message.unread));

  return {
    directConversations,
    hasMoreReplies: systemMessages.length >= SYSTEM_MESSAGE_PAGE_SIZE,
    messages: [
      ...systemMessages,
      ...directConversations.map(mapDirectConversationMessage),
    ],
    replyPage: systemPage,
    unreadCounts: normalizeLegacyMessageUnreadCounts({
      direct: directUnread,
      mentions: 0,
      replies: systemUnreadCounts.replies,
      total: unreadTotal || directUnread + systemUnreadCounts.replies,
    }),
  };
}

export async function fetchLegacyDirectConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<LegacyBbsDirectConversationResponse> {
  const user = getConversationUserFromId(conversationId);
  const chatRows = await callLegacyAsk(
    {
      ask: 'msg',
      shrink: 'no',
      to: user,
      type: 'chat',
    },
    signal,
  );
  const messages = chatRows
    .filter(isLegacyDirectChatRow)
    .map((row, index) => mapLegacyDirectChatRow(row, conversationId, index));
  const viewerRows = await callOptionalLegacyCurrentUser(signal);
  const unreadTotal = toNumber(viewerRows[0]?.newmsg);

  return {
    conversation: buildDirectConversationFromChat(user, messages),
    unreadCounts: normalizeLegacyMessageUnreadCounts({
      direct: 0,
      total: unreadTotal,
    }),
  };
}

export async function sendLegacyDirectMessage(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsDirectConversationResponse> {
  const conversationId = stringValue(params.conversationId);
  const to = stringValue(params.to || getConversationUserFromId(conversationId)).trim();
  const text = stringValue(params.text).trim();

  if (!to) {
    throw new Error('请选择私信对象。');
  }

  if (!text) {
    throw new Error('私信内容不能为空。');
  }

  await callLegacyAsk(
    {
      ask: 'sendmsg',
      text,
      to,
    },
    signal,
  );

  return fetchLegacyDirectConversation(getConversationIdFromUser(to), signal);
}

export async function markLegacyMessagesRead(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<{ unreadCounts: Record<MessageCategory | 'total', number> }> {
  const conversationId = stringValue(params.conversationId);
  if (conversationId) {
    const data = await fetchLegacyDirectConversation(conversationId, signal);

    return {
      unreadCounts: data.unreadCounts,
    };
  }

  if (params.category === 'direct') {
    const data = await fetchLegacyMessages(params, signal);
    await Promise.all(
      data.directConversations
        .filter((conversation) => conversation.unread > 0)
        .map((conversation) => fetchLegacyDirectConversation(conversation.id, signal)),
    );
    const viewerRows = await callOptionalLegacyCurrentUser(signal);

    return {
      unreadCounts: normalizeLegacyMessageUnreadCounts({
        direct: 0,
        total: toNumber(viewerRows[0]?.newmsg),
      }),
    };
  }

  return {
    unreadCounts: normalizeLegacyMessageUnreadCounts({}),
  };
}

function normalizeLegacyMessageUnreadCounts(value: unknown): Record<MessageCategory | 'total', number> {
  const counts = isRecord(value) ? value : {};

  return {
    direct: toNumber(counts.direct),
    mentions: toNumber(counts.mentions),
    replies: toNumber(counts.replies),
    total: toNumber(counts.total),
  };
}

function mapLegacyDirectConversationRow(row: LegacyRow): DirectConversation {
  const user = stringValue(row.username).trim();
  const timestamp = toNumber(row.time);
  const timeParts = formatLegacyMessageTime(timestamp);
  const unread = toNumber(row.number);
  const lastMessage = normalizeLegacyMessageText(row.text);

  return {
    id: getConversationIdFromUser(user),
    user,
    rating: '',
    status: toNumber(row.totalnum) > 0 ? `${toNumber(row.totalnum)} 条私信` : '私信',
    profileHref: getPublicProfilePath(user),
    lastMessage,
    lastTime: timeParts.date,
    unread,
    messages: [],
    messagesLoaded: false,
  };
}

function mapDirectConversationMessage(conversation: DirectConversation): ForumMessage {
  const title = conversation.user;

  return {
    id: `direct-${conversation.id}`,
    category: 'direct',
    sender: conversation.user,
    title,
    conversationId: conversation.id,
    excerpt: conversation.lastMessage || '打开对话查看私信记录',
    time: conversation.lastTime,
    group: conversation.lastTime ? '私信' : '更早',
    href: `#message-${conversation.id}`,
    unread: conversation.unread > 0,
  };
}

function mapLegacySystemMessageRow(row: LegacyRow, index: number): ForumMessage {
  const type = stringValue(row.type);
  const sender = stringValue(row.username).trim() || 'system';
  const title = normalizeLegacyMessageText(row.title);
  const timeParts = formatLegacyMessageTime(toNumber(row.time));
  const actionText = getLegacySystemMessageAction(type);

  return {
    id: `system-${type || 'message'}-${toNumber(row.time) || index}-${index}`,
    category: 'replies',
    sender,
    title: actionText,
    context: title,
    excerpt: getLegacySystemMessageExcerpt(type, sender, title),
    time: timeParts.time,
    group: timeParts.date || '更早',
    href: getLegacySystemMessageHref(row),
    unread: stringValue(row.hasread) === '0',
  };
}

function mapLegacyDirectChatRow(row: LegacyRow, conversationId: string, index: number): DirectChatMessage {
  const timestamp = toNumber(row.time);
  const timeParts = formatLegacyMessageTime(timestamp);

  return {
    id: `${conversationId}-${timestamp || 'message'}-${index}`,
    author: stringValue(row.type) === 'send' ? 'me' : 'them',
    date: timeParts.date,
    text: normalizeLegacyMessageText(row.text),
    time: timeParts.time,
  };
}

function buildDirectConversationFromChat(user: string, messages: DirectChatMessage[]): DirectConversation {
  const lastMessage = messages[messages.length - 1] ?? null;

  return {
    id: getConversationIdFromUser(user),
    user,
    rating: '',
    status: messages.length > 0 ? `${messages.length} 条私信` : '新建私信',
    profileHref: getPublicProfilePath(user),
    lastMessage: lastMessage?.text ?? '',
    lastTime: lastMessage?.date ?? '',
    unread: 0,
    messages,
    messagesLoaded: true,
  };
}

function getConversationIdFromUser(user: string) {
  return encodeURIComponent(user.trim());
}

function getConversationUserFromId(conversationId: string) {
  const value = conversationId.trim();

  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLegacyDirectConversationRow(row: LegacyRow) {
  return stringValue(row.username).trim() !== '';
}

function isLegacyDirectChatRow(row: LegacyRow) {
  return stringValue(row.type).trim() !== '' && Object.prototype.hasOwnProperty.call(row, 'text');
}

function isLegacySystemMessageRow(row: LegacyRow) {
  return (
    stringValue(row.type).trim() !== '' &&
    stringValue(row.username).trim() !== '' &&
    stringValue(row.time).trim() !== ''
  );
}

function normalizeLegacyMessageText(value: unknown) {
  return decodeLegacyHtmlEntities(stringValue(value)).trim();
}

function countMessagesByCategory(messages: ForumMessage[]) {
  return messages.reduce<Record<MessageCategory, number>>(
    (counts, message) => ({
      ...counts,
      [message.category]: counts[message.category] + 1,
    }),
    { direct: 0, mentions: 0, replies: 0 },
  );
}

function getLegacySystemMessageAction(type: string) {
  switch (type) {
    case 'at':
      return '回复了你的帖子';
    case 'quote':
      return '引用了你的文章';
    case 'replylzl':
      return '评论了你的回复';
    case 'replylzlreply':
      return '评论了你的楼中楼';
    case 'reply':
      return '回复了你的帖子';
    default:
      return '发来系统消息';
  }
}

function getLegacySystemMessageExcerpt(type: string, sender: string, title: string) {
  const context = title ? `：${title}` : '';

  switch (type) {
    case 'at':
      return `${sender} 回复了你的帖子${context}`;
    case 'quote':
      return `${sender} 在帖子中引用了你的文章${context}`;
    case 'replylzl':
      return `${sender} 评论了你在帖子中的回复${context}`;
    case 'replylzlreply':
      return `${sender} 评论了你的楼中楼${context}`;
    case 'reply':
      return `${sender} 回复了你的帖子${context}`;
    default:
      return title || `${sender} 发来系统消息`;
  }
}

function getLegacySystemMessageHref(row: LegacyRow) {
  const legacyUrl = stringValue(row.url);

  try {
    const url = new URL(legacyUrl.replace(/&amp;/gi, '&'), 'https://capubbs.local/');
    const bid = toNumber(url.searchParams.get('bid'));
    const tid = toNumber(url.searchParams.get('tid'));
    const floor = toNumber(url.hash.replace(/^#/, ''));

    if (bid > 0 && tid > 0) {
      const threadId = `${bid}-${tid}`;

      return floor > 0 ? getThreadFloorPath(threadId, floor) : getThreadPath(threadId);
    }
  } catch {
    // Keep the legacy URL if it cannot be parsed.
  }

  return legacyUrl || '#';
}

function formatLegacyMessageTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return {
      date: '',
      time: '',
    };
  }

  const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
  const year = date.getFullYear();
  const dateLabel = `${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  const displayDate = year === new Date().getFullYear() ? dateLabel : `${year}-${dateLabel}`;
  const timeLabel = `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;

  return {
    date: displayDate,
    time: timeLabel,
  };
}
