import type { BoardDetail, BoardSort, ForumMessage, MessageCategory, ThreadDetail } from '../../types/forum';
import type { PublicProfile } from '../../types/publicProfile';
import type { SearchResult } from '../../types/search';
import type { UserCenterData } from '../../types/userCenter';
import type {
  LegacyBbsAuthResponse,
  LegacyBbsBoardSummary,
  LegacyBbsMessagesResponse,
  LegacyBbsRegisterDraft,
  LegacyBbsViewer,
} from '../legacyBbsClient';
import type { LegacyBbsHomeData, LegacyBbsHomeFeedsData, LegacyBbsThreadPreview } from '../legacyBbsAdapters';

export type LegacyBbsStatus = 'idle' | 'loading' | 'ready' | 'error';
export type LegacyBbsThreadType = 'all' | 'activity' | 'digest';

export type LegacyBbsContextValue = {
  allBoards: string[];
  error: string | null;
  ensureBootstrap: () => void;
  getBoardSummary: (boardName: string | null) => LegacyBbsBoardSummary | null;
  getThreadPreview: (threadId: string | null) => LegacyBbsThreadPreview | null;
  hasBootstrap: boolean;
  home: LegacyBbsHomeData | null;
  isSessionRestoring: boolean;
  login: (username: string, passwordHash: string) => Promise<LegacyBbsAuthResponse>;
  logout: () => Promise<void>;
  moreBoards: string[];
  primaryBoards: string[];
  randomThreadBoards: LegacyBbsBoardSummary[];
  randomThreadIds: string[];
  register: (draft: LegacyBbsRegisterDraft) => Promise<LegacyBbsAuthResponse>;
  reloadBootstrap: () => void;
  resolveBoardId: (boardName: string | null) => number | null;
  resolveBoardNameById: (bid: number | null) => string | null;
  status: LegacyBbsStatus;
  syncViewer: (viewer: LegacyBbsViewer) => void;
  warmCollapsedBoards: () => void;
  warmPrimaryBoards: () => void;
  viewer: LegacyBbsViewer;
};

export type LegacyBbsBoardDetailState = {
  board: BoardDetail | null;
  canGlobalPin: boolean;
  canModerate: boolean;
  canPost: boolean;
  error: string | null;
  isResolvingBoard: boolean;
  status: LegacyBbsStatus;
};

export type LegacyBbsThreadDetailState = {
  error: string | null;
  isLegacyThreadId: boolean;
  status: LegacyBbsStatus;
  thread: ThreadDetail | null;
};

export type LegacyBbsHomeFeedsState = {
  data: LegacyBbsHomeFeedsData | null;
  error: string | null;
  reload?: () => void;
  status: LegacyBbsStatus;
};

export type LegacyBbsSearchState = {
  data: SearchResult[];
  error: string | null;
  isResolvingBoard: boolean;
  status: LegacyBbsStatus;
};

export type LegacyBbsMessagesState = {
  data: LegacyBbsMessagesResponse;
  error: string | null;
  isLoadingMoreReplies: boolean;
  loadConversation: (conversationId: string) => Promise<void>;
  loadMoreReplies: () => Promise<void>;
  markCategoryRead: (category: MessageCategory) => void;
  markConversationRead: (conversationId: string) => void;
  markMessageRead: (messageId: string) => void;
  reload: () => void;
  sendDirectMessage: (conversationId: string, text: string) => Promise<void>;
  status: LegacyBbsStatus;
};

export type LegacyBbsUserCenterState = {
  data: UserCenterData | null;
  error: string | null;
  reload: () => void;
  status: LegacyBbsStatus;
};

export type LegacyBbsPublicProfileState = {
  data: PublicProfile | null;
  error: string | null;
  status: LegacyBbsStatus;
};

export const LEGACY_THREAD_CONTENT_PAGE_SIZE = 12;
export const SIDEBAR_PRIMARY_BOARD_COUNT = 9;
export const BOARD_DETAIL_THREAD_WINDOW_SIZE = 10;

export const EMPTY_MESSAGES_RESPONSE: LegacyBbsMessagesResponse = {
  directConversations: [],
  hasMoreReplies: false,
  messages: [],
  replyPage: 0,
  unreadCounts: {
    direct: 0,
    mentions: 0,
    replies: 0,
    total: 0,
  },
};

export type LegacyBbsMessagePredicate = (message: ForumMessage) => boolean;
