import type { LegacyBbsBoardSummary } from '../api/legacyBbsClient/types';

const PRIMARY_BOARD_COUNT = 9;

const forumBoardRows = [
  { bid: 1, name: '车协工作区', title: '协会事务与版务协作', moderators: ['会长团', '网站维护'] },
  { bid: 2, name: '行者足音', title: '活动发布与骑行记录', moderators: ['阿北', '小林'] },
  { bid: 3, name: '车友宝典', title: '装备维修与路线知识', moderators: ['蓝色车架', '阿北'] },
  { bid: 4, name: '纯净水', title: '日常聊天与照片分享', moderators: ['小白', '蓝色车架'] },
  { bid: 5, name: '考察与社会', title: '考察实践与观察记录', moderators: ['小林', '阿北'] },
  { bid: 6, name: '五湖四海', title: '外地路线与长途计划', moderators: ['蓝色车架', '小白'] },
  { bid: 7, name: '一技之长', title: '技能经验与工具方法', moderators: ['阿北', '网站维护'] },
  { bid: 9, name: '竞赛竞技', title: '训练比赛与队伍协作', moderators: ['小林', '蓝色车架'] },
  { bid: 28, name: '网站维护', title: '论坛反馈与迁移维护', moderators: ['网站维护', '会长团'] },
  { bid: 8, name: '历史笔记', title: '旧路线与活动档案', moderators: ['网站维护'], requiredStar: 5 },
  { bid: 10, name: '资料整理', title: '路线装备资料归档', moderators: ['蓝色车架', '网站维护'], requiredStar: 4 },
  { bid: 11, name: '回收', title: '待复核内容暂存', moderators: ['网站维护'], requiredStar: 2 },
  { bid: 12, name: '公告栏', title: '版规通知与维护公告', moderators: ['会长团', '网站维护'], requiredStar: 8 },
  { bid: 13, name: '新闻发布', title: '活动简讯与社团新闻', moderators: ['会长团', '小林'], requiredStar: 4 },
  { bid: 16, name: '剧组工作', title: '拍摄素材与剪辑协作', moderators: ['小林', '蓝色车架'], requiredStar: 5 },
  { bid: 20, name: '游记', title: '骑行手记与照片整理', moderators: ['蓝色车架', '小白'], requiredStar: 5 },
  { bid: 30, name: '测试', title: '交互边界与分页测试', moderators: ['网站维护'], requiredStar: 2 },
  { bid: 31, name: '精品集合', title: '精华技术与路线索引', moderators: ['阿北', '小林'], requiredStar: 5 },
];

export const boards = forumBoardRows.slice(0, PRIMARY_BOARD_COUNT).map((board) => board.name);

export const moreBoards = forumBoardRows.slice(PRIMARY_BOARD_COUNT).map((board) => board.name);

export const legacyForumBoards: LegacyBbsBoardSummary[] = forumBoardRows.map((board) => ({
  ...board,
  hidden: false,
  requiredStar: board.requiredStar ?? 0,
}));

export function getLegacyForumBoardByBid(bid: number | null | undefined) {
  return legacyForumBoards.find((board) => board.bid === bid) ?? null;
}

export function getLegacyForumBoardByName(boardName: string | null | undefined) {
  const normalizedBoardName = boardName?.trim();

  return normalizedBoardName
    ? legacyForumBoards.find((board) => board.name === normalizedBoardName || board.title === normalizedBoardName) ?? null
    : null;
}
