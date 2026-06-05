const THREAD_ROUTE_PREFIX = '/threads/';
const THREAD_HASH_PREFIX = '#thread-';
const KNOWN_MOUNT_PREFIXES = ['/bbs-new', '/capubbs-new'];
const LOCAL_URL_ORIGIN = 'https://capubbs.local';
const LEGACY_CGI_BOARD_IDS: Record<string, number> = {
  acad: 5,
  act: 1,
  asso: 6,
  bike: 3,
  capu: 2,
  race: 9,
  skill: 7,
  water: 4,
};

export type ThreadNavigationTarget = {
  path: string;
  threadId: string;
};

export type ThreadEditTarget = {
  floorNumber: number;
  threadId: string;
};

export type ThreadActivityAdminTarget = {
  threadId: string;
};

export function getThreadPath(threadId: string) {
  return `${THREAD_ROUTE_PREFIX}${encodeURIComponent(normalizeThreadId(threadId))}`;
}

export function getThreadFloorPath(threadId: string, floorNumber: number) {
  return `${getThreadPath(threadId)}#floor-${floorNumber}`;
}

export function getThreadFloorEditPath(threadId: string, floorNumber: number) {
  const normalizedFloorNumber = normalizeFloorNumber(floorNumber);
  const threadPath = getThreadPath(threadId);

  return normalizedFloorNumber === 1 ? `${threadPath}/edit` : `${threadPath}/floors/${normalizedFloorNumber}/edit`;
}

export function getThreadActivityAdminPath(threadId: string) {
  return `${getThreadPath(threadId)}/activity-admin`;
}

