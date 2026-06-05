import { getSafeAuthReturnTo } from './authRoutes';
import { getBoardPath } from './boardRoutes';
import { getThreadFloorEditPath, getThreadPath } from './threadRoutes';
import { getPublicProfilePath } from './userRoutes';

type LegacyRouteCompatInput = {
  hash: string;
  isBoardLookupPending: boolean;
  pathname: string;
  resolveBoardNameById: (bid: number) => string | null;
  search: string;
};

type LegacyRouteCompatResult =
  | {
      path: string;
      status: 'hardRedirect';
    }
  | {
      path: string;
      status: 'redirect';
    }
  | {
      status: 'wait';
    };

const LEGACY_HANDOFF_PARAM = 'legacyPath';
const KNOWN_MOUNT_PREFIXES = ['/bbs-new', '/capubbs-new'];
const LEGACY_HANDOFF_ROOT_PATHS = new Set(['/', '/index.html', '/index.php']);
const LEGACY_HANDOFF_WRAPPER_PATHS = new Set([
  '/',
  '/activity-post.php',
  '/board.php',
  '/editpid.php',
  '/index.php',
  '/login.php',
  '/profile.php',
  '/register.php',
  '/search.php',
  '/stats.php',
  '/thread.php',
  '/user-center.php',
]);
const WRITE_OR_ASSET_PATHS = [
  '/bbs/attach',
  '/bbs/boardcast/action.php',
  '/bbs/delete',
  '/bbs/delattach',
  '/bbs/deletelzl',
  '/bbs/download',
  '/bbs/editpid/action.php',
  '/bbs/favorite/action.php',
  '/bbs/home/s_action.php',
  '/bbs/logout',
  '/bbs/message',
  '/bbs/move',
  '/bbs/post',
  '/bbs/postlzl',
  '/bbs/register/action.php',
  '/bbs/register/userexists',
  '/bbs/settid',
  '/bbs/utils/icon_upload',
  '/bbs/utils/icon_upload.php',
  '/bbs/content/floor.php',
  '/bbs/content/test.php',
  '/bbs/content/utils/activity.php',
  '/bbs/content/utils/activityService.php',
  '/bbs/content/utils/getExcel.php',
  '/bbs/content/utils/postActivity.php',
  '/bbs/attachment',
  '/bbs/assets',
  '/bbs/images',
  '/bbs/lib',
  '/bbs/lib/ajax_trash.php',
  '/bbs/lib/mainfunc.new.php',
  '/bbs/lib/mainfunc.php',
  '/bbs/login/action.php',
];
const LEGACY_ADMIN_PATHS_WITHOUT_NEW_PAGE = [
  '/bbs/boardcast',
  '/bbs/edituser',
  '/bbs/manage/trash',
  '/bbs/manage/reset_password',
];
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

