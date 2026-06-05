import { getCapubbsRemoteUrl } from '../bbsNewApiRoutes';
import { syncLegacyTokenCookie } from './authSession';
import { extractLegacyFloorContentHtml, extractLegacySignatureContentHtml } from './legacyFloorHtml';
import type { LegacyBbsNestedReply, LegacyRow } from './types';
import { isAbortError, normalizeLegacyIcon, toNumber } from './utils';

type LegacyContentPageRequest = {
  authorOnly?: boolean;
  bid: number;
  page: number;
  tid: number;
};

type LegacyContentPageFloorRenderData = {
  avatar?: string;
  star?: number;
  html: string;
  nestedReplies: LegacyBbsNestedReply[];
  signatureHtml?: string;
};

const contentPageHtmlCache = new Map<string, Promise<Map<number, LegacyContentPageFloorRenderData>>>();

export async function fetchOptionalLegacyContentPageFloorHtml(
  request: LegacyContentPageRequest,
  signal?: AbortSignal,
) {
  try {
    return await fetchLegacyContentPageFloorHtml(request, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return new Map<number, LegacyContentPageFloorRenderData>();
  }
}

export function mergeLegacyContentPageFloorHtml(
  rows: LegacyRow[],
  floorHtmlByPid: Map<number, LegacyContentPageFloorRenderData>,
) {
  if (floorHtmlByPid.size === 0) {
    return rows;
  }

  return rows.map((row) => {
    const pid = toNumber(row.pid);

    const floorRenderData = floorHtmlByPid.get(pid);

    if (!floorRenderData) {
      return row;
    }

    return {
      ...row,
      authorAvatar: floorRenderData.avatar,
      authorStar: floorRenderData.star,
      ishtml: 'YES',
      lzl: floorRenderData.nestedReplies.length || row.lzl,
      nestedReplies: floorRenderData.nestedReplies,
      signatureHtml: floorRenderData.signatureHtml,
      text: floorRenderData.html,
    };
  });
}

async function fetchLegacyContentPageFloorHtml(
  request: LegacyContentPageRequest,
  signal?: AbortSignal,
) {
  const cacheKey = getLegacyContentPageCacheKey(request);
  const cachedRequest = contentPageHtmlCache.get(cacheKey);

  if (cachedRequest) {
    return cachedRequest;
  }

  const nextRequest = fetchLegacyContentPageHtml(request, signal)
    .then(parseLegacyContentPageFloorHtml)
    .finally(() => {
      contentPageHtmlCache.delete(cacheKey);
    });

  contentPageHtmlCache.set(cacheKey, nextRequest);
  return nextRequest;
}

async function fetchLegacyContentPageHtml(
  { authorOnly, bid, page, tid }: LegacyContentPageRequest,
  signal?: AbortSignal,
) {
  syncLegacyTokenCookie();

  const params = new URLSearchParams({
    bid: String(bid),
    p: String(Math.max(1, Math.floor(page))),
    tid: String(tid),
  });

  if (authorOnly) {
    params.set('see_lz', '1');
  }

  const response = await fetch(getCapubbsRemoteUrl(`/bbs/content/?${params.toString()}`), {
    credentials: 'include',
    headers: {
      Accept: 'text/html',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`旧帖子页请求失败: ${response.status}`);
  }

  return response.text();
}

function parseLegacyContentPageFloorHtml(html: string) {
  const floorHtmlByPid = new Map<number, LegacyContentPageFloorRenderData>();

  if (typeof DOMParser === 'undefined' || !html.trim()) {
    return floorHtmlByPid;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const floorRows = Array.from(document.querySelectorAll('tr.floor[id]'));

  floorRows.forEach((floorRow) => {
    const pid = toNumber(floorRow.getAttribute('id'));
    const textBlock = floorRow.querySelector<HTMLElement>('.bubble.text > .textblock, .textblock');
    const avatar = normalizeLegacyContentPageAvatar(
      floorRow.querySelector<HTMLImageElement>('img.icon, .userpic img, img.lzlicon')?.getAttribute('src'),
    );
    const star = getLegacyContentPageFloorStar(floorRow);
    const fid = getLegacyContentPageFloorFid(floorRow);
    const nestedReplies = getLegacyContentPageNestedReplies(floorRow, fid);
    const signatureBlock = floorRow.querySelector<HTMLElement>('.sigblock > .sig, .sig');
    const signatureHtml = signatureBlock ? extractLegacySignatureContentHtml(signatureBlock.outerHTML) : undefined;

    if (pid <= 0 || !textBlock) {
      return;
    }

    floorHtmlByPid.set(pid, {
      avatar,
      html: extractLegacyFloorContentHtml(textBlock.outerHTML),
      nestedReplies,
      signatureHtml,
      star,
    });
  });

  return floorHtmlByPid;
}

function getLegacyContentPageFloorStar(floorRow: Element) {
  const authorBlock = floorRow.querySelector('.left, .author, .userpic') ?? floorRow;
  const starImages = Array.from(authorBlock.querySelectorAll<HTMLImageElement>('.starline img[src*="star"]'));
  const starNumbers = starImages
    .map((image) => image.getAttribute('src')?.match(/star(\d+)\.gif/i)?.[1])
    .map((value) => toNumber(value))
    .filter((value) => value > 0);

  if (starNumbers.length > 0) {
    return Math.max(...starNumbers);
  }

  const starText = floorRow.textContent?.match(/星数[：:]\s*(\d+)/)?.[1];

  return toNumber(starText);
}

function getLegacyContentPageFloorFid(floorRow: Element) {
  const replyAction = floorRow.querySelector<HTMLElement>('[onclick*="dolzlreply"], a[href*="deletelzlreply"]');
  const action = replyAction?.getAttribute('onclick') ?? replyAction?.getAttribute('href') ?? '';
  const fid = toNumber(
    action.match(/dolzlreply\(\s*\d+\s*,\s*(\d+)/)?.[1] ??
    action.match(/deletelzlreply\(\s*(\d+)/)?.[1],
  );

  return fid > 0 ? fid : 0;
}

function getLegacyContentPageNestedReplies(floorRow: Element, fid: number): LegacyBbsNestedReply[] {
  return Array.from(floorRow.querySelectorAll<HTMLElement>('.lzltable .lzlcontent'))
    .map((replyContent, index) => parseLegacyContentPageNestedReply(replyContent, fid, index))
    .filter((reply): reply is LegacyBbsNestedReply => Boolean(reply));
}

function parseLegacyContentPageNestedReply(
  replyContent: HTMLElement,
  fid: number,
  index: number,
): LegacyBbsNestedReply | null {
  const author = replyContent.querySelector<HTMLElement>('a.author')?.textContent?.trim() ?? '';
  const content = getLegacyContentPageNestedReplyText(replyContent, author);

  if (!author || !content) {
    return null;
  }

  return {
    author,
    content,
    createdAt: getLegacyContentPageNestedReplyTime(replyContent),
    fid,
    id: getLegacyContentPageNestedReplyId(replyContent, fid, index),
  };
}

function getLegacyContentPageNestedReplyText(replyContent: HTMLElement, author: string) {
  const clone = replyContent.cloneNode(true) as HTMLElement;

  clone.querySelector('.lzltime')?.remove();
  clone.querySelectorAll('a.lzlreplybt').forEach((element) => element.remove());
  clone.querySelector('a.author')?.remove();
  clone.querySelectorAll('br').forEach((element) => element.replaceWith('\n'));

  const text = (clone.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/^\s*[：:]\s*/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text || !author) {
    return text;
  }

  return ((replyContent.textContent ?? '').replace(new RegExp(`^\\s*${escapeRegExp(author)}\\s*[：:]\\s*`), '')).trim();
}

function getLegacyContentPageNestedReplyTime(replyContent: HTMLElement) {
  const timeText = replyContent.querySelector<HTMLElement>('.lzltime')?.textContent ?? '';
  const match = timeText.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?/);

  return (match?.[0] ?? timeText.replace(/\s*(回复|删除).*$/u, '')).trim();
}

function getLegacyContentPageNestedReplyId(replyContent: HTMLElement, fid: number, index: number) {
  const deleteLink = replyContent.querySelector<HTMLAnchorElement>('a[href*="deletelzlreply"]');
  const id = toNumber(deleteLink?.getAttribute('href')?.match(/deletelzlreply\(\s*\d+\s*,\s*(\d+)/)?.[1]);

  if (id > 0) {
    return id;
  }

  return -((Math.max(1, fid) * 1000) + index + 1);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeLegacyContentPageAvatar(src: string | null | undefined) {
  const value = src?.trim() ?? '';

  if (!value) {
    return undefined;
  }

  return normalizeLegacyIcon(value.replace(/^(\.\.\/)+/, '/'));
}

function getLegacyContentPageCacheKey({ authorOnly, bid, page, tid }: LegacyContentPageRequest) {
  return [
    'legacy-content-page',
    bid,
    tid,
    Math.max(1, Math.floor(page)),
    authorOnly ? 'author' : 'all',
  ].join(':');
}
