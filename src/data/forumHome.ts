import type {
  ActivityBanner,
  CalendarEvent,
  DirectConversation,
  ForumMessage,
  HotThread,
  ReplyItem,
  TopicItem,
} from '../types/forum';
import { getPublicProfilePath } from '../utils/userRoutes';

export { boards, moreBoards } from './forumBoards';

export const activities: ActivityBanner[] = [
  {
    title: '端午骑行报名说明',
    board: '车协工作区',
    deadline: '05-28 23:59',
    joined: 30,
    href: '#thread-duanwu-activity',
  },
  {
    title: '周末夜骑集合',
    board: '车协工作区',
    deadline: '05-24 18:00',
    joined: 18,
    href: '#thread-night-ride',
  },
  {
    title: '新生装备体验日',
    board: '车协工作区',
    deadline: '05-30 12:00',
    joined: 26,
    href: '#thread-repair-workshop',
  },
];

const hotThreadSeeds: HotThread[] = [
  {
    title: '关于周末骑行路线的临时调整',
    board: '行者足音',
    author: '阿北',
    lastReplyBy: '蓝色车架',
    lastReplyAt: '05-20-09-30',
    time: '05-20-09-30',
    replies: 24,
    views: 1860,
    bookmarks: 12,
    href: '#thread-route-change',
    boardHref: '#board-行者足音',
    authorHref: getPublicProfilePath('阿北'),
  },
  {
    title: '新人入门路线建议集中帖',
    board: '车友宝典',
    author: '小林',
    lastReplyBy: '小白',
    lastReplyAt: '05-20-12-10',
    time: '05-20-12-10',
    replies: 38,
    views: 2024,
    bookmarks: 19,
    href: '#thread-new-rider-routes',
    boardHref: '#board-车友宝典',
    authorHref: getPublicProfilePath('小林'),
  },
];

export const hotThreads: HotThread[] = createSimulatedHotThreads(hotThreadSeeds, 120);

function createSimulatedHotThreads(seeds: HotThread[], count: number) {
  return Array.from({ length: count }, (_, index) => {
    const seed = seeds[index % seeds.length];
    const group = Math.floor(index / seeds.length);
    const day = 20 - (group % 14);
    const hour = (9 + group * 2) % 24;
    const minute = (30 + index * 7) % 60;

    return {
      ...seed,
      authorHref: getPublicProfilePath(`${seed.author}-${index + 1}`),
      bookmarks: seed.bookmarks + (index % 9),
      href: `${seed.href}-${index + 1}`,
      lastReplyAt: `05-${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}-${String(minute).padStart(2, '0')}`,
      replies: seed.replies + (index % 23),
      time: `05-${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}-${String(minute).padStart(2, '0')}`,
      title: `${seed.title} #${index + 1}`,
      views: seed.views + index * 13,
    };
  });
}

export const latestReplies: ReplyItem[] = [
  {
    id: '蓝色车架',
    rating: '★★★☆',
    board: '行者足音',
    topic: '端午活动报名说明',
    time: '05-20-11-48',
    href: '#thread-duanwu-activity',
    boardHref: '#board-行者足音',
    authorHref: getPublicProfilePath('蓝色车架'),
  },
  {
    id: '阿北',
    rating: '★★★★',
    board: '车友宝典',
    topic: '雨天骑行挡泥板推荐',
    time: '05-20-10-12',
    href: '#thread-rain-fender',
    boardHref: '#board-车友宝典',
    authorHref: getPublicProfilePath('阿北'),
  },
];

export const latestTopics: TopicItem[] = [
  {
    id: '蓝色车架',
    rating: '★★★☆',
    board: '行者足音',
    topic: '端午活动报名说明',
    time: '05-20-09-30',
    bookmarks: 7,
    href: '#thread-duanwu-activity',
    boardHref: '#board-行者足音',
    authorHref: getPublicProfilePath('蓝色车架'),
  },
  {
    id: '小白',
    rating: '★★☆',
    board: '纯净水',
    topic: '今天晚霞很好看',
    time: '05-20-08-20',
    bookmarks: 2,
    href: '#thread-sunset',
    boardHref: '#board-纯净水',
    authorHref: getPublicProfilePath('小白'),
  },
];

export const calendarEvents: CalendarEvent[] = [
  { date: '1995-10-25', title: '协会伊始', time: '全天', place: 'CAPU' },
  { date: '2026-05-20', title: '周三夜骑集合', time: '19:30 - 21:30', place: '东门' },
  { date: '2026-05-21', title: '端午报名提醒', time: '12:00', place: '线上' },
  { date: '2026-05-22', title: '装备检查值班', time: '17:30 - 18:30', place: '活动室' },
  { date: '2026-05-23', title: '周末路线确认', time: '20:00', place: '论坛' },
  { date: '2026-05-24', title: '新手晨骑', time: '08:30 - 10:30', place: '东门' },
  { date: '2026-05-28', title: '端午报名截止', time: '23:59', place: '活动帖' },
  { date: '2026-06-03', title: '月度例会', time: '19:00 - 20:30', place: '社团活动室' },
  { date: '2026-06-13', title: '维修小课堂', time: '14:00 - 16:00', place: '车棚' },
  { date: '2027-05-20', title: '年度回顾预约', time: '10:00', place: '线上' },
];