export function getLegacyRouteCompatPath(input: LegacyRouteCompatInput): LegacyRouteCompatResult | null {
  const location = normalizeLegacyLocation(input.pathname, input.search, input.hash);
  const pathname = normalizePathname(location.pathname);
  const searchParams = new URLSearchParams(location.search);

  if (isLegacyCgiBbsPath(pathname)) {
    return getLegacyCgiBbsCompatPath(pathname, searchParams, location);
  }

  if (isLegacyCgiPreservedPath(pathname)) {
    return hardRedirect(location);
  }

  if (isPreservedLegacyBackendPath(pathname) || isLegacyStaticAssetPath(pathname)) {
    return hardRedirect(location);
  }

  if (isLegacyHomePath(pathname)) {
    return redirectIfChanged('/', location);
  }

  if (isLegacyBoardPath(pathname)) {
    return getLegacyBoardCompatPath(searchParams, input, location);
  }

  if (isLegacyThreadPath(pathname)) {
    if (searchParams.has('id') || searchParams.has('see')) {
      return getLegacyCgiBbsCompatPath('/cgi-bin/bbs.pl', searchParams, location);
    }

    return getLegacyThreadCompatPath(searchParams, location);
  }

  if (isLegacyProfilePath(pathname)) {
    const userName = normalizeTextParam(searchParams.get('name'));

    return redirectIfChanged(getPublicProfilePath(userName), location);
  }

  if (isLegacySearchPath(pathname)) {
    return getLegacySearchCompatPath(searchParams, input, location);
  }

  if (pathname === '/login' && searchParams.has('from')) {
    return getLegacyAuthCompatPath('/login', searchParams, input, location);
  }

  if (isLegacyLoginPath(pathname)) {
    return getLegacyAuthCompatPath('/login', searchParams, input, location);
  }

  if (isLegacyRegisterPath(pathname)) {
    return redirectIfChanged('/register', location);
  }

  if (isLegacyUserCenterPath(pathname)) {
    return getLegacyUserCenterCompatPath(searchParams, location);
  }

  if (isLegacyUserCenterInformationPath(pathname)) {
    return redirectIfChanged('/user-center', location);
  }

  if (isLegacyUserCenterMessagesPath(pathname)) {
    return redirectIfChanged('/user-center?open=messages', location);
  }

  if (isLegacyUserCenterSecurityPath(pathname)) {
    return redirectIfChanged('/user-center?dialog=security', location);
  }

  if (isLegacyFavoritePath(pathname)) {
    if (searchParams.has('action')) {
      return hardRedirect(location);
    }

    return redirectIfChanged('/user-center?tab=bookmarks', location);
  }

  if (isLegacyEditPostPath(pathname)) {
    return getLegacyEditPostCompatPath(searchParams, location);
  }

  if (isLegacyActivityPostPath(pathname)) {
    return redirectIfChanged(`${getBoardPath('活动交流')}/new?type=activity`, location);
  }

  if (isLegacyOnlinePath(pathname)) {
    const params = new URLSearchParams({ panel: 'online' });
    appendIfPresent(params, 'bid', searchParams.get('bid'));

    return redirectIfChanged(`/stats?${params.toString()}`, location);
  }

  if (isLegacySignPath(pathname)) {
    const params = new URLSearchParams({ panel: 'checkins' });
    appendIfPresent(params, 'date', searchParams.get('view'));

    return redirectIfChanged(`/stats?${params.toString()}`, location);
  }

  if (isLegacyStatsWrapperPath(pathname)) {
    return getLegacyStatsCompatPath(searchParams, location);
  }

  return null;
}

function getLegacyCgiBbsCompatPath(
  pathname: string,
  searchParams: URLSearchParams,
  location: NormalizedLegacyLocation,
) {
  if (pathname === '/cgi-bin/main.pl') {
    return redirectIfChanged('/', location);
  }

  const bid = getLegacyCgiBoardId(searchParams);
  const tid = getLegacyCgiThreadId(searchParams.get('see'));

  if (!bid || !tid) {
    return redirectIfChanged('/', location);
  }

  const params = new URLSearchParams({
    bid: String(bid),
    tid: String(tid),
  });
  appendIfPresent(params, 'p', searchParams.get('p'));

  return getLegacyThreadCompatPath(params, location);
}

function getLegacyBoardCompatPath(
  searchParams: URLSearchParams,
  input: LegacyRouteCompatInput,
  location: NormalizedLegacyLocation,
) {
  const bid = normalizePositiveInteger(searchParams.get('bid')) ?? 1;
  const boardName = input.resolveBoardNameById(bid);

  if (!boardName) {
    return input.isBoardLookupPending ? { status: 'wait' as const } : null;
  }

  const params = new URLSearchParams();
  const page = normalizePositiveInteger(searchParams.get('p'));

  if (page && page > 1) {
    params.set('page', String(page));
  }

  if (searchParams.get('extr') === '1') {
    params.set('filter', 'digest');
  }

  const query = params.toString();
  const targetPath = `${getBoardPath(boardName)}${query ? `?${query}` : ''}`;

  return redirectIfChanged(targetPath, location);
}

