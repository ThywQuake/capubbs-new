import { useEffect, useState } from 'react';
import { legacyBbsGet, type LegacyBbsThreadFloorPreviewResponse } from '../api/legacyBbsClient';
import { getThreadNavigationTargetFromUrl } from '../utils/threadRoutes';

export type SignatureSourcePreview = {
  path: string;
  title: string;
  floor: number;
  author: string;
  excerpt: string;
};

type SignatureSourcePreviewState = {
  error: string | null;
  isLoading: boolean;
  preview: SignatureSourcePreview | null;
};

type SignatureSourceTarget = {
  bid: number;
  floor: number;
  path: string;
  tid: number;
};

export type ParsedSignatureFloorLink = {
  bid: number;
  floor: number | null;
  path: string;
  tid: number;
};

export function useSignatureSourcePreview(href: string): SignatureSourcePreviewState {
  const [state, setState] = useState<SignatureSourcePreviewState>({
    error: null,
    isLoading: false,
    preview: null,
  });

  useEffect(() => {
    const target = getSignatureSourceTarget(href);

    if (!target) {
      setState({
        error: null,
        isLoading: false,
        preview: null,
      });
      return;
    }

    const abortController = new AbortController();
    let isCurrentRequest = true;

    setState({
      error: null,
      isLoading: true,
      preview: null,
    });

    legacyBbsGet<LegacyBbsThreadFloorPreviewResponse>(
      `/threads/${target.bid}/${target.tid}/floors/${target.floor}`,
      undefined,
      abortController.signal,
    )
      .then((response) => {
        if (!isCurrentRequest) {
          return;
        }

        setState({
          error: null,
          isLoading: false,
          preview: mapSignatureSourcePreview(response, target),
        });
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest || isAbortError(error)) {
          return;
        }

        setState({
          error: '链接楼层暂时无法预览',
          isLoading: false,
          preview: null,
        });
      });

    return () => {
      isCurrentRequest = false;
      abortController.abort();
    };
  }, [href]);

  return state;
}

export function parseSignatureFloorLink(rawLink: string): ParsedSignatureFloorLink | null {
  const target = getThreadNavigationTargetFromUrl(
    normalizeSignatureFloorLinkInput(rawLink),
    getCurrentSignatureSourceUrl(),
    import.meta.env.BASE_URL,
  );

  if (!target) {
    return null;
  }

  const threadMatch = target.threadId.match(/^(\d+)-(\d+)$/);
  const floor = getFloorNumberFromHref(target.path);

  if (!threadMatch) {
    return null;
  }

  return {
    bid: Number(threadMatch[1]),
    floor,
    path: target.path,
    tid: Number(threadMatch[2]),
  };
}

function getSignatureSourceTarget(href: string): SignatureSourceTarget | null {
  const target = parseSignatureFloorLink(href);

  if (!target?.floor) {
    return null;
  }

  return {
    bid: target.bid,
    floor: target.floor,
    path: target.path,
    tid: target.tid,
  };
}

function mapSignatureSourcePreview(
  response: LegacyBbsThreadFloorPreviewResponse,
  target: SignatureSourceTarget,
): SignatureSourcePreview {
  const floor = response.floor;
  const excerpt = getSignaturePreviewExcerpt(floor.contentHtml || floor.rawText || '');

  return {
    author: floor.author || '未知用户',
    excerpt: excerpt || '这个楼层暂时没有可预览的内容。',
    floor: floor.pid || target.floor,
    path: target.path,
    title: response.threadTitle || floor.title || `帖子 ${target.bid}-${target.tid}`,
  };
}

function getSignaturePreviewExcerpt(html: string) {
  const text = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|tr|blockquote|h[1-6])>/gi, '\n');

  if (typeof window !== 'undefined' && window.DOMParser) {
    const document = new window.DOMParser().parseFromString(text, 'text/html');

    return normalizeSignaturePreviewText(document.body.textContent ?? '');
  }

  return normalizeSignaturePreviewText(text.replace(/<[^>]*>/g, ' '));
}

function normalizeSignaturePreviewText(text: string) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSignatureFloorLinkInput(value: string) {
  const link = value.trim();

  return /^[\w.-]+\.[a-z]{2,}\//i.test(link) ? `https://${link}` : link;
}

function getFloorNumberFromHref(href: string) {
  try {
    const url = new URL(href, 'https://capubbs.local/');
    const searchFloor = parsePositiveInteger(url.searchParams.get('floor') ?? url.searchParams.get('pid') ?? '');
    const hashFloor = getFloorNumberFromHash(url.hash);

    return searchFloor ?? hashFloor;
  } catch {
    return getFloorNumberFromHash(href);
  }
}

function getFloorNumberFromHash(hash: string) {
  const floorMatch = hash.match(/#?(?:floor-|pid)?(\d+)\b/i);

  return floorMatch ? parsePositiveInteger(floorMatch[1]) : null;
}

function parsePositiveInteger(value: string) {
  const number = Number.parseInt(value.trim(), 10);

  return Number.isInteger(number) && number > 0 ? number : null;
}

function getCurrentSignatureSourceUrl() {
  if (typeof window === 'undefined') {
    return 'https://test.chexie.net/bbs/content/';
  }

  return window.location.href;
}

function isAbortError(error: unknown) {
  return typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError';
}