export const forumMessages: ForumMessage[] = [
  {
    id: 'reply-blue-frame-route',
    category: 'replies',
    sender: '蓝色车架',
    title: '回复了你的帖子',
    context: '《周末路线临时调整》',
    excerpt: '备用路线可以走南门，那边车流少一些。',
    time: '05-21 20:10',
    group: '今天',
    href: '#thread-route-change',
    unread: true,
  },
  {
    id: 'reply-xiaolin-duanwu',
    category: 'replies',
    sender: '小林',
    title: '回复了你的楼中楼',
    context: '《端午活动讨论》 #8',
    excerpt: '8 点前还好，晚一点就需要补灯。',
    time: '05-21 18:40',
    group: '今天',
    href: '#thread-duanwu-activity',
    unread: true,
  },
  {
    id: 'reply-abei-equipment',
    category: 'replies',
    sender: '阿北',
    title: '回复了你的回复',
    context: '《装备清单更新建议》',
    excerpt: '补胎工具可以单独列出来，方便新人检查。',
    time: '05-20 22:15',
    group: '昨天',
    href: '#thread-equipment-list',
    unread: false,
  },
  {
    id: 'mention-maintenance',
    category: 'mentions',
    sender: '网站维护',
    title: '在帖子中提到了你',
    context: '《新版首页反馈收集》',
    excerpt: '这个排版问题可以请 @你 看一下移动端表现。',
    time: '05-21 16:22',
    group: '今天',
    href: '#thread-home-feedback',
    unread: true,
  },
  {
    id: 'mention-route-note',
    category: 'mentions',
    sender: '小白',
    title: '在回复中提到了你',
    context: '《夜骑集合点确认》',
    excerpt: '@你 上次说的东门停车点还可用吗？',
    time: '05-20 21:08',
    group: '昨天',
    href: '#thread-night-ride',
    unread: false,
  },
  {
    id: 'direct-abei',
    category: 'direct',
    sender: '阿北',
    title: '阿北',
    conversationId: 'abei',
    excerpt: '明天集合点我再确认一下。',
    time: '05-21 19:30',
    group: '今天',
    href: '#message-abei',
    unread: true,
  },
  {
    id: 'direct-xiaolin',
    category: 'direct',
    sender: '小林',
    title: '小林',
    conversationId: 'xiaolin',
    excerpt: '装备清单我补了一版。',
    time: '05-20 21:08',
    group: '昨天',
    href: '#message-xiaolin',
    unread: true,
  },
];

export const directConversations: DirectConversation[] = [
  {
    id: 'abei',
    user: '阿北',
    rating: '★★★★',
    status: '最近活跃：05-21 20:10',
    profileHref: getPublicProfilePath('阿北'),
    lastMessage: '如果改到南门，我会同步发到帖子里。',
    lastTime: '19:42',
    unread: 1,
    messages: [
      {
        id: 'abei-1',
        author: 'them',
        text: '明天集合点我再确认一下。',
        time: '19:30',
        date: '05-21',
      },
      {
        id: 'abei-2',
        author: 'me',
        text: '好，我等你确认。',
        time: '19:35',
        date: '05-21',
      },
      {
        id: 'abei-3',
        author: 'them',
        text: '如果改到南门，我会同步发到帖子里。',
        time: '19:42',
        date: '05-21',
      },
    ],
  },
  {
    id: 'xiaolin',
    user: '小林',
    rating: '★★★☆',
    status: '在线',
    profileHref: getPublicProfilePath('小林'),
    lastMessage: '装备清单我补了一版。',
    lastTime: '21:08',
    unread: 1,
    messages: [
      {
        id: 'xiaolin-1',
        author: 'them',
        text: '装备清单我补了一版，你看看有没有遗漏。',
        time: '21:08',
        date: '05-20',
      },
      {
        id: 'xiaolin-2',
        author: 'me',
        text: '收到，我晚点补一下灯具和雨具。',
        time: '21:16',
        date: '05-20',
      },
    ],
  },
  {
    id: 'blue-frame',
    user: '蓝色车架',
    rating: '★★★☆',
    status: '最近活跃：05-21 18:12',
    profileHref: getPublicProfilePath('蓝色车架'),
    lastMessage: '端午活动我先把报名格式贴出来。',
    lastTime: '18:12',
    unread: 0,
    messages: [],
  },
];
