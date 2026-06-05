import { getCapubbsRemoteUrl } from '../bbsNewApiRoutes';
import { normalizeUserStarLevel } from '../../utils/userStarCache';
import { LegacyBbsError } from './errors';
import { extractLegacyFloorContentHtml, extractLegacySignatureContentHtml } from './legacyFloorHtml';
import type {
  LegacyBbsBoardSummary,
  LegacyBbsFloor,
  LegacyBbsNestedReply,
  LegacyBbsThreadItem,
  LegacyBbsViewer,
  LegacyBbsWritePostResponse,
  LegacyRow,
} from './types';
import { formatLegacyTimestamp, normalizeLegacyIcon, optionalNumber, stringValue, toNumber } from './utils';

export function mapLegacyBoard(row: LegacyRow): LegacyBbsBoardSummary {
  const bid = toNumber(row.bid);
  const name = stringValue(row.name || row.bbstitle || `版面 ${bid}`);
  const title = stringValue(row.bbstitle || row.title || name);
  const moderators = ['m1', 'm2', 'm3', 'm4']
    .map((key) => stringValue(row[key]).trim())
    .filter(Boolean);

  return {
    bid,
    hidden: toNumber(row.hide) === 1,
    moderators,
    name,
    requiredStar: toNumber(row.need),
    stats: {
      digests: optionalNumber(row.extr),
      maxTid: optionalNumber(row.max_tid ?? row.maxTid),
      todayReplies: optionalNumber(row.newreply),
      todayTopics: optionalNumber(row.newpost),
      topics: optionalNumber(row.topics),
    },
    title,
  };
}

export function mapLegacyThreadItem(
  row: LegacyRow,
  board: LegacyBbsBoardSummary,
  options: { includeFavorites?: boolean } = {},
): LegacyBbsThreadItem {
  const bid = toNumber(row.bid, board.bid);
  const tid = toNumber(row.tid);
  const timestamp = row.timestamp ?? row.replytime ?? row.updatetime ?? row.postdate;
  const postDate = formatLegacyTimestamp(row.postdate ?? timestamp);
  const updatedAt = formatLegacyTimestamp(timestamp);
  const includeFavorites = options.includeFavorites ?? true;

  return {
    activityId: optionalNumber(row.activity_id) ?? null,
    author: stringValue(row.author || '匿名用户'),
    authorStar: normalizeUserStarLevel(row.authorStar ?? row.author_star ?? row.authorstar ?? row.star),
    bid,
    board: {
      bid: board.bid,
      name: board.name,
      title: board.title,
    },
    digest: toNumber(row.extr) > 0,
    favorites: includeFavorites ? toNumber(row.favorite_count) : 0,
    globalPinned: toNumber(row.global_top) > 0,
    id: `${bid}-${tid}`,
    isActivity: Boolean(row.activity_id),
    locked: toNumber(row.locked) > 0,
    pinned: toNumber(row.top) > 0,
    postDate,
    replies: toNumber(row.reply),
    replyer: stringValue(row.replyer),
    replyerStar: normalizeUserStarLevel(row.replyerStar ?? row.replyer_star ?? row.replyerstar),
    tid,
    title: stringValue(row.title || `主题 ${tid}`),
    updatedAt,
    views: toNumber(row.click),
  };
}