function getLegacyThreadCompatPath(searchParams: URLSearchParams, location: NormalizedLegacyLocation) {
  const bid = normalizePositiveInteger(searchParams.get('bid')) ?? 1;
  const tid = normalizePositiveInteger(searchParams.get('tid')) ?? 1;
  const threadId = `${bid}-${tid}`;
  const floorFromHash = getLegacyFloorFromHash(location.hash);
  const page = normalizePositiveInteger(searchParams.get('p'));
  const params = new URLSearchParams();

  if (searchParams.get('see_lz')) {
    params.set('authorOnly', '1');
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  if (floorFromHash) {
    params.set('floor', String(floorFromHash));
  }

  const query = params.toString();
  const targetPath = `${getThreadPath(threadId)}${query ? `?${query}` : ''}${floorFromHash ? `#floor-${floorFromHash}` : ''}`;

  return redirectIfChanged(targetPath, location);
}

function getLegacySearchCompatPath(
  searchParams: URLSearchParams,
  input: LegacyRouteCompatInput,
  location: NormalizedLegacyLocation,
) {
  const params = new URLSearchParams();
  const keyword = normalizeTextParam(searchParams.get('keyword') ?? searchParams.get('q'));
  const type = searchParams.get('type');
  const bid = normalizePositiveInteger(searchParams.get('bid'));

  if (keyword) {
    params.set('q', keyword);
  }

  if (type === 'post') {
    params.set('field', 'body');
  } else if (type === 'thread') {
    params.set('field', 'title');
  }

  if (bid && bid > 0) {
    const boardName = input.resolveBoardNameById(bid);

    if (!boardName) {
      return input.isBoardLookupPending ? { status: 'wait' as const } : null;
    }

    params.set('board', boardName);
  }

  appendIfPresent(params, 'author', searchParams.get('author'));
  appendIfPresent(params, 'start', searchParams.get('starttime'));
  appendIfPresent(params, 'end', searchParams.get('endtime'));

  const query = params.toString();

  return redirectIfChanged(`/search${query ? `?${query}` : ''}`, location);
}

function getLegacyAuthCompatPath(
  authPath: '/login' | '/register',
  searchParams: URLSearchParams,
  input: LegacyRouteCompatInput,
  location: NormalizedLegacyLocation,
): LegacyRouteCompatResult | null {
  const rawReturnTo = searchParams.get('returnTo') ?? searchParams.get('from');
  const normalizedReturnTo = getLegacyReturnTo(rawReturnTo, input);

  if (normalizedReturnTo === null) {
    return { status: 'wait' };
  }

  const safeReturnTo = getSafeAuthReturnTo(normalizedReturnTo);
  const targetPath = safeReturnTo === '/' ? authPath : `${authPath}?returnTo=${encodeURIComponent(safeReturnTo)}`;

  return redirectIfChanged(targetPath, location);
}

function getLegacyUserCenterCompatPath(searchParams: URLSearchParams, location: NormalizedLegacyLocation) {
  const pos = searchParams.get('pos');

  if (pos === 'message' || searchParams.get('open') === 'messages') {
    return redirectIfChanged(withQuery('/user-center', { open: 'messages' }), location);
  }

  if (pos === 'security' || searchParams.get('dialog') === 'security') {
    return redirectIfChanged(withQuery('/user-center', { dialog: 'security' }), location);
  }

  if (searchParams.get('tab')) {
    return redirectIfChanged(withQuery('/user-center', { tab: searchParams.get('tab') }), location);
  }

  return redirectIfChanged('/user-center', location);
}

function getLegacyStatsCompatPath(searchParams: URLSearchParams, location: NormalizedLegacyLocation) {
  const panel = searchParams.get('panel') === 'checkins' ? 'checkins' : 'online';
  const params = new URLSearchParams({ panel });

  appendIfPresent(params, 'bid', searchParams.get('bid'));
  appendIfPresent(params, 'date', searchParams.get('date') ?? searchParams.get('view'));

  return redirectIfChanged(`/stats?${params.toString()}`, location);
}

function getLegacyEditPostCompatPath(searchParams: URLSearchParams, location: NormalizedLegacyLocation) {
  const bid = normalizePositiveInteger(searchParams.get('bid')) ?? 1;
  const tid = normalizePositiveInteger(searchParams.get('tid')) ?? 1;
  const pid = normalizePositiveInteger(searchParams.get('pid')) ?? 1;

  return redirectIfChanged(getThreadFloorEditPath(`${bid}-${tid}`, pid), location);
}

function getLegacyReturnTo(rawReturnTo: string | null, input: LegacyRouteCompatInput) {
  if (!rawReturnTo) {
    return '/';
  }

  const decodedReturnTo = safeDecodeURIComponent(rawReturnTo);

  try {
    const returnToUrl = new URL(decodedReturnTo, 'http://capubbs.local');
    const normalizedReturnTo = getLegacyRouteCompatPath({
      ...input,
      hash: returnToUrl.hash,
      pathname: returnToUrl.pathname,
      search: returnToUrl.search,
    });

    if (normalizedReturnTo?.status === 'wait') {
      return null;
    }

    if (normalizedReturnTo?.status === 'hardRedirect' || normalizedReturnTo?.status === 'redirect') {
      return normalizedReturnTo.path;
    }
  } catch {
    return '/';
  }

  return decodedReturnTo;
}

type NormalizedLegacyLocation = {
  fullPath: string;
  hash: string;
  pathname: string;
  search: string;
};

function normalizeLegacyLocation(pathname: string, search: string, hash: string): NormalizedLegacyLocation {
  const normalizedPathname = stripKnownMountPrefix(pathname || '/');
  const normalizedSearch = search && !search.startsWith('?') ? `?${search}` : search;
  const normalizedHash = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  const handoffLocation = getLegacyHandoffLocation(normalizedPathname, normalizedSearch, normalizedHash);

  if (handoffLocation) {
    return handoffLocation;
  }

  return {
    fullPath: `${normalizedPathname}${normalizedSearch}${normalizedHash}`,
    hash: normalizedHash,
    pathname: normalizedPathname,
    search: normalizedSearch,
  };
}

function getLegacyHandoffLocation(pathname: string, search: string, hash: string): NormalizedLegacyLocation | null {
  if (!LEGACY_HANDOFF_ROOT_PATHS.has(pathname)) {
    return null;
  }

  const searchParams = new URLSearchParams(search);
  const rawLegacyPath = searchParams.get(LEGACY_HANDOFF_PARAM);

  if (!rawLegacyPath) {
    return null;
  }

  searchParams.delete(LEGACY_HANDOFF_PARAM);

  let legacyUrl: URL;

  try {
    legacyUrl = new URL(rawLegacyPath, 'http://capubbs.local');
  } catch {
    return null;
  }

  if (legacyUrl.origin !== 'http://capubbs.local' || !isSafeLegacyHandoffPath(legacyUrl.pathname)) {
    return null;
  }

  const legacySearchParams = new URLSearchParams(legacyUrl.search);

  for (const [key, value] of searchParams) {
    legacySearchParams.append(key, value);
  }

  const legacyPathname = normalizePathname(legacyUrl.pathname);
  const legacySearch = legacySearchParams.toString() ? `?${legacySearchParams.toString()}` : '';
  const legacyHash = legacyUrl.hash || hash;

  return {
    fullPath: `${legacyPathname}${legacySearch}${legacyHash}`,
    hash: legacyHash,
    pathname: legacyPathname,
    search: legacySearch,
  };
}

function isSafeLegacyHandoffPath(pathname: string) {
  return (
    pathname === '/bbs-new/index.php' ||
    pathname.startsWith('/bbs/') ||
    pathname === '/bbs' ||
    pathname.startsWith('/cgi-bin/') ||
    LEGACY_HANDOFF_WRAPPER_PATHS.has(pathname)
  );
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

function redirectIfChanged(path: string, location: NormalizedLegacyLocation): LegacyRouteCompatResult | null {
  return path === location.fullPath ? null : { path, status: 'redirect' };
}

function hardRedirect(location: NormalizedLegacyLocation): LegacyRouteCompatResult {
  return {
    path: location.fullPath,
    status: 'hardRedirect',
  };
}

function isPreservedLegacyBackendPath(pathname: string) {
  const isWriteOrAssetPath = WRITE_OR_ASSET_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAdminIndexWithoutNewPage = pathname === '/bbs/manage' || pathname === '/bbs/manage/index.php';
  const isAdminPathWithoutNewPage = LEGACY_ADMIN_PATHS_WITHOUT_NEW_PAGE.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return isWriteOrAssetPath || isAdminIndexWithoutNewPage || isAdminPathWithoutNewPage;
}

function isLegacyCgiBbsPath(pathname: string) {
  return pathname === '/cgi-bin/bbs.pl' || pathname === '/cgi-bin/main.pl';
}

function isLegacyCgiPreservedPath(pathname: string) {
  return pathname === '/cgi-bin/bullxml.pl';
}

function isLegacyStaticAssetPath(pathname: string) {
  return /^\/bbs\/.+\.(?:css|gif|ico|jpe?g|js|png|svg|webp)$/i.test(pathname);
}

function isLegacyHomePath(pathname: string) {
  return ['/', '/index.php', '/bbs', '/bbs/', '/bbs/index', '/bbs/index/', '/bbs/index.php', '/bbs-new/index.php'].includes(pathname);
}

function isLegacyBoardPath(pathname: string) {
  return pathname === '/board.php' || pathname === '/bbs/main' || pathname === '/bbs/main/' || pathname === '/bbs/main/index.php';
}

function isLegacyThreadPath(pathname: string) {
  return pathname === '/thread.php' || pathname === '/bbs/content' || pathname === '/bbs/content/' || pathname === '/bbs/content/index.php';
}

function isLegacyProfilePath(pathname: string) {
  return pathname === '/profile.php' || pathname === '/bbs/user' || pathname === '/bbs/user/' || pathname === '/bbs/user/index.php';
}

function isLegacySearchPath(pathname: string) {
  return pathname === '/search.php' || pathname === '/bbs/search' || pathname === '/bbs/search/' || pathname === '/bbs/search/index.php';
}

function isLegacyLoginPath(pathname: string) {
  return pathname === '/login.php' || pathname === '/bbs/login' || pathname === '/bbs/login/' || pathname === '/bbs/login/index.php';
}

function isLegacyRegisterPath(pathname: string) {
  return pathname === '/register.php' || pathname === '/bbs/register' || pathname === '/bbs/register/' || pathname === '/bbs/register/index.php';
}

function isLegacyUserCenterPath(pathname: string) {
  return pathname === '/user-center.php' || pathname === '/bbs/home' || pathname === '/bbs/home/' || pathname === '/bbs/home/index.php';
}

function isLegacyUserCenterInformationPath(pathname: string) {
  return pathname === '/bbs/home/information.php';
}

function isLegacyUserCenterMessagesPath(pathname: string) {
  return pathname === '/bbs/home/message.php';
}

function isLegacyUserCenterSecurityPath(pathname: string) {
  return pathname === '/bbs/home/security.php';
}

function isLegacyFavoritePath(pathname: string) {
  return pathname === '/bbs/favorite' || pathname === '/bbs/favorite/' || pathname === '/bbs/favorite/index.php';
}

function isLegacyEditPostPath(pathname: string) {
  return pathname === '/editpid.php' || pathname === '/bbs/editpid' || pathname === '/bbs/editpid/' || pathname === '/bbs/editpid/index.php';
}

function isLegacyActivityPostPath(pathname: string) {
  return pathname === '/activity-post.php' || pathname === '/bbs/manage/post_activity' || pathname === '/bbs/manage/post_activity/' || pathname === '/bbs/manage/post_activity/index.php';
}

function isLegacyOnlinePath(pathname: string) {
  return pathname === '/bbs/online' || pathname === '/bbs/online/' || pathname === '/bbs/online/index.php';
}

function isLegacySignPath(pathname: string) {
  return pathname === '/bbs/sign' || pathname === '/bbs/sign/' || pathname === '/bbs/sign/index.php';
}

function isLegacyStatsWrapperPath(pathname: string) {
  return pathname === '/stats.php';
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function normalizeTextParam(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function appendIfPresent(params: URLSearchParams, key: string, value: string | null) {
  const normalizedValue = normalizeTextParam(value);

  if (normalizedValue) {
    params.set(key, normalizedValue);
  }
}

function withQuery(path: string, values: Record<string, string | null>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    appendIfPresent(params, key, value);
  }

  const query = params.toString();

  return query ? `${path}?${query}` : path;
}

function normalizePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) && number > 0 ? number : null;
}

function getLegacyFloorFromHash(hash: string) {
  const target = safeDecodeURIComponent(hash.replace(/^#/, '').trim());

  if (!target) {
    return null;
  }

  const floorMatch = target.match(/^(?:floor-|pid)?(\d+)$/);

  return floorMatch ? normalizePositiveInteger(floorMatch[1]) : null;
}

function getLegacyCgiBoardId(searchParams: URLSearchParams) {
  const explicitBoardId = normalizePositiveInteger(searchParams.get('b'));

  if (explicitBoardId) {
    return explicitBoardId;
  }

  const boardKey = normalizeTextParam(searchParams.get('id'));

  return boardKey ? LEGACY_CGI_BOARD_IDS[boardKey] ?? null : null;
}

function getLegacyCgiThreadId(value: string | null) {
  const see = normalizeTextParam(value);

  if (!/^[a-z]{4}$/.test(see)) {
    return null;
  }

  return (
    1 +
    [...see].reduce((threadId, letter, index) => {
      const offset = letter.charCodeAt(0) - 97;

      return threadId + offset * 26 ** (3 - index);
    }, 0)
  );
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
