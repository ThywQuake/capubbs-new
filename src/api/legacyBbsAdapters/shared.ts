import { getCapubbsRemoteUrl } from '../bbsNewApiRoutes';
import { getLegacyForumBoardByBid } from '../../data/forumBoards';
import type { LegacyBbsBoardSummary, LegacyBbsThreadItem } from '../legacyBbsClient';

const BOARD_NAME_ALIASES: Record<string, string> = {
  车协工作区: '活动交流',
  行者足音: '骑行讨论',
  车友宝典: '装备经验',
  纯净水: '水区',
  竞技竞赛: '竞赛竞技',
  测试: '测试板块',
};

export function parseLegacyThreadId(threadId: string | null) {
  const match = threadId?.match(/^(\d+)-(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    bid: Number.parseInt(match[1], 10),
    tid: Number.parseInt(match[2], 10),
  };
}

export function resolveLegacyBbsBoardName(boardName: string, boards: LegacyBbsBoardSummary[]) {
  const directMatch = boards.find((board) => getBoardName(board) === boardName);

  if (directMatch) {
    return directMatch;
  }

  const alias = BOARD_NAME_ALIASES[boardName];

  return alias ? boards.find((board) => getBoardName(board) === alias) ?? null : null;
}

export function getLegacyThreadId(thread: Pick<LegacyBbsThreadItem, 'bid' | 'id' | 'tid'>) {
  return thread.id || `${thread.bid}-${thread.tid}`;
}

export function getLegacyThreadHref(thread: LegacyBbsThreadItem) {
  return `#thread-${getLegacyThreadId(thread)}`;
}

export function getThreadBoardName(thread: LegacyBbsThreadItem) {
  return getLegacyBoardDisplayName(thread.bid, thread.board);
}

export function getLegacyBoardDisplayName(
  bid: number | null | undefined,
  board: Pick<LegacyBbsBoardSummary, 'name' | 'title'> | Pick<LegacyBbsThreadItem['board'], 'name' | 'title'>,
) {
  const boardName = getLegacyForumBoardByBid(bid)?.name ?? getBoardName(board);

  return boardName || `版面 ${bid ?? ''}`.trim();
}

export function getBoardName(
  board: Pick<LegacyBbsBoardSummary, 'name' | 'title'> | Pick<LegacyBbsThreadItem['board'], 'name' | 'title'>,
) {
  return board.name || board.title || '';
}

export function htmlToContentLines(html: string) {
  const text = stripHtmlWithBlockBreaks(html);
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [''];
}

export function stripHtml(value: string) {
  return stripHtmlWithBlockBreaks(value).replace(/\s+/g, ' ').trim();
}

function stripHtmlWithBlockBreaks(value: string) {
  const withBreaks = value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');

  if (typeof window !== 'undefined' && window.DOMParser) {
    const document = new window.DOMParser().parseFromString(withBreaks, 'text/html');

    return document.body.textContent ?? '';
  }

  return withBreaks.replace(/<[^>]*>/g, '');
}

export function formatUserCenterRating(star: number) {
  const starCount = Math.max(1, Math.min(5, Math.floor(Number.isFinite(star) ? star : 1)));

  return '★'.repeat(starCount);
}

export function formatUserCenterProfileDate(value: string) {
  const match = value.trim().match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})/);

  if (!match) {
    return value;
  }

  return `${match[1]}.${padDatePart(Number(match[2]))}.${padDatePart(Number(match[3]))}`;
}

export function formatUserCenterLastSeen(value: string) {
  const match = value.trim().match(/^(?:(\d{4})[-.])?(\d{1,2})[-.](\d{1,2})(?:\s+|T)?(\d{1,2})?:?(\d{2})?/);

  if (!match) {
    return value || '-';
  }

  const [, year, month, day, hour = '00', minute = '00'] = match;
  const prefix = year && Number(year) !== new Date().getFullYear() ? `${year}.` : '';

  return `${prefix}${padDatePart(Number(month))}.${padDatePart(Number(day))} ${padDatePart(Number(hour))}:${minute}`;
}

export function formatNullableUserCenterStat(value: number | null) {
  return typeof value === 'number' ? value : '-';
}

export function formatMonthDayTime(value: string | number | null) {
  const date = parseApiDate(value) ?? new Date(new Date().getFullYear(), 11, 31, 23, 59);

  return `${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function parseApiDate(value: string | number | null) {
  if (value === null || value === '') {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return new Date(numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue);
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeAssetUrl(value: string | null) {
  const path = value?.trim();

  if (!path) {
    return undefined;
  }

  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }

  return getCapubbsRemoteUrl(path);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '附件';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}
