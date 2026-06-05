export type UserCenterTab = 'posts' | 'replies' | 'activities' | 'bookmarks' | 'drafts' | 'signatures';
export type UserRecordVariant = 'post' | 'reply' | 'favorite' | 'activity' | 'draft' | 'signature';
export type ProfileFieldKey = 'hobby' | 'intro' | 'qq' | 'email' | 'location';
export type EditTarget = { type: 'profile' } | { type: 'signature'; href: string } | null;

export type UserRecord = {
  title: string;
  board: string;
  content?: string;
  excerpt: string;
  time: string;
  replies?: number;
  views?: number;
  bookmarks?: number;
  status?: string;
  author?: string;
  authorHref?: string;
  draftId?: string;
  draftBoard?: string;
  draftType?: 'reply' | 'thread';
  href: string;
  sourceHref?: string;
  boardHref: string;
  date: string;
};

export type ProfileField = {
  key: ProfileFieldKey;
  label: string;
  value: string;
};

export type SignatureDraftContentMode = 'rich' | 'markdown' | 'html';

export type SignatureDraft = {
  content: string;
  contentMode: SignatureDraftContentMode;
  sourceHref: string;
};

export type UserCenterFilterResult = {
  records: UserRecord[];
  matchedCount: number;
  limitedCount: number;
  currentPage: number;
  totalPages: number;
};

export type UserCenterRecords = Record<UserCenterTab, UserRecord[]>;

export type UserCenterProfileStat = {
  label: string;
  value: string | number;
};

export type UserCenterData = {
  avatarSrc: string;
  details: ProfileField[];
  intro: string;
  rating: string;
  records: UserCenterRecords;
  registeredAt: string;
  stats: UserCenterProfileStat[];
  userId: string;
};
