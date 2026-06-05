import { boards, moreBoards } from './forumHome';
import { getBoardCoverImage } from './boardCovers';
import type { BoardDetail, BoardThread, BoardThreadKind } from '../types/forum';
import { getBoardNewThreadPath } from '../utils/boardRoutes';
import { getPublishedBoardThreads } from '../utils/threadComposeStorage';
import { getPublicProfilePath } from '../utils/userRoutes';

type BoardProfile = Omit<BoardDetail, 'name' | 'online' | 'postHref' | 'threads'>;
const GLOBAL_CURRENT_ONLINE = 128;

const boardProfiles: Record<string, BoardProfile> = {
  车协工作区: {
    description: '协会事务、值班安排、报名表单和版务协作。',
    moderators: ['会长团', '网站维护'],
    topics: 318,
    replies: 2864,
    today: 9,
  },
  行者足音: {
    description: '活动发布、报名交流、路线确认和骑行记录沉淀。',
    moderators: ['阿北', '小林'],
    topics: 1324,
    replies: 9832,
    today: 24,
  },
  车友宝典: {
    description: '装备经验、维修技巧、路线知识和新手问答。',
    moderators: ['蓝色车架', '阿北'],
    topics: 986,
    replies: 6420,
    today: 16,
  },
  纯净水: {
    description: '轻松聊天、日常记录、照片分享和临时问答。',
    moderators: ['小白', '蓝色车架'],
    topics: 2110,
    replies: 18562,
    today: 31,
  },
  考察与社会: {
    description: '考察活动、社会实践、观察记录和资料整理。',
    moderators: ['小林', '阿北'],
    topics: 246,
    replies: 1428,
    today: 6,
  },
  五湖四海: {
    description: '外地路线、长途计划、旅途经验和目的地问答。',
    moderators: ['蓝色车架', '小白'],
    topics: 412,
    replies: 3084,
    today: 7,
  },
  一技之长: {
    description: '维修、摄影、地图、训练和各种可复用技能。',
    moderators: ['阿北', '网站维护'],
    topics: 368,
    replies: 2240,
    today: 8,
  },
  竞技竞赛: {
    description: '训练计划、比赛报名、赛后复盘和队伍协作。',
    moderators: ['小林', '蓝色车架'],
    topics: 286,
    replies: 1986,
    today: 5,
  },
  网站维护: {
    description: '论坛反馈、功能测试、迁移记录和维护公告。',
    moderators: ['网站维护', '会长团'],
    topics: 154,
    replies: 916,
    today: 4,
  },
  历史笔记: {
    description: '协会旧路线、活动照片、年份记录和资料校对。',
    moderators: ['网站维护'],
    topics: 22,
    replies: 184,
    today: 2,
  },
  资料整理: {
    description: '路线文件、装备清单、报名模板和地图资料归档。',
    moderators: ['蓝色车架', '网站维护'],
    topics: 56,
    replies: 520,
    today: 5,
  },
  回收: {
    description: '被移走或等待复核的内容暂存区。',
    moderators: ['网站维护'],
    topics: 0,
    replies: 0,
    today: 0,
  },
  公告栏: {
    description: '版规、集合通知、维护公告和报名截止提醒。',
    moderators: ['会长团', '网站维护'],
    topics: 8,
    replies: 48,
    today: 1,
  },
  新闻发布: {
    description: '活动简讯、照片征集、推送文案和社团新闻。',
    moderators: ['会长团', '小林'],
    topics: 119,
    replies: 960,
    today: 11,
  },
  剧组工作: {
    description: '拍摄分工、素材备份、镜头点位和剪辑协作。',
    moderators: ['小林', '蓝色车架'],
    topics: 11,
    replies: 86,
    today: 2,
  },
  游记: {
    description: '短途和长线骑行手记、路况见闻和照片整理。',
    moderators: ['蓝色车架', '小白'],
    topics: 17,
    replies: 132,
    today: 3,
  },
  测试: {
    description: '分页、筛选、空态和交互边界的测试内容。',
    moderators: ['网站维护'],
    topics: 132,
    replies: 1480,
    today: 12,
  },
  精品集合: {
    description: '精华技术帖、路线帖、活动记录和长期索引。',
    moderators: ['阿北', '小林'],
    topics: 24,
    replies: 310,
    today: 4,
  },
};

