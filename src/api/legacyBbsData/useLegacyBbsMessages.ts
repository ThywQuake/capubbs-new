import { useCallback, useEffect, useState } from 'react';
import type { MessageCategory } from '../../types/forum';
import {
  legacyBbsGet,
  legacyBbsPost,
  type LegacyBbsDirectConversationResponse,
  type LegacyBbsMessagesResponse,
} from '../legacyBbsClient';
import {
  appendReplyMessagesState,
  markDirectConversationStateRead,
  markMessagesStateRead,
  mergeDirectConversationState,
} from './messageState';
import { getErrorMessage, isAbortError } from './requestState';
import { EMPTY_MESSAGES_RESPONSE, type LegacyBbsMessagesState } from './types';

export function useLegacyBbsMessages(enabled: boolean): LegacyBbsMessagesState {
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);
  const [state, setState] = useState<Omit<
    LegacyBbsMessagesState,
    | 'loadConversation'
    | 'loadMoreReplies'
    | 'markCategoryRead'
    | 'markConversationRead'
    | 'markMessageRead'
    | 'reload'
    | 'sendDirectMessage'
  >>({
    data: EMPTY_MESSAGES_RESPONSE,
    error: null,
    isLoadingMoreReplies: false,
    status: 'idle',
  });
  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    if (!enabled) {
      setState({
        data: EMPTY_MESSAGES_RESPONSE,
        error: null,
        isLoadingMoreReplies: false,
        status: 'idle',
      });
      return;
    }

    const controller = new AbortController();

    setState((current) => ({
      ...current,
      error: null,
      status: current.data.messages.length > 0 || current.data.directConversations.length > 0 ? 'ready' : 'loading',
    }));
    legacyBbsGet<LegacyBbsMessagesResponse>(
      '/messages',
      {
        chatLimit: 80,
        conversationLimit: 24,
        limit: 160,
      },
      controller.signal,
    )
      .then((data) => {
        setState({
          data,
          error: null,
          isLoadingMoreReplies: false,
          status: 'ready',
        });
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return;
        }

        setState({
          data: EMPTY_MESSAGES_RESPONSE,
          error: getErrorMessage(requestError),
          isLoadingMoreReplies: false,
          status: 'error',
        });
      });

    return () => controller.abort();
  }, [enabled, reloadToken]);

  const loadMoreReplies = useCallback(
    async () => {
      if (!enabled || isLoadingMoreReplies || !state.data.hasMoreReplies) {
        return;
      }

      setIsLoadingMoreReplies(true);
      setState((current) => ({
        ...current,
        isLoadingMoreReplies: true,
      }));

      try {
        const data = await legacyBbsGet<LegacyBbsMessagesResponse>('/messages', {
          conversationLimit: 24,
          systemPage: state.data.replyPage + 1,
        });

        setState((current) => ({
          ...current,
          data: appendReplyMessagesState(current.data, data),
          isLoadingMoreReplies: false,
        }));
      } catch (requestError) {
        setState((current) => ({
          ...current,
          error: getErrorMessage(requestError),
          isLoadingMoreReplies: false,
        }));
      } finally {
        setIsLoadingMoreReplies(false);
        setState((current) => ({
          ...current,
          isLoadingMoreReplies: false,
        }));
      }
    },
    [enabled, isLoadingMoreReplies, state.data.hasMoreReplies, state.data.replyPage],
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!enabled) {
        return;
      }

      const data = await legacyBbsGet<LegacyBbsDirectConversationResponse>(
        `/messages/conversations/${encodeURIComponent(conversationId)}`,
      );

      setState((current) => ({
        ...current,
        data: mergeDirectConversationState(current.data, data.conversation, data.unreadCounts),
      }));
    },
    [enabled],
  );

  const sendDirectMessage = useCallback(
    async (conversationId: string, text: string) => {
      if (!enabled) {
        return;
      }

      const data = await legacyBbsPost<LegacyBbsDirectConversationResponse>('/messages/send', {
        conversationId,
        text,
      });

      setState((current) => ({
        ...current,
        data: mergeDirectConversationState(current.data, data.conversation, data.unreadCounts),
      }));
    },
    [enabled],
  );

  const markMessageRead = useCallback(
    (messageId: string) => {
      if (!enabled) {
        return;
      }

      setState((current) => ({
        ...current,
        data: markMessagesStateRead(current.data, (message) => message.id === messageId),
      }));
      void legacyBbsPost('/messages/mark-read', { messageId }).catch(() => reload());
    },
    [enabled, reload],
  );

  const markCategoryRead = useCallback(
    (category: MessageCategory) => {
      if (!enabled) {
        return;
      }

      setState((current) => ({
        ...current,
        data: markMessagesStateRead(current.data, (message) => message.category === category),
      }));
      void legacyBbsPost<{ unreadCounts: LegacyBbsMessagesResponse['unreadCounts'] }>('/messages/mark-read', { category })
        .then((data) => {
          setState((current) => ({
            ...current,
            data: {
              ...current.data,
              unreadCounts: data.unreadCounts,
            },
          }));
        })
        .catch(() => reload());
    },
    [enabled, reload],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!enabled) {
        return;
      }

      setState((current) => ({
        ...current,
        data: markDirectConversationStateRead(current.data, conversationId),
      }));
    },
    [enabled],
  );

  return {
    ...state,
    loadConversation,
    loadMoreReplies,
    markCategoryRead,
    markConversationRead,
    markMessageRead,
    reload,
    sendDirectMessage,
  };
}
