import type { DirectConversation, ForumMessage, MessageCategory } from '../../types/forum';

export type LegacyBbsBoardSummary = {
  bid: number;
  name: string;
  title: string;
  hidden: boolean;
  moderators: string[];
  requiredStar: number;
  stats?: {
    digests?: number;
    maxTid?: number;
    topics?: number;
    todayTopics?: number;
    todayReplies?: number;
  };
};

export type LegacyBbsThreadBoard = {
  bid: number;
  name: string;
  title: string;
};

export type LegacyBbsThreadItem = {
  id: string;
  bid: number;
  tid: number;
  title: string;
  author: string;
  authorStar: number;
  replyer: string;
  replyerStar: number;
  views: number;
  favorites: number;
  replies: number;
  digest: boolean;
  pinned: boolean;
  locked: boolean;
  globalPinned: boolean;
  isActivity: boolean;
  activityId: number | null;
  updatedAt: string | null;
  postDate: string;
  board: LegacyBbsThreadBoard;
};

export type LegacyBbsActivityBanner = {
  activityId: number;
  bid: number;
  tid: number;
  title: string;
  leader: string;
  joined: number;
  coverImage: string | null;
  opensAt: string | number | null;
  closesAt: string | number | null;
  isOpen: boolean;
  board: LegacyBbsThreadBoard;
};

export type LegacyBbsCalendarEvent = {
  year: number;
  month: number;
  day: number;
  time: string;
  title: string;
  content: string;
};

export type LegacyBbsViewer = {
  username: string;
  id: number | null;
  rights: number;
  star: number;
  score: number;
  avatar: string;
  intro: string;
  registeredAt: string;
  lastSeenAt: string;
  unreadMessages: number;
  stats: {
    posts: number;
    replies: number;
    water: number;
    checkins: number;
  };
} | null;

export type LegacyBbsBootstrapResponse = {
  viewer: LegacyBbsViewer;
  boards: LegacyBbsBoardSummary[];
  home: {
    hotThreads: LegacyBbsThreadItem[];
    latestTopics: LegacyBbsThreadItem[];
    latestReplies: LegacyBbsThreadItem[];
    activityBanners: LegacyBbsActivityBanner[];
    globalPinnedThreads: LegacyBbsThreadItem[];
    calendarEvents: LegacyBbsCalendarEvent[];
  };
  unread: {
    total?: number;
    system?: number;
    private?: number;
  };
};

export type LegacyBbsSessionViewerResponse = Pick<LegacyBbsBootstrapResponse, 'viewer' | 'unread'>;

export type LegacyBbsHomeFeedName = 'hot' | 'latest-replies' | 'latest-topics';