const fallbackProfile: BoardProfile = {
  description: '社区内容归档、讨论补充和后续整理。',
  moderators: ['网站维护'],
  topics: 128,
  replies: 720,
  today: 3,
};

type GeneratedThreadOptions = {
  count: number;
  seed?: number;
  pinnedCount?: number;
  activityEvery?: number;
  digestEvery?: number;
};

const ACTIVITY_BOARD_NAME = '车协工作区';
const MOCK_START_TIME_UTC = Date.UTC(2026, 4, 22, 10, 30);

const generatedAuthors = [
  { name: '蓝色车架', href: getPublicProfilePath('蓝色车架') },
  { name: '阿北', href: getPublicProfilePath('阿北') },
  { name: '小林', href: getPublicProfilePath('小林') },
  { name: '小白', href: getPublicProfilePath('小白') },
  { name: '网站维护', href: getPublicProfilePath('网站维护') },
  { name: '会长团', href: getPublicProfilePath('会长团') },
];

const boardSlugs: Record<string, string> = {
  车协工作区: 'workbench',
  行者足音: 'ride-log',
  车友宝典: 'guide',
  纯净水: 'water',
  考察与社会: 'fieldwork',
  五湖四海: 'travel',
  一技之长: 'skills',
  竞技竞赛: 'race',
  网站维护: 'site',
  历史笔记: 'history',
  资料整理: 'archive',
  回收: 'recycle',
  公告栏: 'notice',
  新闻发布: 'news',
  剧组工作: 'studio',
  游记: 'travel-notes',
  测试: 'test',
  精品集合: 'featured',
};

const generatedThreadTitles: Record<string, string[]> = {
  车协工作区: ['值班表更新', '器材借用记录', '报名数据复核', '社团仓库整理'],
  行者足音: ['周末路线确认', '夜骑集合提醒', '新人骑行回顾', '补给点同步'],
  车友宝典: ['通勤装备问答', '轮胎选择记录', '刹车调校心得', '雨天维护建议'],
  纯净水: ['今日骑车碎碎念', '晚霞照片接龙', '临时问答小楼', '校园路况闲聊'],
  考察与社会: ['考察路线纪要', '实践报名确认', '资料记录格式', '观察点整理'],
  五湖四海: ['外地路线咨询', '长途补给复盘', '城市骑行记录', '目的地问答'],
  一技之长: ['维修技巧记录', '地图工具教程', '摄影机位分享', '训练数据整理'],
  竞技竞赛: ['间歇训练安排', '比赛报名提醒', '赛后复盘记录', '队伍配速讨论'],
  网站维护: ['新版反馈收集', '接口联调记录', '页面空态检查', '迁移问题追踪'],
  历史笔记: ['旧路线档案', '早期照片整理', '活动年表补充', '资料校对记录'],
  资料整理: ['路线资料归档', '装备表格更新', '报名模板整理', '地图文件命名'],
  公告栏: ['版规提醒', '集合通知', '维护公告', '报名截止提示'],
  新闻发布: ['活动简讯', '照片征集通知', '推送文案草案', '社团新闻整理'],
  剧组工作: ['拍摄分工确认', '素材备份记录', '镜头点位讨论', '后期剪辑清单'],
  游记: ['短途游记草稿', '长线骑行手记', '补给点见闻', '路线照片整理'],
  精品集合: ['精华收录建议', '技术帖索引', '路线帖精选', '活动记录合集'],
};

function buildGeneratedThreads(board: string, options: GeneratedThreadOptions): BoardThread[] {
  return Array.from({ length: options.count }, (_, index) => buildGeneratedThread(board, index, options));
}

