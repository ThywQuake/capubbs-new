import type { BoardThreadKind } from './forum';

export type SearchResult = {
  author: string;
  board: string;
  bodySearchText: string;
  bookmarks: number;
  digest?: boolean;
  excerpt: string;
  floor?: number;
  hasStats?: boolean;
  href: string;
  id: string;
  kind: BoardThreadKind;
  matchType?: 'post' | 'thread';
  meta: string[];
  pinned?: boolean;
  popularity: number;
  replies: number;
  sortTime: string;
  time: string;
  title: string;
  titleSearchText: string;
  views: number;
};
