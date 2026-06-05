import type { ThreadAuthor, ThreadDetail, ThreadFloor } from '../types/forum';
import { getBoardPath } from '../utils/boardRoutes';
import { getPublishedThreadDetail, getPublishedThreadDetails } from '../utils/threadComposeStorage';
import { applyThreadEditOverrides } from '../utils/threadEditStorage';
import { getPublicProfilePath } from '../utils/userRoutes';
import { findBoardThreadById } from './boardDetails';

const authors: Record<string, ThreadAuthor> = {
  abei: {
    id: '阿北',
    name: '阿北',
    href: getPublicProfilePath('阿北'),
    rating: '★★★★',
    role: '版主',
  },
  blueFrame: {
    id: '蓝色车架',
    name: '蓝色车架',
    href: getPublicProfilePath('蓝色车架'),
    rating: '★★★☆',
    role: '楼主',
  },
  xiaolin: {
    id: '小林',
    name: '小林',
    href: getPublicProfilePath('小林'),
    rating: '★★★☆',
  },
  xiaobai: {
    id: '小白',
    name: '小白',
    href: getPublicProfilePath('小白'),
    rating: '★★☆',
  },
  siteAdmin: {
    id: '网站维护',
    name: '网站维护',
    href: getPublicProfilePath('网站维护'),
    rating: '★★★★',
    role: '管理员',
  },
};

export function getThreadDetail(threadId: string | null) {
  if (!threadId) {
    return null;
  }

  const thread = getPublishedThreadDetail(threadId) ?? threadDetails[threadId] ?? buildFallbackThreadDetail(threadId);

  return thread ? applyThreadEditOverrides(thread) : null;
}

