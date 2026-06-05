export type FeedTab = 'hot' | 'replies' | 'topics';
export type MessageCategory = 'replies' | 'mentions' | 'direct';
export type BoardSort = 'lastReply' | 'latest';

export type ActivityBanner = {
  title: string;
  board: string;
  deadline: string;
  joined: number;
  href: string;
  coverImage?: string;
};

export type HotThread = {
  title: string;
  board: string;
  author: string;
  authorRating?: string;
  lastReplyBy: string;
  lastReplyAt: string;
  time: string;
  replies: number;
  views: number;
  bookmarks: number;
  href: string;
  boardHref: string;
  authorHref: string;
};

export type ReplyItem = {
  id: string;
  rating: string;
  board: string;
  topic: string;
  time: string;
  href: string;
  boardHref: string;
  authorHref: string;
};

export type TopicItem = {
  id: string;
  rating: string;
  board: string;
  topic: string;
  time: string;
  bookmarks: number;
  href: string;
  boardHref: string;
  authorHref: string;
};

export type BoardThreadKind = 'discussion' | 'activity' | 'digest';

export type BoardThread = {
  id: string;
  title: string;
  kind: BoardThreadKind;
  author: string;
  authorHref: string;
  createdAt: string;
  lastReplyBy: string;
  lastReplyAt: string;
  replies: number;
  views: number;
  href: string;
  pinned?: boolean;
  globalPinned?: boolean;
  digest?: boolean;
  locked?: boolean;
  openForSignup?: boolean;
};

export type ThreadAuthor = {
  id: string;
  name: string;
  href: string;
  rating: string;
  avatarSrc?: string;
  role?: string;
  starLevel?: number;
};

export type ThreadAttachment = {
  name: string;
  meta: string;
  href: string;
};

export type ThreadNestedReply = {
  id: string;
  fid?: number;
  author: string;
  authorHref: string;
  target?: string;
  targetHref?: string;
  content: string;
  time: string;
};

export type ThreadFloor = {
  id: string;
  floor: number;
  fid?: number;
  author: ThreadAuthor;
  time: string;
  editedAt?: string;
  content: string[];
  htmlContent?: string;
  signatureHtml?: string;
  signatureIndex?: number;
  attachments?: ThreadAttachment[];
  nestedReplies?: ThreadNestedReply[];
  signature?: string[];
};

export type ThreadPagination = {
  authorOnly?: boolean;
  currentPage: number;
  pageSize: number;
  totalFloors: number;
  totalPages: number;
};

export type ThreadActivitySignupQuestionType = 'choice' | 'multiChoice' | 'text';

export type ThreadActivitySignupQuestionOption = {
  id: string;
  label: string;
};

export type ThreadActivitySignupQuestion = {
  id: string;
  label: string;
  options?: ThreadActivitySignupQuestionOption[];
  required: boolean;
  type: ThreadActivitySignupQuestionType;
};

export type ThreadDetail = {
  id: string;
  title: string;
  board: string;
  boardHref: string;
  kind: BoardThreadKind;
  author: ThreadAuthor;
  createdAt: string;
  replies: number;
  views: number;
  bookmarked?: boolean;
  bookmarks: number;
  pinned?: boolean;
  globalPinned?: boolean;
  digest?: boolean;
  locked?: boolean;
  canReply?: boolean;
  canManageActivitySignup?: boolean;
  canModerate?: boolean;
  canGlobalPin?: boolean;
  signupQuestions?: ThreadActivitySignupQuestion[];
  mainPost: ThreadFloor;
  floors: ThreadFloor[];
  pagination?: ThreadPagination;
};

export type BoardDetail = {
  name: string;
  description: string;
  moderators: string[];
  requiredStar?: number;
  topics: number;
  replies: number;
  today: number;
  online: number;
  postHref: string;
  coverImage?: string;
  threads: BoardThread[];
  threadCursor?: number;
  threadHasMore?: boolean;
  threadPageSize?: number;
  threadTotal?: number;
};

export type CalendarEvent = {
  date: string;
  title: string;
  time: string;
  place: string;
};

export type ForumMessage = {
  id: string;
  category: MessageCategory;
  sender: string;
  title: string;
  conversationId?: string;
  context?: string;
  excerpt: string;
  time: string;
  group: string;
  href: string;
  replyHref?: string;
  unread: boolean;
};

export type DirectChatMessage = {
  id: string;
  author: 'me' | 'them';
  text: string;
  time: string;
  date: string;
};

export type DirectConversation = {
  id: string;
  user: string;
  rating: string;
  status: string;
  profileHref: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: DirectChatMessage[];
  messagesLoaded?: boolean;
};