function buildGeneratedThread(board: string, index: number, options: GeneratedThreadOptions): BoardThread {
  const seed = options.seed ?? 0;
  const displayIndex = index + 1;
  const id = `${boardSlugs[board] ?? buildBoardSlug(board)}-${String(displayIndex).padStart(3, '0')}`;
  const kind = getGeneratedThreadKind(board, index, options);
  const author = generatedAuthors[(index + seed) % generatedAuthors.length];
  const lastReplyAuthor = generatedAuthors[(index + seed + 2) % generatedAuthors.length];
  const titlePool = generatedThreadTitles[board] ?? ['版面资料整理', '讨论内容补充', '活动信息确认', '经验记录更新'];
  const titleBase = titlePool[(index + seed) % titlePool.length];
  const createdHoursAgo = 18 + seed + index * 5;
  const lastReplyHoursAgo = seed + index * 3;

  return {
    id,
    title: `${titleBase} ${String(displayIndex).padStart(3, '0')}`,
    kind,
    author: author.name,
    authorHref: author.href,
    createdAt: makeMockTimestamp(createdHoursAgo),
    lastReplyBy: lastReplyAuthor.name,
    lastReplyAt: makeMockTimestamp(lastReplyHoursAgo),
    replies: 2 + ((index * 7 + seed) % 86),
    views: 96 + ((index * 53 + seed * 17) % 5200),
    href: `#thread-${id}`,
    pinned: index < (options.pinnedCount ?? 0) ? true : undefined,
    digest: kind === 'digest' ? true : undefined,
    openForSignup: canBoardHaveActivityThreads(board) && kind === 'activity' && index % 2 === 0 ? true : undefined,
  };
}

function getGeneratedThreadKind(board: string, index: number, options: GeneratedThreadOptions): BoardThreadKind {
  const serial = index + 1;

  if (canBoardHaveActivityThreads(board) && options.activityEvery && serial % options.activityEvery === 0) {
    return 'activity';
  }

  if (options.digestEvery && serial % options.digestEvery === 0) {
    return 'digest';
  }

  return 'discussion';
}

function canBoardHaveActivityThreads(board: string) {
  return board === ACTIVITY_BOARD_NAME;
}

function normalizeThreadForBoard(board: string, thread: BoardThread): BoardThread {
  const shouldKeepActivity = canBoardHaveActivityThreads(board);
  const nextKind = shouldKeepActivity ? thread.kind : thread.kind === 'activity' ? 'discussion' : thread.kind;
  const nextOpenForSignup = shouldKeepActivity && nextKind === 'activity' ? thread.openForSignup : undefined;

  if (nextKind === thread.kind && nextOpenForSignup === thread.openForSignup) {
    return thread;
  }

  return {
    ...thread,
    kind: nextKind,
    openForSignup: nextOpenForSignup,
  };
}

