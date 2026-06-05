import { useEffect, useState } from 'react';
import { useLegacyBbsMessages } from '../api/LegacyBbsDataContext';
import type { OpenDirectConversationRequest } from '../types/messages';

type UseAppMessagesResult = {
  openDirectConversationFromProfile: (userId: string) => void;
  openMessagesFromPage: () => void;
  topBarMessageProps: {
    directConversations: ReturnType<typeof useLegacyBbsMessages>['data']['directConversations'];
    hasMoreReplies: boolean;
    isMessagesLoading: boolean;
    isLoadingMoreReplies: boolean;
    messages: ReturnType<typeof useLegacyBbsMessages>['data']['messages'];
    openDirectConversationRequest: OpenDirectConversationRequest | null;
    openMessagesRequest: number;
    onLoadMessageConversation: ReturnType<typeof useLegacyBbsMessages>['loadConversation'];
    onLoadMoreReplies: ReturnType<typeof useLegacyBbsMessages>['loadMoreReplies'];
    onMarkMessageCategoryRead: ReturnType<typeof useLegacyBbsMessages>['markCategoryRead'];
    onMarkMessageConversationRead: ReturnType<typeof useLegacyBbsMessages>['markConversationRead'];
    onMarkMessageRead: ReturnType<typeof useLegacyBbsMessages>['markMessageRead'];
    onRequestMessages: () => void;
    onSendDirectMessage: ReturnType<typeof useLegacyBbsMessages>['sendDirectMessage'];
    unreadMessageCount: number;
  };
};

export function useAppMessages(isGuest: boolean, initialUnreadMessageCount = 0): UseAppMessagesResult {
  const [shouldLoadMessages, setShouldLoadMessages] = useState(false);
  const remoteMessages = useLegacyBbsMessages(!isGuest && shouldLoadMessages);
  const [openDirectConversationRequest, setOpenDirectConversationRequest] =
    useState<OpenDirectConversationRequest | null>(null);
  const [openMessagesRequest, setOpenMessagesRequest] = useState(0);
  const messages = remoteMessages.status === 'ready' ? remoteMessages.data.messages : [];
  const directConversations = remoteMessages.status === 'ready' ? remoteMessages.data.directConversations : [];
  const hasMoreReplies = remoteMessages.status === 'ready' && remoteMessages.data.hasMoreReplies;
  const isMessagesLoading =
    shouldLoadMessages && remoteMessages.status !== 'ready' && remoteMessages.status !== 'error';
  const unreadMessageCount =
    remoteMessages.status === 'ready'
      ? remoteMessages.data.unreadCounts.total
      : initialUnreadMessageCount;
  const requestMessages = () => {
    if (!isGuest) {
      setShouldLoadMessages(true);
    }
  };

  useEffect(() => {
    if (isGuest) {
      setShouldLoadMessages(false);
    }
  }, [isGuest]);

  const openMessagesFromPage = () => {
    if (isGuest) {
      return;
    }

    requestMessages();
    setOpenMessagesRequest((value) => value + 1);
  };

  const openDirectConversationFromProfile = (userId: string) => {
    const user = userId.trim();

    if (isGuest || !user) {
      return;
    }

    requestMessages();
    setOpenDirectConversationRequest((current) => ({
      id: encodeURIComponent(user),
      requestKey: (current?.requestKey ?? 0) + 1,
      user,
    }));
  };

  return {
    openDirectConversationFromProfile,
    openMessagesFromPage,
    topBarMessageProps: {
      directConversations,
      hasMoreReplies,
      isMessagesLoading,
      isLoadingMoreReplies: remoteMessages.isLoadingMoreReplies,
      messages,
      openDirectConversationRequest,
      openMessagesRequest,
      onLoadMessageConversation: remoteMessages.loadConversation,
      onLoadMoreReplies: remoteMessages.loadMoreReplies,
      onMarkMessageCategoryRead: remoteMessages.markCategoryRead,
      onMarkMessageConversationRead: remoteMessages.markConversationRead,
      onMarkMessageRead: remoteMessages.markMessageRead,
      onRequestMessages: requestMessages,
      onSendDirectMessage: remoteMessages.sendDirectMessage,
      unreadMessageCount,
    },
  };
}