export function getThreadIdFromPath(pathname: string) {
  if (!pathname.startsWith(THREAD_ROUTE_PREFIX)) {
    return null;
  }

  const encodedThreadId = pathname.slice(THREAD_ROUTE_PREFIX.length).split(/[/?#]/)[0];

  if (!encodedThreadId) {
    return null;
  }

  try {
    return normalizeThreadId(decodeURIComponent(encodedThreadId));
  } catch {
    return null;
  }
}

export function getThreadEditTargetFromPath(pathname: string): ThreadEditTarget | null {
  const threadId = getThreadIdFromPath(pathname);

  if (!threadId) {
    return null;
  }

  const suffix = getThreadSuffixFromPath(pathname);

  if (suffix === '/edit' || suffix === '/edit/') {
    return {
      floorNumber: 1,
      threadId,
    };
  }

  const floorEditMatch = suffix.match(/^\/floors\/(\d+)\/edit\/?$/);

  if (!floorEditMatch) {
    return null;
  }

  return {
    floorNumber: normalizeFloorNumber(Number(floorEditMatch[1])),
    threadId,
  };
}

export function getThreadActivityAdminTargetFromPath(pathname: string): ThreadActivityAdminTarget | null {
  const threadId = getThreadIdFromPath(pathname);

  if (!threadId) {
    return null;
  }

  const suffix = getThreadSuffixFromPath(pathname);

  return suffix === '/activity-admin' || suffix === '/activity-admin/' ? { threadId } : null;
}

export function getThreadPathFromHref(href: string) {
  const threadId = getThreadIdFromHref(href);

  return threadId ? `${getThreadPath(threadId)}${getThreadSuffixFromHref(href)}` : href;
}

export function getThreadNavigationTargetFromUrl(
  rawUrl: string,
  currentUrl: string,
  routerBasePath = '',
): ThreadNavigationTarget | null {
  const href = rawUrl.trim();

  if (!href) {
    return null;
  }

  if (href.startsWith(THREAD_HASH_PREFIX)) {
    const threadId = normalizeThreadId(href.slice(THREAD_HASH_PREFIX.length).split(/[?#]/)[0]);

    return threadId ? { path: getThreadPath(threadId), threadId } : null;
  }

  const isRelativeHref = isRelativeNavigationHref(href);
  let url: URL;

  try {
    url = new URL(href, getSafeBaseUrl(currentUrl));
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  if (!isRelativeHref && !isTrustedThreadNavigationUrl(url, currentUrl)) {
    return null;
  }

  const pathname = stripKnownMountPrefix(stripRouterBasePath(normalizePathname(url.pathname), routerBasePath));
  const threadRouteTarget = getThreadRouteNavigationTarget(pathname, url.search, url.hash);

  if (threadRouteTarget) {
    return threadRouteTarget;
  }

  const legacyCgiThreadTarget = getLegacyCgiThreadNavigationTarget(pathname, url.searchParams, url.hash);

  if (legacyCgiThreadTarget) {
    return legacyCgiThreadTarget;
  }

  return getLegacyThreadNavigationTarget(pathname, url.searchParams, url.hash);
}

function getThreadIdFromHref(href: string) {
  if (href.startsWith(THREAD_HASH_PREFIX)) {
    return href.slice(THREAD_HASH_PREFIX.length);
  }

  if (href.startsWith(THREAD_ROUTE_PREFIX)) {
    return getThreadIdFromPath(href);
  }

  return null;
}

function normalizeThreadId(threadId: string) {
  return threadId.trim().replace(/^thread-/, '');
}

function normalizeFloorNumber(floorNumber: number) {
  return Math.max(1, Math.floor(Number.isFinite(floorNumber) ? floorNumber : 1));
}

function isRelativeNavigationHref(href: string) {
  return !href.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
}

function isTrustedThreadNavigationUrl(url: URL, currentUrl: string) {
  try {
    if (url.origin === new URL(currentUrl, LOCAL_URL_ORIGIN).origin) {
      return true;
    }
  } catch {
    return false;
  }

  return url.hostname === 'chexie.net' || url.hostname.endsWith('.chexie.net');
}

function getThreadRouteNavigationTarget(pathname: string, search: string, hash: string): ThreadNavigationTarget | null {
  const threadId = getThreadIdFromPath(pathname);

  if (!threadId) {
    return null;
  }

  const suffix = getThreadSuffixFromPath(pathname);

  if (suffix && suffix !== '/') {
    return null;
  }

  const normalizedHash = normalizeThreadRouteHash(hash);

  return {
    path: `${getThreadPath(threadId)}${search}${normalizedHash}`,
    threadId,
  };
}

function getLegacyThreadNavigationTarget(
  pathname: string,
  searchParams: URLSearchParams,
  hash: string,
): ThreadNavigationTarget | null {
  if (!isLegacyThreadPath(pathname)) {
    return null;
  }

  const bid = normalizePositiveInteger(searchParams.get('bid'));
  const tid = normalizePositiveInteger(searchParams.get('tid'));

  if (!bid || !tid) {
    return null;
  }

  const threadId = `${bid}-${tid}`;
  const floor = normalizePositiveInteger(searchParams.get('pid')) ??
    normalizePositiveInteger(searchParams.get('floor')) ??
    getLegacyFloorFromHash(hash);
  const page = normalizePositiveInteger(searchParams.get('page')) ?? normalizePositiveInteger(searchParams.get('p'));
  const params = new URLSearchParams();

  if (searchParams.get('see_lz')) {
    params.set('authorOnly', '1');
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  if (floor) {
    params.set('floor', String(floor));
  }

  const query = params.toString();

  return {
    path: `${getThreadPath(threadId)}${query ? `?${query}` : ''}${floor ? `#floor-${floor}` : ''}`,
    threadId,
  };
}

function getLegacyCgiThreadNavigationTarget(
  pathname: string,
  searchParams: URLSearchParams,
  hash: string,
): ThreadNavigationTarget | null {
  if (pathname !== '/cgi-bin/bbs.pl') {
    return null;
  }

  const bid = getLegacyCgiBoardId(searchParams);
  const tid = getLegacyCgiThreadId(searchParams.get('see'));

  if (!bid || !tid) {
    return null;
  }

  const threadId = `${bid}-${tid}`;
  const page = normalizePositiveInteger(searchParams.get('p'));
  const floor = getLegacyFloorFromHash(hash);
  const params = new URLSearchParams();

  if (page && page > 1) {
    params.set('page', String(page));
  }

  if (floor) {
    params.set('floor', String(floor));
  }

  const query = params.toString();

  return {
    path: `${getThreadPath(threadId)}${query ? `?${query}` : ''}${floor ? `#floor-${floor}` : ''}`,
    threadId,
  };
}

function normalizeThreadRouteHash(hash: string) {
  const floor = getLegacyFloorFromHash(hash);

  return floor ? `#floor-${floor}` : hash;
}

function isLegacyThreadPath(pathname: string) {
  return pathname === '/thread.php' || pathname === '/bbs/content' || pathname === '/bbs/content/' || pathname === '/bbs/content/index.php';
}

function stripKnownMountPrefix(pathname: string) {
  for (const prefix of KNOWN_MOUNT_PREFIXES) {
    if (pathname === prefix) {
      return '/';
    }

    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || '/';
    }
  }

  return pathname;
}

function stripRouterBasePath(pathname: string, routerBasePath: string) {
  const normalizedBasePath = normalizeRouterBasePath(routerBasePath);

  if (!normalizedBasePath) {
    return pathname;
  }

  if (pathname === normalizedBasePath) {
    return '/';
  }

  if (pathname.startsWith(`${normalizedBasePath}/`)) {
    return pathname.slice(normalizedBasePath.length) || '/';
  }

  return pathname;
}

function normalizeRouterBasePath(routerBasePath: string) {
  try {
    const pathname = new URL(routerBasePath || '/', LOCAL_URL_ORIGIN).pathname;
    const normalizedPathname = normalizePathname(pathname);

    return normalizedPathname === '/' ? '' : normalizedPathname;
  } catch {
    return '';
  }
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname || '/';
}

function normalizePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) && number > 0 ? number : null;
}

function getLegacyCgiBoardId(searchParams: URLSearchParams) {
  const explicitBoardId = normalizePositiveInteger(searchParams.get('b'));

  if (explicitBoardId) {
    return explicitBoardId;
  }

  const boardKey = searchParams.get('id')?.trim() ?? '';

  return boardKey ? LEGACY_CGI_BOARD_IDS[boardKey] ?? null : null;
}

function getLegacyCgiThreadId(value: string | null) {
  const see = value?.trim() ?? '';

  if (!/^[a-z]{4}$/.test(see)) {
    return null;
  }

  return 1 +
    getLegacyCgiLetterOffset(see, 0) * 26 * 26 * 26 +
    getLegacyCgiLetterOffset(see, 1) * 26 * 26 +
    getLegacyCgiLetterOffset(see, 2) * 26 +
    getLegacyCgiLetterOffset(see, 3);
}

function getLegacyCgiLetterOffset(value: string, index: number) {
  return value.charCodeAt(index) - 'a'.charCodeAt(0);
}

function getLegacyFloorFromHash(hash: string) {
  const target = safeDecodeURIComponent(hash.replace(/^#/, '').trim());

  if (!target) {
    return null;
  }

  const floorMatch = target.match(/^(?:floor-|pid)?(\d+)$/);

  return floorMatch ? normalizePositiveInteger(floorMatch[1]) : null;
}

function getSafeBaseUrl(currentUrl: string) {
  try {
    return new URL(currentUrl, LOCAL_URL_ORIGIN).href;
  } catch {
    return `${LOCAL_URL_ORIGIN}/`;
  }
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getThreadSuffixFromPath(pathname: string) {
  const encodedThreadId = pathname.slice(THREAD_ROUTE_PREFIX.length).split(/[/?#]/)[0];
  const suffixStart = THREAD_ROUTE_PREFIX.length + encodedThreadId.length;

  return pathname.slice(suffixStart).split(/[?#]/)[0];
}

function getThreadSuffixFromHref(href: string) {
  if (href.startsWith(THREAD_HASH_PREFIX)) {
    return '';
  }

  const encodedThreadId = href.slice(THREAD_ROUTE_PREFIX.length).split(/[/?#]/)[0];

  return href.slice(THREAD_ROUTE_PREFIX.length + encodedThreadId.length);
}
