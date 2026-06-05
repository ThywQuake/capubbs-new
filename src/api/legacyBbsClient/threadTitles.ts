import { callOptionalLegacyAsk } from './transport';
import { stringValue, toNumber } from './utils';

type LegacyThreadTitleTarget = {
  bid: number;
  tid: number;
  title: string;
};

const legacyThreadTitleCache = new Map<string, string>();
const pendingLegacyThreadTitleRequests = new Map<string, Promise<string | null>>();

export function isProbablyTruncatedLegacyTitle(title: string) {
  return /\.\.\.\s*$/.test(title.trim());
}

export async function hydrateTruncatedLegacyThreadTitles<T extends LegacyThreadTitleTarget>(
  threads: T[],
  signal?: AbortSignal,
  options: { includeToken?: boolean } = {},
): Promise<T[]> {
  const targets = dedupeLegacyTitleTargets(threads.filter((thread) => (
    thread.bid > 0 &&
    thread.tid > 0 &&
    isProbablyTruncatedLegacyTitle(thread.title)
  )));

  if (targets.length === 0) {
    return threads;
  }

  const hydratedTitles = await Promise.all(
    targets.map(async (thread) => {
      const key = getLegacyThreadTitleKey(thread.bid, thread.tid);
      const fullTitle = await fetchLegacyThreadFullTitle(thread.bid, thread.tid, signal, options);

      return [key, fullTitle] as const;
    }),
  );
  const titleByThreadKey = new Map(hydratedTitles.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));

  return threads.map((thread) => {
    const fullTitle = titleByThreadKey.get(getLegacyThreadTitleKey(thread.bid, thread.tid));

    if (!fullTitle || !shouldUseHydratedLegacyThreadTitle(thread.title, fullTitle)) {
      return thread;
    }

    return {
      ...thread,
      title: fullTitle,
    };
  });
}

function dedupeLegacyTitleTargets<T extends LegacyThreadTitleTarget>(threads: T[]) {
  const seenKeys = new Set<string>();
  const result: T[] = [];

  threads.forEach((thread) => {
    const key = getLegacyThreadTitleKey(thread.bid, thread.tid);

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    result.push(thread);
  });

  return result;
}

async function fetchLegacyThreadFullTitle(
  bid: number,
  tid: number,
  signal?: AbortSignal,
  options: { includeToken?: boolean } = {},
) {
  const key = getLegacyThreadTitleKey(bid, tid);
  const cachedTitle = legacyThreadTitleCache.get(key);

  if (cachedTitle) {
    return cachedTitle;
  }

  const pendingRequest = pendingLegacyThreadTitleRequests.get(key);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = callOptionalLegacyAsk({ ask: 'tidinfo', bid, tid }, {
    includeToken: options.includeToken ?? true,
    signal,
  })
    .then((rows) => {
      const row = rows.find((item) => toNumber(item.bid) === bid && toNumber(item.tid) === tid);
      const title = stringValue(row?.title).trim();

      if (title) {
        legacyThreadTitleCache.set(key, title);
        return title;
      }

      return null;
    })
    .finally(() => {
      pendingLegacyThreadTitleRequests.delete(key);
    });

  pendingLegacyThreadTitleRequests.set(key, request);

  return request;
}

function shouldUseHydratedLegacyThreadTitle(currentTitle: string, fullTitle: string) {
  const normalizedCurrentTitle = currentTitle.trim();
  const normalizedFullTitle = fullTitle.trim();

  if (!normalizedFullTitle || normalizedFullTitle === normalizedCurrentTitle) {
    return false;
  }

  const truncatedPrefix = normalizedCurrentTitle.replace(/\.\.\.\s*$/, '').trim();

  return normalizedFullTitle.length > normalizedCurrentTitle.length || normalizedFullTitle.startsWith(truncatedPrefix);
}

function getLegacyThreadTitleKey(bid: number, tid: number) {
  return `${bid}-${tid}`;
}