export function mapLegacyFloor(row: LegacyRow): LegacyBbsFloor {
  const bid = toNumber(row.bid);
  const tid = toNumber(row.tid);
  const pid = toNumber(row.pid);
  const fid = toNumber(row.fid);
  const rawNestedReplies = Array.isArray(row.nestedReplies)
    ? row.nestedReplies.filter(isLegacyNestedReply)
    : [];
  const nestedReplies = rawNestedReplies.map((reply, index) => ({
    ...reply,
    fid: reply.fid > 0 ? reply.fid : fid,
    id: reply.id > 0 || fid <= 0 ? reply.id : -((fid * 1000) + index + 1),
  }));
  const attachIds = stringValue(row.attachs)
    .split(/\s+/)
    .map((value) => toNumber(value))
    .filter((value) => value > 0);

  return {
    attachments: attachIds.map((id) => ({
      auth: 0,
      id,
      name: `附件 ${id}`,
      path: getCapubbsRemoteUrl(`/bbs/download/?id=${id}`),
      price: 0,
      size: 0,
    })),
    author: stringValue(row.author || '匿名用户'),
    authorAvatar: normalizeLegacyIcon(stringValue(row.authorAvatar)),
    authorStar: toNumber(row.authorStar ?? row.star),
    bid,
    contentHtml: extractLegacyFloorContentHtml(stringValue(row.text)),
    rawText: stringValue(row.rawText ?? row.text),
    createdAt: formatLegacyTimestamp(row.replytime),
    fid,
    isHtml: stringValue(row.ishtml || 'YES'),
    nestedReplies,
    nestedReplyCount: Math.max(toNumber(row.lzl), nestedReplies.length),
    pid,
    signatureEnabled: toNumber(row.sig) > 0,
    signatureHtml: extractLegacySignatureContentHtml(stringValue(row.signatureHtml)),
    signatureIndex: toNumber(row.sig),
    tid,
    title: stringValue(row.title),
    updatedAt: formatLegacyTimestamp(row.updatetime),
  };
}

function isLegacyNestedReply(value: unknown): value is LegacyBbsNestedReply {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const reply = value as Partial<LegacyBbsNestedReply>;

  return typeof reply.author === 'string' && typeof reply.content === 'string';
}

export function mapLegacyNestedReply(row: LegacyRow): LegacyBbsNestedReply {
  return {
    author: stringValue(row.author || '匿名用户'),
    content: stringValue(row.text),
    createdAt: formatLegacyTimestamp(row.time),
    fid: toNumber(row.fid),
    id: toNumber(row.id),
  };
}

export function mapLegacyViewer(row: LegacyRow | undefined): LegacyBbsViewer {
  if (!row || !stringValue(row.username)) {
    return null;
  }

  return {
    avatar: normalizeLegacyIcon(stringValue(row.icon)),
    id: optionalNumber(row.userid) ?? null,
    intro: stringValue(row.intro),
    lastSeenAt: stringValue(row.lastdate),
    registeredAt: stringValue(row.regdate),
    rights: toNumber(row.rights),
    score: toNumber(row.score),
    star: toNumber(row.star),
    stats: {
      checkins: toNumber(row.sign),
      posts: toNumber(row.post),
      replies: toNumber(row.reply),
      water: toNumber(row.water),
    },
    unreadMessages: toNumber(row.newmsg),
    username: stringValue(row.username),
  };
}

export function mapMinimalViewer(username: string): LegacyBbsViewer {
  return {
    avatar: '',
    id: null,
    intro: '',
    lastSeenAt: '',
    registeredAt: '',
    rights: 0,
    score: 0,
    star: 0,
    stats: {
      checkins: 0,
      posts: 0,
      replies: 0,
      water: 0,
    },
    unreadMessages: 0,
    username,
  };
}

export function isSameLegacyUsername(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function getBoardForBid(boards: LegacyBbsBoardSummary[], bid: number) {
  return boards.find((board) => board.bid === bid) ?? {
    bid,
    hidden: false,
    moderators: [],
    name: `版面 ${bid}`,
    requiredStar: 0,
    title: `版面 ${bid}`,
  };
}

export function isLegacyThreadRow(row: LegacyRow) {
  return toNumber(row.bid) > 0 && toNumber(row.tid) > 0 && stringValue(row.title).trim().length > 0;
}

export function mapLegacyWritePostResponse(
  row: LegacyRow | undefined,
  fallbackBid: number,
  fallbackTid = 0,
  fallbackPid = 1,
): LegacyBbsWritePostResponse {
  const bid = toNumber(row?.bid, fallbackBid);
  const tid = toNumber(row?.tid, fallbackTid);
  const pid = toNumber(row?.pid, fallbackPid);
  const href = `/threads/${bid}-${tid}${pid > 1 ? `#floor-${pid}` : ''}`;

  if (bid <= 0 || tid <= 0 || pid <= 0) {
    throw new LegacyBbsError('写入成功但返回编号无效', 500, 500);
  }

  return {
    bid,
    href,
    pid,
    threadId: `${bid}-${tid}`,
    tid,
  };
}
