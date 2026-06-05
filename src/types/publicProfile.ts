import type { UserRecord } from './userCenter';

export type PublicProfile = {
  avatarSrc?: string;
  slug: string;
  id: string;
  intro: string;
  rating: string;
  registeredAt: string;
  lastSeen: string;
  details: Array<{ label: string; value: string }>;
  stats: Array<{ label: string; value: string | number }>;
  posts: UserRecord[];
  replies: UserRecord[];
  activities: UserRecord[];
  bookmarks: UserRecord[];
};
