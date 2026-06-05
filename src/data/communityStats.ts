import { getPublicProfilePath } from '../utils/userRoutes';

export type CommunityMetric = {
  id: string;
  label: string;
  value: string;
};

export type OnlineUserRecord = {
  id: string;
  href: string;
  location: string;
  rating: string;
  recentActiveAt: string;
};

export type CheckinRecord = {
  checkedAt: string;
  href: string;
  id: string;
  rating: string;
  streakDays: number;
};

export const communityStatsUpdatedAt = '2026-05-24T20:18:00+08:00';

export const communityMetrics: CommunityMetric[] = [
  { id: 'online', label: '当前在线', value: '128 人' },
  { id: 'checkins', label: '今日签到', value: '42 人' },
  { id: 'topics', label: '今日发帖', value: '18 篇' },
  { id: 'replies', label: '今日回复', value: '96 条' },
  { id: 'newUsers', label: '新注册', value: '3 人' },
  { id: 'peakOnline', label: '最高在线', value: '236 人' },
];

export const onlineUsers: OnlineUserRecord[] = [
  {
    id: '蓝色车架',
    href: getPublicProfilePath('蓝色车架'),
    location: '骑行讨论',
    rating: '★★★',
    recentActiveAt: '2026-05-24T20:17:00+08:00',
  },
  {
    id: '阿北',
    href: getPublicProfilePath('阿北'),
    location: '帖子详情',
    rating: '★★★★',
    recentActiveAt: '2026-05-24T20:15:00+08:00',
  },
  {
    id: '小林',
    href: getPublicProfilePath('小林'),
    location: '首页',
    rating: '★★',
    recentActiveAt: '2026-05-24T20:12:00+08:00',
  },
  {
    id: '小白',
    href: getPublicProfilePath('小白'),
    location: '装备经验',
    rating: '★★',
    recentActiveAt: '2026-05-24T20:09:00+08:00',
  },
  {
    id: '网站维护',
    href: getPublicProfilePath('网站维护'),
    location: '数据展示',
    rating: '★★★★',
    recentActiveAt: '2026-05-24T20:06:00+08:00',
  },
];

export const checkinRecords: CheckinRecord[] = [
  {
    checkedAt: '2026-05-24T08:30:00+08:00',
    href: getPublicProfilePath('蓝色车架'),
    id: '蓝色车架',
    rating: '★★★',
    streakDays: 12,
  },
  {
    checkedAt: '2026-05-24T09:05:00+08:00',
    href: getPublicProfilePath('阿北'),
    id: '阿北',
    rating: '★★★★',
    streakDays: 6,
  },
  {
    checkedAt: '2026-05-24T10:22:00+08:00',
    href: getPublicProfilePath('小白'),
    id: '小白',
    rating: '★',
    streakDays: 1,
  },
  {
    checkedAt: '2026-05-24T11:18:00+08:00',
    href: getPublicProfilePath('小林'),
    id: '小林',
    rating: '★★',
    streakDays: 4,
  },
  {
    checkedAt: '2026-05-24T12:40:00+08:00',
    href: getPublicProfilePath('网站维护'),
    id: '网站维护',
    rating: '★★★★',
    streakDays: 20,
  },
];