export type LegacyBbsHomeFeedResponse = {
  feed: LegacyBbsHomeFeedName;
  items: LegacyBbsThreadItem[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  total: number;
};

export type LegacyBbsHomeFeedsResponse = {
  hotThreads: LegacyBbsHomeFeedResponse;
  latestReplies: LegacyBbsHomeFeedResponse;
  latestTopics: LegacyBbsHomeFeedResponse;
};

export type LegacyBbsSearchType = 'post' | 'thread';

export type LegacyBbsSearchItem = {
  author: string;
  bid: number;
  board: LegacyBbsThreadBoard;
  digest: boolean;
  excerpt: string;
  favorites: number;
  globalPinned: boolean;
  isActivity: boolean;
  keyword: string;
  matchType: LegacyBbsSearchType;
  pid: number;
  pinned: boolean;
  postDate: string;
  replies: number;
  tid: number;
  title: string;
  updatedAt: string;
  views: number;
};

export type LegacyBbsSearchResponse = {
  items: LegacyBbsSearchItem[];
  keyword: string;
  total: number;
  type: LegacyBbsSearchType;
};

export type LegacyBbsMessagesResponse = {
  directConversations: DirectConversation[];
  hasMoreReplies: boolean;
  messages: ForumMessage[];
  replyPage: number;
  unreadCounts: Record<MessageCategory | 'total', number>;
};

export type LegacyBbsDirectConversationResponse = {
  conversation: DirectConversation;
  unreadCounts: Record<MessageCategory | 'total', number>;
};

export type LegacyBbsBoardThreadsResponse = {
  board: LegacyBbsBoardSummary;
  cursor: number;
  items: LegacyBbsThreadItem[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  total: number;
};

export type LegacyBbsBoardViewerState = {
  canGlobalPin: boolean;
  canModerate: boolean;
  canPost: boolean;
  rightsCode: number;
  username: string;
};

export type LegacyBbsBoardDetailResponse = LegacyBbsBoardThreadsResponse & {
  viewerState: LegacyBbsBoardViewerState;
};

export type LegacyBbsAttachment = {
  id: number;
  name: string;
  path: string;
  size: number;
  price: number;
  auth: number;
};

export type LegacyBbsNestedReply = {
  id: number;
  fid: number;
  author: string;
  content: string;
  createdAt: string | null;
};

export type LegacyBbsThreadAuthorProfile = {
  signatures?: Record<string, unknown> | unknown[] | null;
  star?: unknown;
};

export type LegacyBbsFloor = {
  bid: number;
  tid: number;
  pid: number;
  fid: number;
  title: string;
  author: string;
  authorAvatar?: string;
  authorProfile?: LegacyBbsThreadAuthorProfile | null;
  authorStar: number;
  contentHtml: string;
  rawText?: string;
  isHtml: string;
  createdAt: string | null;
  updatedAt: string | null;
  signatureEnabled: boolean;
  signatureHtml: string;
  signatureIndex: number;
  nestedReplyCount: number;
  nestedReplies: LegacyBbsNestedReply[];
  attachments: LegacyBbsAttachment[];
};

export type LegacyBbsActivityDetail = {
  activity_id: number;
  season_id: number;
  name: string;
  leader_username: string;
  options?: Array<{
    cases?: Array<{
      case_id: string | number;
      case_name: string;
      comment?: string;
      need_value?: string | number;
    }>;
    comment?: string;
    hiden?: string | number;
    option_id: string | number;
    option_name: string;
    required: string | number;
    type_id: string | number;
  }>;
} | null;

export type LegacyBbsThreadViewerState = {
  canReply: boolean;
  canEdit: boolean;
  canGlobalPin: boolean;
  canManageActivitySignup?: boolean;
  canModerate: boolean;
  bookmarked: boolean;
  username?: string;
};

export type LegacyBbsThreadInteractionStateResponse = {
  bid: number;
  bookmarks: number;
  tid: number;
  viewerState: LegacyBbsThreadViewerState;
};

export type LegacyBbsThreadResponse = {
  thread: LegacyBbsThreadItem;
  mainPost: LegacyBbsFloor;
  floorsPage: LegacyBbsThreadFloorsResponse;
  activity: LegacyBbsActivityDetail;
  viewerState: LegacyBbsThreadViewerState;
};

export type LegacyBbsThreadFloorPreviewResponse = {
  bid: number;
  floor: LegacyBbsFloor;
  threadTitle: string;
  tid: number;
};

export type LegacyBbsThreadFloorsResponse = {
  items: LegacyBbsFloor[];
  nextCursor: string | null;
  hasMore: boolean;
  page: number;
  pages: number;
  pageSize: number;
  total: number;
  authorOnly?: boolean;
};

export type LegacyBbsWritePostResponse = {
  bid: number;
  floor?: LegacyBbsFloor;
  href: string;
  pid: number;
  threadId: string;
  tid: number;
};

export type LegacyBbsActivitySignupAction = 'cancel' | 'join' | 'modify' | 'restore';

export type LegacyBbsActivitySignupResponse = LegacyBbsWritePostResponse & {
  action: LegacyBbsActivitySignupAction;
  activityId: number;
  canceled: boolean;
  fid: number;
};

export type LegacyBbsBookmarkState = {
  bookmarked: boolean;
  bookmarks: number;
};

export type LegacyBbsThreadModerationAction = 'digest' | 'globalPinned' | 'locked' | 'pinned';

export type LegacyBbsThreadModerationResponse = {
  bid: number;
  deleted?: boolean;
  digest?: boolean;
  floorDeleted?: boolean;
  globalPinned?: boolean;
  locked?: boolean;
  nestedReplyDeleted?: boolean;
  pid?: number;
  tid: number;
  top?: boolean;
};

export type LegacyBbsThreadMoveResponse = {
  bid: number;
  fromBid: number;
  fromTid: number;
  tid: number;
};

export type LegacyBbsUnifiedThreadAction = 'extr' | 'global_top_action' | 'lock' | 'top';

export type LegacyBbsAuthResponse = {
  token: string;
  viewer: LegacyBbsViewer;
};

export type LegacyBbsRegisterDraft = {
  captcha: string;
  hobby?: string;
  icon?: string;
  intro?: string;
  mail?: string;
  passwordHash: string;
  place?: string;
  qq?: string;
  sex?: string;
  sig1?: string;
  sig2?: string;
  sig3?: string;
  username: string;
};

export type LegacyBbsUserCenterProfileDetails = {
  email: string;
  hobby: string;
  location: string;
  qq: string;
};

export type LegacyBbsUserCenterProfileStats = {
  activities: number | null;
  bookmarks: number | null;
  checkins: number;
  digests: number | null;
  posts: number;
  replies: number;
  water: number;
};

export type LegacyBbsUserCenterProfile = {
  avatar: string;
  details: LegacyBbsUserCenterProfileDetails;
  intro: string;
  lastSeenAt: string;
  rights: number;
  registeredAt: string;
  signatures: [string, string, string];
  star: number;
  stats: LegacyBbsUserCenterProfileStats;
  username: string;
};

export type LegacyBbsUserCenterRecord = {
  author: string;
  bid: number;
  board: LegacyBbsThreadBoard;
  content?: string;
  deleted?: boolean;
  excerpt: string;
  favorites: number | null;
  href: string;
  pid: number | null;
  replies: number | null;
  signatureIndex?: number;
  status?: string;
  tid: number;
  time: string;
  title: string;
  views: number | null;
};

export type LegacyBbsUserCenterResponse = {
  profile: LegacyBbsUserCenterProfile;
  records: {
    activities: LegacyBbsUserCenterRecord[];
    bookmarks: LegacyBbsUserCenterRecord[];
    posts: LegacyBbsUserCenterRecord[];
    replies: LegacyBbsUserCenterRecord[];
    signatures: LegacyBbsUserCenterRecord[];
  };
  viewer: LegacyBbsViewer;
};

export type LegacyBbsPublicProfileResponse = {
  isOwnProfile: boolean;
  profile: LegacyBbsUserCenterProfile;
  records: {
    activities: LegacyBbsUserCenterRecord[];
    bookmarks: LegacyBbsUserCenterRecord[];
    posts: LegacyBbsUserCenterRecord[];
    replies: LegacyBbsUserCenterRecord[];
  };
};

export type LegacyBbsUserCenterProfileUpdateDraft = {
  avatar?: string;
  details?: Partial<LegacyBbsUserCenterProfileDetails>;
};

export type LegacyBbsUserCenterSignaturesUpdateDraft = {
  signatures: string[];
};

export type LegacyBbsPasswordUpdateDraft = {
  newPasswordHash: string;
  oldPasswordHash: string;
};

export type LegacyBbsPasswordUpdateResponse = {
  message: string;
  token: string;
};

export type LegacyParamValue = string | number | boolean | null | undefined;
export type LegacyRequestParams = Record<string, LegacyParamValue>;
export type LegacyRequestBody = Record<string, unknown>;
export type LegacyRow = Record<string, unknown>;

export type LegacyJsonEnvelope = {
  code: number;
  count?: number;
  data?: LegacyRow | LegacyRow[];
  msg?: string;
  message?: string;
};

export type LegacyRequestOptions = {
  body?: LegacyRequestBody;
  method: string;
  params?: LegacyRequestParams;
  signal?: AbortSignal;
};

export type LegacyBbsHomeFeedBundle = {
  hotThreads: LegacyBbsThreadItem[];
  latestReplies: LegacyBbsThreadItem[];
  latestTopics: LegacyBbsThreadItem[];
};
