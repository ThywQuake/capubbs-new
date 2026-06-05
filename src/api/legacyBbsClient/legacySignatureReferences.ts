import { mapLegacyFloor } from './mappers';
import { callLegacyAsk } from './transport';
import type { LegacyBbsFloor, LegacyRow } from './types';
import { toNumber } from './utils';

const LEGACY_THREAD_CONTENT_PAGE_SIZE = 12;
const LEGACY_REFERENCE_SIGNATURE_HOSTS = new Set(['capubbs.local', 'chexie.net', 'www.chexie.net', 'test.chexie.net']);
const legacyReferencedFloorCache = new Map<string, Promise<LegacyBbsFloor>>();

type LegacyReferencedFloorTarget = {
  bid: number;
  page: number;
  pid: number;
  tid: number;
};

export async function fetchLegacyReferencedFloorFrameHtml(rawUrl: string, signal?: AbortSignal) {
  const target = parseLegacyReferencedFloorUrl(rawUrl);

  if (!target) {
    throw new Error('无法识别旧签名档楼层链接');
  }

  const floor = await fetchLegacyReferencedFloor(target, signal);
  const pageFloorId = getLegacyPageFloorElementId(target.page, target.pid);
  const contentHtml = floor.contentHtml.trim();

  return [
    `<div class="floor" id="${floor.pid}" data-bid="${floor.bid}" data-tid="${floor.tid}" data-pid="${floor.pid}" data-fid="${floor.fid}">`,
    `<div class="textblock" id="${pageFloorId}" data-fid="${floor.fid}" style="line-height:160% !important">${contentHtml}</div>`,
    '</div>',
  ].join('');
}

async function fetchLegacyReferencedFloor(
  { bid, pid, tid }: LegacyReferencedFloorTarget,
  signal?: AbortSignal,
) {
  const cacheKey = `${bid}:${tid}:${pid}`;
  const cachedFloor = legacyReferencedFloorCache.get(cacheKey);

  if (cachedFloor) {
    return cachedFloor;
  }

  const request = callLegacyAsk({ bid, pid, tid }, signal)
    .then((rows) => {
      const row = rows.find((candidate) => toNumber(candidate.pid) === pid) ?? rows[0];

      return row ? mapLegacyFloor(row as LegacyRow) : mapLegacyFloor({ bid, tid, pid });
    })
    .catch((error: unknown) => {
      legacyReferencedFloorCache.delete(cacheKey);
      throw error;
    });

  legacyReferencedFloorCache.set(cacheKey, request);
  return request;
}

function parseLegacyReferencedFloorUrl(rawUrl: string): LegacyReferencedFloorTarget | null {
  try {
    const url = new URL(rawUrl.replace(/&amp;/gi, '&'), 'https://capubbs.local/bbs/content/');
    const host = url.hostname.toLowerCase();

    if (!LEGACY_REFERENCE_SIGNATURE_HOSTS.has(host) || !isLegacyContentPath(url.pathname)) {
      return null;
    }

    const bid = toNumber(url.searchParams.get('bid'));
    const tid = toNumber(url.searchParams.get('tid'));
    const pid = toNumber(url.hash.replace(/^#(?:pid)?/i, ''));
    const rawPage = toNumber(url.searchParams.get('p') ?? url.searchParams.get('page'));
    const page = Math.max(1, Math.floor(
      rawPage > 0 ? rawPage : Math.ceil(pid / LEGACY_THREAD_CONTENT_PAGE_SIZE),
    ));

    if (bid <= 0 || tid <= 0 || pid <= 0) {
      return null;
    }

    return {
      bid,
      page,
      pid,
      tid,
    };
  } catch {
    return null;
  }
}

function getLegacyPageFloorElementId(page: number, pid: number) {
  const pageIndex = pid - ((Math.max(1, Math.floor(page)) - 1) * LEGACY_THREAD_CONTENT_PAGE_SIZE) - 1;

  return `floor${Math.max(0, pageIndex)}`;
}

function isLegacyContentPath(pathname: string) {
  return /^\/bbs\/content\/?$/i.test(pathname) || /^\/content\/?$/i.test(pathname);
}
