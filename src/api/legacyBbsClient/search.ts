import { legacyForumBoards } from '../../data/forumBoards';
import { getBoardForBid } from './mappers';
import { callOptionalLegacyAsk } from './transport';
import { hydrateTruncatedLegacyThreadTitles } from './threadTitles';
import type {
  LegacyBbsSearchItem,
  LegacyBbsSearchResponse,
  LegacyBbsSearchType,
  LegacyRequestBody,
  LegacyRow,
} from './types';
import { formatLegacyTimestamp, stringValue, stripLegacyHtml, toNumber } from './utils';

export async function fetchLegacySearch(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsSearchResponse> {
  const keyword = stringValue(params.keyword ?? params.q).trim();
  const type = getLegacySearchType(params);

  if (!keyword) {
    return {
      items: [],
      keyword,
      total: 0,
      type,
    };
  }

  const boardIds = getLegacySearchBoardIds(params);
  const rowsByBoard = await Promise.all(
    boardIds.map(async (bid) => {
      const rows = await callOptionalLegacyAsk(buildLegacySearchRequest(params, bid, keyword, type), {
        signal,
      });

      return rows.map((row) => ({ bid, row }));
    }),
  );
  const items = await hydrateTruncatedLegacyThreadTitles(dedupeLegacySearchItems(rowsByBoard
    .flat()
    .map(({ bid, row }) => mapLegacySearchItem(row, bid, keyword, type))
    .filter((item): item is LegacyBbsSearchItem => Boolean(item))), signal);

  return {
    items,
    keyword,
    total: items.length,
    type,
  };
}

function buildLegacySearchRequest(
  params: LegacyRequestBody,
  bid: number,
  keyword: string,
  type: LegacyBbsSearchType,
): LegacyRequestBody {
  const author = stringValue(params.author).trim();
  const startTime = stringValue(params.starttime ?? params.start).trim();
  const endTime = stringValue(params.endtime ?? params.end).trim();

  return {
    ask: 'search',
    bid,
    keyword,
    type,
    ...(author ? { author } : {}),
    ...(startTime ? { starttime: startTime } : {}),
    ...(endTime ? { endtime: endTime } : {}),
  };
}

function getLegacySearchType(params: LegacyRequestBody): LegacyBbsSearchType {
  const type = stringValue(params.type ?? params.field).trim();

  return type === 'post' || type === 'body' ? 'post' : 'thread';
}

function getLegacySearchBoardIds(params: LegacyRequestBody) {
  const bid = toNumber(params.bid);

  if (bid > 0) {
    return [bid];
  }

  return [-1];
}

function mapLegacySearchItem(
  row: LegacyRow,
  fallbackBid: number,
  keyword: string,
  matchType: LegacyBbsSearchType,
): LegacyBbsSearchItem | null {
  const bid = toNumber(row.bid, fallbackBid);
  const tid = toNumber(row.tid);

  if (bid <= 0 || tid <= 0) {
    return null;
  }

  const pid = Math.max(1, toNumber(row.pid, 1));
  const board = getBoardForBid(legacyForumBoards, bid);
  const excerpt = getLegacySearchExcerpt(row);
  const title = stringValue(row.title || `主题 ${tid}`).trim() || `主题 ${tid}`;

  return {
    author: stringValue(row.author || '匿名用户'),
    bid,
    board: {
      bid: board.bid,
      name: board.name,
      title: board.title,
    },
    digest: toNumber(row.extr) > 0,
    excerpt,
    favorites: toNumber(row.favorite_count ?? row.favorites),
    globalPinned: toNumber(row.global_top) > 0,
    isActivity: Boolean(row.activity_id),
    keyword,
    matchType,
    pid,
    pinned: toNumber(row.top) > 0,
    postDate: formatLegacyTimestamp(row.postdate),
    replies: toNumber(row.reply),
    tid,
    title,
    updatedAt: formatLegacyTimestamp(row.updatetime ?? row.timestamp ?? row.replytime ?? row.postdate),
    views: toNumber(row.click),
  };
}

function getLegacySearchExcerpt(row: LegacyRow) {
  const rawExcerpt = stringValue(
    row.excerpt ??
      row.summary ??
      row.content ??
      row.text ??
      row.rawText,
  );

  return stripLegacyHtml(rawExcerpt);
}

function dedupeLegacySearchItems(items: LegacyBbsSearchItem[]) {
  const seenKeys = new Set<string>();
  const result: LegacyBbsSearchItem[] = [];

  items.forEach((item) => {
    const key = item.matchType === 'post'
      ? `${item.bid}:${item.tid}:${item.pid}`
      : `${item.bid}:${item.tid}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    result.push(item);
  });

  return result;
}