const threadDetails: Record<string, ThreadDetail> = {
  'route-change': {
    id: 'route-change',
    title: '关于周末骑行路线的临时调整',
    board: '行者足音',
    boardHref: getBoardPath('行者足音'),
    kind: 'discussion',
    author: authors.blueFrame,
    createdAt: '2026-05-19T22:10:00+08:00',
    replies: 12,
    views: 640,
    bookmarks: 6,
    canModerate: true,
    canGlobalPin: true,
    mainPost: floor(1, authors.blueFrame, '2026-05-19T22:10:00+08:00', [
      '周末路线因为施工需要临时调整，原本从北门直接进辅路的那一段先取消，集合点往南挪到东门外侧的停车区。',
      '新路线会先绕过施工路口，再从河边小路接回原计划。全程距离变化不大，但前 3 公里会多两个路口，请大家出发前再看一眼路线图。',
      '如果周六早上有雨，就启用备用短线。备用方案会少一个补给点，建议自带一瓶水和简单能量补给。',
    ], 18, {
      attachments: [
        { name: 'route-map.png', meta: '路线图 · 824 KB', href: '#attachment-route-map' },
        { name: 'rain-backup.pdf', meta: '雨天备选路线 · 216 KB', href: '#attachment-rain-backup' },
      ],
      editedAt: '2026-05-20T07:45:00+08:00',
      signature: ['路线会变，集合点先确认。'],
    }),
    floors: [
      floor(2, authors.xiaolin, '2026-05-20T08:16:00+08:00', [
        '我看了一下，备用路线可以走南门。那边早上车流会少一些，也方便队伍重新汇合。',
      ], 6, {
        nestedReplies: [
          {
            id: 'route-change-2-1',
            author: '阿北',
            authorHref: getPublicProfilePath('阿北'),
            content: '南门早上会不会堵？如果八点后车多，可能要再提前一点集合。',
            time: '2026-05-20T12:02:00+08:00',
          },
          {
            id: 'route-change-2-2',
            author: '小林',
            authorHref: getPublicProfilePath('小林'),
            target: '阿北',
            targetHref: getPublicProfilePath('阿北'),
            content: '8 点前还好，我刚问了上周走过的同学，路口没有封。',
            time: '2026-05-20T12:06:00+08:00',
          },
        ],
      }),
      floor(3, authors.xiaobai, '2026-05-20T13:20:00+08:00', [
        '收到，我按新路线集合。备用外胎我会带一条，万一路上有人扎胎可以先顶一下。',
      ], 2, {
        editedAt: '2026-05-20T13:28:00+08:00',
        signature: ['慢慢骑，也能到。'],
      }),
      floor(4, authors.abei, '2026-05-20T14:04:00+08:00', [
        '我把集合点同步到群公告了。出发前如果天气变化明显，会在主楼继续更新。',
      ], 5),
    ],
  },
  'rain-fender': {
    id: 'rain-fender',
    title: '雨天骑行挡泥板推荐',
    board: '车友宝典',
    boardHref: getBoardPath('车友宝典'),
    kind: 'discussion',
    author: authors.abei,
    createdAt: '2026-05-19T22:10:00+08:00',
    replies: 18,
    views: 1260,
    bookmarks: 11,
    canModerate: true,
    mainPost: floor(1, authors.abei, '2026-05-19T22:10:00+08:00', [
      '最近几次小雨天通勤，大家问挡泥板的频率又上来了。短途通勤可以选轻量快拆款，长距离还是建议用覆盖更完整的版本。',
      '选之前先看车架有没有预留孔位。如果没有预留孔位，快拆款安装方便，但高速下稳定性会差一点，需要定期检查绑带。',
    ], 24, {
      attachments: [{ name: 'fender-checklist.md', meta: '选购检查表 · 12 KB', href: '#attachment-fender-checklist' }],
    }),
    floors: [
      floor(2, authors.blueFrame, '2026-05-20T10:12:00+08:00', [
        '轻量款我用过，前轮效果还可以，后轮如果包不住尾部，背包还是会被甩到泥点。',
      ], 4),
      floor(3, authors.xiaolin, '2026-05-20T13:35:00+08:00', [
        '补充一点：折叠车要额外看轮径，不然买回来角度很难调。',
      ], 3),
    ],
  },
  'new-rider-routes': {
    id: 'new-rider-routes',
    title: '新人入门路线建议集中帖',
    board: '车友宝典',
    boardHref: getBoardPath('车友宝典'),
    kind: 'digest',
    author: authors.xiaolin,
    createdAt: '2026-05-18T13:20:00+08:00',
    replies: 54,
    views: 4310,
    bookmarks: 19,
    digest: true,
    canModerate: true,
    mainPost: floor(1, authors.xiaolin, '2026-05-18T13:20:00+08:00', [
      '把最近问得比较多的通勤、短途、夜骑路线整理到一起，后面可以继续补充不同强度和不同集合点的版本。',
      '新人第一次跟骑建议选 15 公里以内的平路，先熟悉手势、队形和补给节奏。不要第一次就跟高速拉练。',
    ], 51),
    floors: [
      floor(2, authors.xiaobai, '2026-05-20T10:05:00+08:00', [
        '东门到河边这条真的适合第一次跟骑，路口少，回来也方便。',
      ], 8),
      floor(3, authors.abei, '2026-05-20T11:42:00+08:00', [
        '建议再加一个晚霞线，强度不高，但注意回程灯要够亮。',
      ], 10),
    ],
  },
  sunset: {
    id: 'sunset',
    title: '今天晚霞很好看',
    board: '纯净水',
    boardHref: getBoardPath('纯净水'),
    kind: 'discussion',
    author: authors.xiaobai,
    createdAt: '2026-05-20T08:20:00+08:00',
    replies: 5,
    views: 76,
    bookmarks: 2,
    mainPost: floor(1, authors.xiaobai, '2026-05-20T08:20:00+08:00', [
      '从东门出来的时候正好看到一整片橙色云层，骑车回去的路上心情直接变好了。',
      '如果之后有晚霞骑的照片，可以都丢到这个帖里。',
    ], 9),
    floors: [
      floor(2, authors.blueFrame, '2026-05-20T09:18:00+08:00', [
        '我也看到了，桥上那段特别好看。下次可以提前十分钟出发。',
      ], 2),
    ],
  },
  'duanwu-activity': {
    id: 'duanwu-activity',
    title: '端午骑行报名说明',
    board: '车协工作区',
    boardHref: getBoardPath('车协工作区'),
    kind: 'activity',
    author: authors.abei,
    createdAt: '2026-05-20T09:30:00+08:00',
    replies: 24,
    views: 1860,
    bookmarks: 12,
    pinned: true,
    canManageActivitySignup: true,
    canModerate: true,
    mainPost: floor(1, authors.abei, '2026-05-20T09:30:00+08:00', [
      '端午骑行分为轻松组和进阶组，集合点、路线、补给和注意事项先放在主楼，后续如果有调整会继续编辑。',
      '请确认自己的车辆状态，头盔和前后灯必带。第一次参加长距离活动的同学建议选择轻松组。',
    ], 37),
    floors: [
      floor(2, authors.blueFrame, '2026-05-20T11:48:00+08:00', [
        '报名组别：轻松组',
        '集合点：东门停车区',
        '车辆状态：已检查刹车和胎压',
        '保障需求：需要队尾照应',
        '备注：备用外胎和补给建议也可以加到主楼。',
      ], 6, {
        signature: ['长途不拼速度，能平安回来就是好路线。'],
      }),
      floor(3, authors.xiaolin, '2026-05-20T12:40:00+08:00', [
        '报名组别：进阶组',
        '集合点：东门停车区',
        '车辆状态：前后灯齐全，链条已清洁',
        '保障需求：无',
        '备注：返程如天黑，我可以负责尾灯检查。',
      ], 5),
    ],
  },
  'night-ride': {
    id: 'night-ride',
    title: '周末夜骑集合点确认',
    board: '车协工作区',
    boardHref: getBoardPath('车协工作区'),
    kind: 'activity',
    author: authors.xiaolin,
    createdAt: '2026-05-19T20:30:00+08:00',
    replies: 16,
    views: 980,
    bookmarks: 8,
    canManageActivitySignup: true,
    canModerate: true,
    mainPost: floor(1, authors.xiaolin, '2026-05-19T20:30:00+08:00', [
      '这周夜骑集合点先按东门停车区执行，出发前十分钟清点人数。路线以河边平路为主，适合第一次参加夜骑的同学。',
      '前后灯、头盔必带。没有尾灯的同学请提前在帖里说一声，活动室还有备用灯可以借。',
    ], 21),
    floors: [
      floor(2, authors.abei, '2026-05-20T08:50:00+08:00', [
        '报名组别：轻松组',
        '集合点：东门停车区',
        '车辆状态：胎压正常，尾灯已充电',
        '保障需求：无',
        '备注：我会提前十分钟到。',
      ], 5),
      floor(3, authors.blueFrame, '2026-05-20T11:12:00+08:00', [
        '报名组别：保障志愿',
        '集合点：东门停车区',
        '车辆状态：工具包和打气筒已准备',
        '保障需求：负责集合前胎压检查',
        '备注：可协助新同学调车。',
      ], 4),
    ],
  },
  'repair-workshop': {
    id: 'repair-workshop',
    title: '维修小课堂：补胎和链条清洁',
    board: '车协工作区',
    boardHref: getBoardPath('车协工作区'),
    kind: 'activity',
    author: authors.blueFrame,
    createdAt: '2026-05-20T12:10:00+08:00',
    replies: 9,
    views: 520,
    bookmarks: 7,
    canManageActivitySignup: true,
    canModerate: true,
    mainPost: floor(1, authors.blueFrame, '2026-05-20T12:10:00+08:00', [
      '这次小课堂主要讲补胎、检查外胎异物、链条清洁和简单润滑。工具会准备一套，大家也可以带自己的车来现场试。',
      '如果只是围观也欢迎，现场会按步骤演示，不要求有维修经验。',
    ], 17),
    floors: [
      floor(2, authors.xiaolin, '2026-05-20T13:40:00+08:00', [
        '报名组别：保障志愿',
        '集合点：车棚维修区',
        '车辆状态：带旧内胎和补胎工具',
        '保障需求：协助演示补胎流程',
        '备注：可以剪开旧内胎看漏点。',
      ], 3),
    ],
  },
  'equipment-guide': {
    id: 'equipment-guide',
    title: '新人装备避坑清单',
    board: '车友宝典',
    boardHref: getBoardPath('车友宝典'),
    kind: 'digest',
    author: authors.abei,
    createdAt: '2026-05-18T13:20:00+08:00',
    replies: 54,
    views: 4310,
    bookmarks: 32,
    pinned: true,
    digest: true,
    canModerate: true,
    mainPost: floor(1, authors.abei, '2026-05-18T13:20:00+08:00', [
      '新人装备先从安全和舒适开始，不需要一上来把所有东西买齐。头盔、前后灯、水壶架和基础补胎工具优先级最高。',
      '如果预算有限，先别急着升级码表和锁鞋，跟几次活动以后再决定也来得及。',
    ], 66, {
      attachments: [{ name: 'starter-gear-list.pdf', meta: '新人装备清单 · 348 KB', href: '#attachment-starter-gear' }],
    }),
    floors: [
      floor(2, authors.xiaobai, '2026-05-20T10:05:00+08:00', [
        '这个清单很有用，我第一次买装备时确实买了不少后来没用上的东西。',
      ], 7),
    ],
  },
};

