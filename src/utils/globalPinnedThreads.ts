const GLOBAL_PINNED_THREADS_STORAGE_KEY = 'capubbs-global-pinned-threads:v1:self';
const GLOBAL_PINNED_THREADS_CHANGE_EVENT = 'capubbs-global-pinned-threads-change';
const GLOBAL_PINNED_THREAD_VISITS_STORAGE_KEY = 'capubbs-global-pinned-thread-visits:v1:self';
const GLOBAL_PINNED_THREAD_VISITS_CHANGE_EVENT = 'capubbs-global-pinned-thread-visits-change';

const DEFAULT_GLOBAL_PINNED_THREAD_IDS = [
  'duanwu-activity',
  'route-change',
  'equipment-guide',
  'new-rider-routes',
];

type GlobalPinnedThreadsStorage = {
  threadIds: string[];
};

type GlobalPinnedThreadVisitsStorage = {
  hrefs: string[];
};

export function readGlobalPinnedThreadIds() {
  if (typeof window === 'undefined') {
    return [...DEFAULT_GLOBAL_PINNED_THREAD_IDS];
  }

  try {
    const rawValue = window.localStorage.getItem(GLOBAL_PINNED_THREADS_STORAGE_KEY);

    if (!rawValue) {
      return [...DEFAULT_GLOBAL_PINNED_THREAD_IDS];
    }

    return sanitizeGlobalPinnedThreadIds(JSON.parse(rawValue));
  } catch {
    return [...DEFAULT_GLOBAL_PINNED_THREAD_IDS];
  }
}

export function saveGlobalPinnedThreadIds(threadIds: string[]) {
  const nextThreadIds = dedupeThreadIds(threadIds);

  if (typeof window === 'undefined') {
    return nextThreadIds;
  }

  try {
    window.localStorage.setItem(
      GLOBAL_PINNED_THREADS_STORAGE_KEY,
      JSON.stringify({ threadIds: nextThreadIds } satisfies GlobalPinnedThreadsStorage),
    );
    window.dispatchEvent(new Event(GLOBAL_PINNED_THREADS_CHANGE_EVENT));
  } catch {
    // Global pinning is a local convenience layer; failed writes should not block moderation UI.
  }

  return nextThreadIds;
}

export function setThreadGlobalPinned(threadIds: string[], threadId: string, isPinned: boolean) {
  const normalizedThreadId = threadId.trim();

  if (!normalizedThreadId) {
    return dedupeThreadIds(threadIds);
  }

  if (!isPinned) {
    return dedupeThreadIds(threadIds).filter((currentThreadId) => currentThreadId !== normalizedThreadId);
  }

  return [normalizedThreadId, ...dedupeThreadIds(threadIds).filter((currentThreadId) => currentThreadId !== normalizedThreadId)];
}

export function reorderGlobalPinnedThreadIds(threadIds: string[], fromIndex: number, toIndex: number) {
  const nextThreadIds = dedupeThreadIds(threadIds);

  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return nextThreadIds;
  }

  const [movedThreadId] = nextThreadIds.splice(fromIndex, 1);

  if (!movedThreadId) {
    return nextThreadIds;
  }

  nextThreadIds.splice(toIndex, 0, movedThreadId);

  return nextThreadIds;
}

export function subscribeGlobalPinnedThreadIds(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === GLOBAL_PINNED_THREADS_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(GLOBAL_PINNED_THREADS_CHANGE_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(GLOBAL_PINNED_THREADS_CHANGE_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function readVisitedGlobalPinnedThreadHrefs() {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const rawValue = window.localStorage.getItem(GLOBAL_PINNED_THREAD_VISITS_STORAGE_KEY);

    if (!rawValue) {
      return new Set<string>();
    }

    return new Set(sanitizeVisitedGlobalPinnedThreadHrefs(JSON.parse(rawValue)));
  } catch {
    return new Set<string>();
  }
}

export function markGlobalPinnedThreadVisited(href: string) {
  const normalizedHref = href.trim();

  if (!normalizedHref) {
    return readVisitedGlobalPinnedThreadHrefs();
  }

  const nextVisitedHrefs = readVisitedGlobalPinnedThreadHrefs();

  if (nextVisitedHrefs.has(normalizedHref)) {
    return nextVisitedHrefs;
  }

  nextVisitedHrefs.add(normalizedHref);

  if (typeof window === 'undefined') {
    return nextVisitedHrefs;
  }

  try {
    window.localStorage.setItem(
      GLOBAL_PINNED_THREAD_VISITS_STORAGE_KEY,
      JSON.stringify({ hrefs: [...nextVisitedHrefs] } satisfies GlobalPinnedThreadVisitsStorage),
    );
    window.dispatchEvent(new Event(GLOBAL_PINNED_THREAD_VISITS_CHANGE_EVENT));
  } catch {
    // Visit state is only a local unread hint; failed writes should not block navigation.
  }

  return nextVisitedHrefs;
}

export function subscribeVisitedGlobalPinnedThreadHrefs(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === GLOBAL_PINNED_THREAD_VISITS_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(GLOBAL_PINNED_THREAD_VISITS_CHANGE_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(GLOBAL_PINNED_THREAD_VISITS_CHANGE_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function sanitizeGlobalPinnedThreadIds(value: unknown) {
  if (!isObjectRecord(value) || !Array.isArray(value.threadIds)) {
    return [...DEFAULT_GLOBAL_PINNED_THREAD_IDS];
  }

  return dedupeThreadIds(value.threadIds);
}

function sanitizeVisitedGlobalPinnedThreadHrefs(value: unknown) {
  if (!isObjectRecord(value) || !Array.isArray(value.hrefs)) {
    return [];
  }

  return dedupeThreadIds(value.hrefs);
}

function dedupeThreadIds(threadIds: unknown[]) {
  const seenThreadIds = new Set<string>();

  return threadIds.reduce<string[]>((result, threadId) => {
    if (typeof threadId !== 'string') {
      return result;
    }

    const normalizedThreadId = threadId.trim();

    if (!normalizedThreadId || seenThreadIds.has(normalizedThreadId)) {
      return result;
    }

    seenThreadIds.add(normalizedThreadId);
    result.push(normalizedThreadId);

    return result;
  }, []);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
