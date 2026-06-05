const LOGIN_PATH = '/login';
const REGISTER_PATH = '/register';
const LOCAL_URL_ORIGIN = 'http://capubbs.local';

type ReturnLocation = {
  hash: string;
  pathname: string;
  search: string;
};

export function getLoginPathWithReturnTo(location: ReturnLocation) {
  const returnTo = getSafeAuthReturnTo(`${location.pathname}${location.search}${location.hash}`);

  if (returnTo === '/') {
    return LOGIN_PATH;
  }

  return `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function getAuthReturnToFromSearch(search: string) {
  const params = new URLSearchParams(search);

  return getSafeAuthReturnTo(params.get('returnTo') ?? params.get('from'));
}

export function getAuthPathWithReturnTo(path: typeof LOGIN_PATH | typeof REGISTER_PATH, returnTo: string) {
  const safeReturnTo = getSafeAuthReturnTo(returnTo);

  if (safeReturnTo === '/') {
    return path;
  }

  return `${path}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function getSafeAuthReturnTo(value: string | null | undefined) {
  const rawReturnTo = value?.trim();

  if (!rawReturnTo || !rawReturnTo.startsWith('/') || rawReturnTo.startsWith('//')) {
    return '/';
  }

  try {
    const url = new URL(rawReturnTo, LOCAL_URL_ORIGIN);
    const returnTo = `${url.pathname}${url.search}${url.hash}`;

    if (url.origin !== LOCAL_URL_ORIGIN || isAuthPath(url.pathname)) {
      return '/';
    }

    return returnTo;
  } catch {
    return '/';
  }
}

export function isLoginPath(pathname: string) {
  return pathname === LOGIN_PATH;
}

export function isRegisterPath(pathname: string) {
  return pathname === REGISTER_PATH;
}

export function shouldHardRedirectAfterAuth(returnTo: string) {
  const safeReturnTo = getSafeAuthReturnTo(returnTo);
  const { pathname } = new URL(safeReturnTo, LOCAL_URL_ORIGIN);

  return (
    pathname === '/bbs' ||
    pathname.startsWith('/bbs/') ||
    pathname.startsWith('/bbs-new/') ||
    pathname.startsWith('/capubbs-new/')
  );
}

function isAuthPath(pathname: string) {
  return isLoginPath(pathname) || isRegisterPath(pathname);
}