function floor(
  floorNumber: number,
  author: ThreadAuthor,
  time: string,
  content: string[],
  legacyLikesOrOptions: number | Pick<ThreadFloor, 'attachments' | 'editedAt' | 'nestedReplies' | 'signature'> = {},
  nextOptions: Pick<ThreadFloor, 'attachments' | 'editedAt' | 'nestedReplies' | 'signature'> = {},
): ThreadFloor {
  const options = typeof legacyLikesOrOptions === 'number' ? nextOptions : legacyLikesOrOptions;

  return {
    id: `${author.id}-${floorNumber}-${time}`,
    floor: floorNumber,
    author,
    time,
    content,
    ...options,
  };
}

function buildFallbackThreadDetail(threadId: string): ThreadDetail | null {
  const match = findBoardThreadById(threadId);

  if (!match) {
    return null;
  }

  const { board, thread } = match;
  const author = getAuthorByHref(thread.author, thread.authorHref);
  const replyAuthor = getAuthorByName(thread.lastReplyBy);

  return {
    id: thread.id,
    title: thread.title,
    board: board.name,
    boardHref: getBoardPath(board.name),
    kind: thread.kind,
    author,
    createdAt: thread.createdAt,
    replies: thread.replies,
    views: thread.views,
    bookmarks: 0,
    pinned: thread.pinned,
    digest: thread.digest,
    locked: thread.locked,
    canModerate: true,
    mainPost: floor(1, author, thread.createdAt, [
      `${thread.title} 的主楼内容会在接入真实接口后从帖子正文加载。当前原型先保留标题、作者、时间和互动数据，用于验证详情页阅读结构。`,
      `这个主题来自「${board.name}」版面，后续可以在这里展示段落、图片、附件和链接。`,
    ]),
    floors: [
      floor(2, replyAuthor, thread.lastReplyAt, [
        '这条回复用于占位真实楼层内容，方便检查普通回复、楼层操作和页面纵向节奏。',
      ]),
    ],
  };
}

function getAuthorByHref(name: string, href: string): ThreadAuthor {
  return Object.values(authors).find((author) => author.href === href) ?? {
    id: name,
    name,
    href,
    rating: '★★☆',
  };
}

function getAuthorByName(name: string): ThreadAuthor {
  return Object.values(authors).find((author) => author.name === name) ?? {
    id: name,
    name,
    href: getPublicProfilePath(name),
    rating: '★★☆',
  };
}
