import type { PublicProfile } from '../types/publicProfile';
import { getPublicProfilePath } from '../utils/userRoutes';

export const OWN_PUBLIC_PROFILE_ID = '蓝色车架';
export const OWN_PUBLIC_PROFILE_SLUG = 'blue-frame';

export const publicProfiles: PublicProfile[] = [
  {
    slug: OWN_PUBLIC_PROFILE_SLUG,
    id: '蓝色车架',
    intro: '长途骑行、路线记录、装备整理',
    rating: '★★★',
    registeredAt: '2026.05.17',
    lastSeen: '05.21 20:10',
    details: [
      { label: '爱好', value: '长途骑行、路线记录、装备整理' },
      { label: 'QQ', value: '1008610010' },
      { label: 'Email', value: 'blueframe@example.com' },
      { label: '地点', value: '北京' },
    ],
    stats: [
      { label: '发帖', value: 36 },
      { label: '回复', value: 128 },
      { label: '注册', value: '2026.05.17' },
      { label: '精品', value: 3 },
      { label: '签到', value: 42 },
      { label: '灌水', value: 19 },
    ],
    posts: [
      {
        title: '端午活动报名说明',
        board: '行者足音',
        excerpt: '端午活动的集合点、路线、补给和报名注意事项整理。',
        time: '2026-05-20T09:30:00+08:00',
        replies: 7,
        views: 168,
        bookmarks: 7,
        href: '#thread-duanwu-activity',
        boardHref: '#board-行者足音',
        date: '2026-05-20T09:30:00+08:00',
      },
      {
        title: '夜骑灯光角度记录',
        board: '一技之长',
        excerpt: '不同角度下的照明范围、对向眩光和路面识别情况。',
        time: '2026-05-16T21:40:00+08:00',
        replies: 4,
        views: 118,
        bookmarks: 5,
        href: '#thread-night-light',
        boardHref: '#board-一技之长',
        date: '2026-05-16T21:40:00+08:00',
      },
    ],
    replies: [
      {
        title: '周末路线临时调整',
        board: '行者足音',
        excerpt: '备用路线可以走南门，那边车流少一些。',
        time: '2026-05-21T20:10:00+08:00',
        href: '#thread-route-change',
        boardHref: '#board-行者足音',
        date: '2026-05-21T20:10:00+08:00',
      },
      {
        title: '装备清单更新建议',
        board: '车友宝典',
        excerpt: '补胎工具可以单独列出来，方便新人检查。',
        time: '2026-05-20T22:15:00+08:00',
        href: '#thread-equipment-list',
        boardHref: '#board-车友宝典',
        date: '2026-05-20T22:15:00+08:00',
      },
    ],
    activities: [
      {
        title: '端午骑行报名说明',
        board: '行者足音',
        excerpt: '',
        time: '2026-05-20T10:18:00+08:00',
        status: '已报名',
        href: '#activity-duanwu',
        boardHref: '#board-行者足音',
        date: '2026-05-20T10:18:00+08:00',
      },
      {
        title: '五月维修小课堂',
        board: '一技之长',
        excerpt: '',
        time: '2026-05-09T17:42:00+08:00',
        status: '已取消报名',
        href: '#activity-maintenance-may',
        boardHref: '#board-一技之长',
        date: '2026-05-09T17:42:00+08:00',
      },
    ],
    bookmarks: [
      {
        title: '新人入门路线建议集中帖',
        board: '车友宝典',
        excerpt: '通勤、短途、夜骑路线整理。',
        time: '2026-05-21T09:12:00+08:00',
        replies: 12,
        views: 246,
        bookmarks: 18,
        author: '小林',
        authorHref: getPublicProfilePath('小林'),
        href: '#thread-new-rider-routes',
        boardHref: '#board-车友宝典',
        date: '2026-05-21T09:12:00+08:00',
      },
      {
        title: '装备清单更新建议',
        board: '车友宝典',
        excerpt: '出行前检查清单和补给建议。',
        time: '2026-05-19T12:08:00+08:00',
        replies: 9,
        views: 184,
        bookmarks: 13,
        author: '阿北',
        authorHref: getPublicProfilePath('阿北'),
        href: '#thread-equipment-list',
        boardHref: '#board-车友宝典',
        date: '2026-05-19T12:08:00+08:00',
      },
    ],
  },
  {
    slug: 'xiaolin',
    id: '小林',
    intro: '新人路线、通勤优化、摄影',
    rating: '★★★★',
    registeredAt: '2024.09.06',
    lastSeen: '05.22 08:12',
    details: [
      { label: '爱好', value: '新人路线、通勤优化、摄影' },
      { label: 'QQ', value: '1024102410' },
      { label: 'Email', value: 'xiaolin@example.com' },
      { label: '地点', value: '北京' },
    ],
    stats: [
      { label: '发帖', value: 58 },
      { label: '回复', value: 211 },
      { label: '注册', value: '2024.09.06' },
      { label: '精品', value: 7 },
      { label: '签到', value: 87 },
      { label: '灌水', value: 26 },
    ],
    posts: [
      {
        title: '新人入门路线建议集中帖',
        board: '车友宝典',
        excerpt: '把通勤、短途、夜骑路线整理到一起，方便新人按强度选择。',
        time: '2026-05-21T09:12:00+08:00',
        replies: 12,
        views: 246,
        bookmarks: 18,
        href: '#thread-new-rider-routes',
        boardHref: '#board-车友宝典',
        date: '2026-05-21T09:12:00+08:00',
      },
      {
        title: '毕业季骑行照片征集',
        board: '新闻发布',
        excerpt: '可以按路线和年份整理，后面发推送会方便一点。',
        time: '2026-05-15T18:20:00+08:00',
        replies: 6,
        views: 120,
        bookmarks: 5,
        href: '#thread-graduation-photos',
        boardHref: '#board-新闻发布',
        date: '2026-05-15T18:20:00+08:00',
      },
    ],
    replies: [
      {
        title: '端午活动报名说明',
        board: '行者足音',
        excerpt: '8 点前还好，晚一点就需要补灯。',
        time: '2026-05-21T18:40:00+08:00',
        href: '#thread-duanwu-activity',
        boardHref: '#board-行者足音',
        date: '2026-05-21T18:40:00+08:00',
      },
      {
        title: '雨后链条保养',
        board: '一技之长',
        excerpt: '擦干以后再补油，别把泥水直接封在链节里。',
        time: '2026-05-17T09:24:00+08:00',
        href: '#thread-chain-care',
        boardHref: '#board-一技之长',
        date: '2026-05-17T09:24:00+08:00',
      },
    ],
    activities: [
      {
        title: '新生装备体验日',
        board: '车友宝典',
        excerpt: '',
        time: '2026-05-18T14:26:00+08:00',
        status: '候补中',
        href: '#activity-equipment-day',
        boardHref: '#board-车友宝典',
        date: '2026-05-18T14:26:00+08:00',
      },
    ],
    bookmarks: [
      {
        title: '端午活动报名说明',
        board: '行者足音',
        excerpt: '集合点、路线、补给和报名注意事项整理。',
        time: '2026-05-20T09:30:00+08:00',
        replies: 7,
        views: 168,
        bookmarks: 7,
        author: '蓝色车架',
        authorHref: getPublicProfilePath('蓝色车架'),
        href: '#thread-duanwu-activity',
        boardHref: '#board-行者足音',
        date: '2026-05-20T09:30:00+08:00',
      },
    ],
  },
  {
    slug: 'xiaobai',
    id: '小白',
    intro: '晚霞、轻松骑、围观活动',
    rating: '★★☆',
    registeredAt: '2026.05.20',
    lastSeen: '05.22 10:22',
    details: [
      { label: '爱好', value: '晚霞、轻松骑、围观活动' },
      { label: 'QQ', value: '1001001001' },
      { label: 'Email', value: 'xiaobai@example.com' },
      { label: '地点', value: '北京' },
    ],
    stats: [
      { label: '发帖', value: 0 },
      { label: '回复', value: 0 },
      { label: '注册', value: '2026.05.20' },
      { label: '精品', value: 0 },
      { label: '签到', value: 1 },
      { label: '灌水', value: 0 },
    ],
    posts: [],
    replies: [],
    activities: [],
    bookmarks: [],
  },
  {
    slug: 'abei',
    id: '阿北',
    intro: '装备测试、维修、夜骑',
    rating: '★★★★',
    registeredAt: '2023.03.18',
    lastSeen: '05.21 19:30',
    details: [
      { label: '爱好', value: '装备测试、维修、夜骑' },
      { label: 'QQ', value: '1122334455' },
      { label: 'Email', value: 'abei@example.com' },
      { label: '地点', value: '北京' },
    ],
    stats: [
      { label: '发帖', value: 72 },
      { label: '回复', value: 305 },
      { label: '注册', value: '2023.03.18' },
      { label: '精品', value: 11 },
      { label: '签到', value: 123 },
      { label: '灌水', value: 41 },
    ],
    posts: [
      {
        title: '雨天骑行挡泥板推荐',
        board: '车友宝典',
        excerpt: '记录几种挡泥板的安装方式、覆盖范围和雨天体验。',
        time: '2026-05-19T22:10:00+08:00',
        replies: 9,
        views: 184,
        bookmarks: 13,
        href: '#thread-rain-fender',
        boardHref: '#board-车友宝典',
        date: '2026-05-19T22:10:00+08:00',
      },
    ],
    replies: [
      {
        title: '装备清单更新建议',
        board: '车友宝典',
        excerpt: '补胎工具可以单独列出来，方便新人检查。',
        time: '2026-05-20T22:15:00+08:00',
        href: '#thread-equipment-list',
        boardHref: '#board-车友宝典',
        date: '2026-05-20T22:15:00+08:00',
      },
    ],
    activities: [
      {
        title: '五月维修小课堂',
        board: '一技之长',
        excerpt: '',
        time: '2026-05-09T17:42:00+08:00',
        status: '已报名',
        href: '#activity-maintenance-may',
        boardHref: '#board-一技之长',
        date: '2026-05-09T17:42:00+08:00',
      },
    ],
    bookmarks: [
      {
        title: '夜骑灯光角度记录',
        board: '一技之长',
        excerpt: '不同角度下的照明范围、对向眩光和路面识别情况。',
        time: '2026-05-16T21:40:00+08:00',
        replies: 4,
        views: 118,
        bookmarks: 5,
        author: '蓝色车架',
        authorHref: getPublicProfilePath('蓝色车架'),
        href: '#thread-night-light',
        boardHref: '#board-一技之长',
        date: '2026-05-16T21:40:00+08:00',
      },
    ],
  },
];

export function getPublicProfile(profileIdentifier: string | null) {
  const normalizedProfileIdentifier = profileIdentifier?.trim();

  return (
    publicProfiles.find((profile) => profile.id === normalizedProfileIdentifier) ??
    publicProfiles.find((profile) => profile.slug === normalizedProfileIdentifier) ??
    publicProfiles.find((profile) => profile.slug === 'xiaolin') ??
    publicProfiles[0]
  );
}

export function isOwnPublicProfileIdentifier(profileIdentifier: string | null) {
  const normalizedProfileIdentifier = profileIdentifier?.trim();

  return publicProfiles.some(
    (profile) =>
      profile.id === OWN_PUBLIC_PROFILE_ID &&
      (profile.id === normalizedProfileIdentifier || profile.slug === normalizedProfileIdentifier),
  );
}