function makeMockTimestamp(hoursAgo: number) {
  const date = new Date(MOCK_START_TIME_UTC - hoursAgo * 60 * 60 * 1000);
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = chinaTime.getUTCFullYear();
  const month = padDatePart(chinaTime.getUTCMonth() + 1);
  const day = padDatePart(chinaTime.getUTCDate());
  const hour = padDatePart(chinaTime.getUTCHours());
  const minute = padDatePart(chinaTime.getUTCMinutes());

  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function buildBoardSlug(board: string) {
  return board
    .split('')
    .map((char) => char.charCodeAt(0).toString(36))
    .join('-');
}

const boardThreadSets: Record<string, BoardThread[]> = {
  车协工作区: [
    {
      id: 'duanwu-activity',
      title: '端午骑行报名说明',
      kind: 'activity',
      author: '阿北',
      authorHref: getPublicProfilePath('阿北'),
      createdAt: '2026-05-20T09:30:00+08:00',
      lastReplyBy: '蓝色车架',
      lastReplyAt: '2026-05-20T11:48:00+08:00',
      replies: 24,
      views: 1860,
      href: '#thread-duanwu-activity',
      pinned: true,
      openForSignup: true,
    },
    {
      id: 'night-ride',
      title: '周末夜骑集合点确认',
      kind: 'activity',
      author: '小林',
      authorHref: getPublicProfilePath('小林'),
      createdAt: '2026-05-19T20:30:00+08:00',
      lastReplyBy: '阿北',
      lastReplyAt: '2026-05-20T08:50:00+08:00',
      replies: 16,
      views: 980,
      href: '#thread-night-ride',
      openForSignup: true,
    },
    {
      id: 'repair-workshop',
      title: '维修小课堂：补胎和链条清洁',
      kind: 'activity',
      author: '蓝色车架',
      authorHref: getPublicProfilePath('蓝色车架'),
      createdAt: '2026-05-20T12:10:00+08:00',
      lastReplyBy: '小林',
      lastReplyAt: '2026-05-20T13:40:00+08:00',
      replies: 9,
      views: 520,
      href: '#thread-repair-workshop',
      openForSignup: true,
    },
    ...buildGeneratedThreads('车协工作区', {
      count: 18,
      seed: 3,
      pinnedCount: 1,
      activityEvery: 6,
      digestEvery: 9,
    }),
  ],
  行者足音: [
    {
      id: 'route-change',
      title: '关于周末骑行路线的临时调整',
      kind: 'discussion',
      author: '蓝色车架',
      authorHref: getPublicProfilePath('蓝色车架'),
      createdAt: '2026-05-19T22:10:00+08:00',
      lastReplyBy: '小林',
      lastReplyAt: '2026-05-20T08:16:00+08:00',
      replies: 12,
      views: 640,
      href: '#thread-route-change',
    },
    {
      id: 'new-rider-routes',
      title: '新人入门路线建议集中帖',
      kind: 'digest',
      author: '小林',
      authorHref: getPublicProfilePath('小林'),
      createdAt: '2026-05-18T13:20:00+08:00',
      lastReplyBy: '小白',
      lastReplyAt: '2026-05-20T10:05:00+08:00',
      replies: 54,
      views: 4310,
      href: '#thread-new-rider-routes',
      digest: true,
    },
    ...buildGeneratedThreads('行者足音', {
      count: 124,
      seed: 11,
      activityEvery: 7,
      digestEvery: 13,
    }),
  ],
  车友宝典: [
    {
      id: 'equipment-guide',
      title: '新人装备避坑清单',
      kind: 'digest',
      author: '阿北',
      authorHref: getPublicProfilePath('阿北'),
      createdAt: '2026-05-18T13:20:00+08:00',
      lastReplyBy: '小白',
      lastReplyAt: '2026-05-20T10:05:00+08:00',
      replies: 54,
      views: 4310,
      href: '#thread-equipment-guide',
      pinned: true,
      digest: true,
    },
    {
      id: 'rain-fender',
      title: '雨天骑行挡泥板推荐',
      kind: 'discussion',
      author: '阿北',
      authorHref: getPublicProfilePath('阿北'),
      createdAt: '2026-05-19T22:10:00+08:00',
      lastReplyBy: '蓝色车架',
      lastReplyAt: '2026-05-20T10:12:00+08:00',
      replies: 18,
      views: 1260,
      href: '#thread-rain-fender',
    },
    ...buildGeneratedThreads('车友宝典', {
      count: 36,
      seed: 19,
      activityEvery: 12,
      digestEvery: 5,
    }),
  ],
  纯净水: [
    {
      id: 'daily-chat-rules',
      title: '水区发帖规范和轻松聊天索引',
      kind: 'discussion',
      author: '网站维护',
      authorHref: getPublicProfilePath('网站维护'),
      createdAt: '2026-05-16T14:53:00+08:00',
      lastReplyBy: '小白',
      lastReplyAt: '2026-05-20T08:20:00+08:00',
      replies: 32,
      views: 2140,
      href: '#thread-daily-chat-rules',
      pinned: true,
    },
    {
      id: 'sunset',
      title: '今天晚霞很好看',
      kind: 'discussion',
      author: '小白',
      authorHref: getPublicProfilePath('小白'),
      createdAt: '2026-05-20T08:20:00+08:00',
      lastReplyBy: '蓝色车架',
      lastReplyAt: '2026-05-20T09:18:00+08:00',
      replies: 5,
      views: 76,
      href: '#thread-sunset',
    },
    ...buildGeneratedThreads('纯净水', {
      count: 108,
      seed: 5,
      activityEvery: 0,
      digestEvery: 18,
    }),
  ],
  考察与社会: buildGeneratedThreads('考察与社会', {
    count: 12,
    seed: 23,
    activityEvery: 4,
    digestEvery: 6,
  }),
  五湖四海: buildGeneratedThreads('五湖四海', {
    count: 27,
    seed: 31,
    pinnedCount: 1,
    activityEvery: 9,
    digestEvery: 7,
  }),
  一技之长: buildGeneratedThreads('一技之长', {
    count: 16,
    seed: 41,
    pinnedCount: 1,
    activityEvery: 8,
    digestEvery: 4,
  }),
  竞技竞赛: buildGeneratedThreads('竞技竞赛', {
    count: 9,
    seed: 53,
    activityEvery: 3,
    digestEvery: 0,
  }),
  网站维护: buildGeneratedThreads('网站维护', {
    count: 14,
    seed: 61,
    pinnedCount: 1,
    activityEvery: 0,
    digestEvery: 7,
  }),
  历史笔记: buildGeneratedThreads('历史笔记', {
    count: 22,
    seed: 71,
    digestEvery: 5,
  }),
  资料整理: buildGeneratedThreads('资料整理', {
    count: 56,
    seed: 83,
    pinnedCount: 2,
    activityEvery: 14,
    digestEvery: 8,
  }),
  回收: [],
  公告栏: buildGeneratedThreads('公告栏', {
    count: 8,
    seed: 97,
    pinnedCount: 2,
    activityEvery: 4,
    digestEvery: 0,
  }),
  新闻发布: buildGeneratedThreads('新闻发布', {
    count: 119,
    seed: 109,
    pinnedCount: 1,
    activityEvery: 10,
    digestEvery: 15,
  }),
  剧组工作: buildGeneratedThreads('剧组工作', {
    count: 11,
    seed: 127,
    activityEvery: 5,
    digestEvery: 0,
  }),
  游记: buildGeneratedThreads('游记', {
    count: 17,
    seed: 137,
    digestEvery: 6,
  }),
  测试: buildGeneratedThreads('测试', {
    count: 132,
    seed: 149,
    pinnedCount: 3,
    activityEvery: 11,
    digestEvery: 17,
  }),
  精品集合: buildGeneratedThreads('精品集合', {
    count: 24,
    seed: 163,
    pinnedCount: 2,
    digestEvery: 3,
  }),
};

const genericThreads: BoardThread[] = [
  {
    id: 'board-guide',
    title: '版面发帖说明和资料索引',
    kind: 'discussion',
    author: '网站维护',
    authorHref: getPublicProfilePath('网站维护'),
    createdAt: '2026-05-18T09:00:00+08:00',
    lastReplyBy: '阿北',
    lastReplyAt: '2026-05-20T09:10:00+08:00',
    replies: 8,
    views: 420,
    href: '#thread-board-guide',
    pinned: true,
  },
  {
    id: 'weekly-notes',
    title: '本周内容整理与补充',
    kind: 'discussion',
    author: '蓝色车架',
    authorHref: getPublicProfilePath('蓝色车架'),
    createdAt: '2026-05-19T18:30:00+08:00',
    lastReplyBy: '小林',
    lastReplyAt: '2026-05-20T12:24:00+08:00',
    replies: 14,
    views: 880,
    href: '#thread-weekly-notes',
  },
  {
    id: 'activity-notice',
    title: '近期活动与报名提醒',
    kind: 'discussion',
    author: '小林',
    authorHref: getPublicProfilePath('小林'),
    createdAt: '2026-05-20T10:40:00+08:00',
    lastReplyBy: '小白',
    lastReplyAt: '2026-05-20T13:12:00+08:00',
    replies: 6,
    views: 360,
    href: '#thread-activity-notice',
  },
];

const knownBoards = new Set([...boards, ...moreBoards]);

export function getBoardDetail(boardName: string | null): BoardDetail | null {
  if (!boardName || !knownBoards.has(boardName)) {
    return null;
  }

  const profile = boardProfiles[boardName] ?? fallbackProfile;
  const threads = (boardThreadSets[boardName] ?? genericThreads).map((thread) =>
    normalizeThreadForBoard(boardName, thread),
  );
  const publishedThreads = getPublishedBoardThreads(boardName);

  return {
    ...profile,
    name: boardName,
    coverImage: profile.coverImage ?? getBoardCoverImage(boardName),
    online: GLOBAL_CURRENT_ONLINE,
    postHref: getBoardNewThreadPath(boardName),
    threads: [...publishedThreads, ...threads],
  };
}

export function findBoardThreadById(threadId: string) {
  for (const boardName of knownBoards) {
    const board = getBoardDetail(boardName);
    const thread = board?.threads.find((item) => item.id === threadId);

    if (board && thread) {
      return {
        board,
        thread,
      };
    }
  }

  return null;
}
