const CAPUBBS_UNIFIED_API_PATH = '/api/api.php';
const CAPUBBS_LEGACY_XML_API_PATH = '/api/jiekouapi.php';
const CAPUBBS_LEGACY_JSON_API_PATH = '/api/jiekoujson.php';
const CAPUBBS_PUBLIC_ASSET_ORIGIN = 'https://chexie.net';
const CAPUBBS_PUBLIC_ASSET_HOSTS = new Set(['chexie.net', 'www.chexie.net', 'test.chexie.net']);
const LEGACY_API_ALIASES = new Set(['legacy', 'legacy/']);
const EXISTING_REMOTE_API_PATHS: Record<string, string> = {
  'activity/create': '/api/bbs/activity/create/',
  'activity/signup': '/bbs/content/utils/postActivity.php',
  captcha: '/assets/api/securimage/securimage_show.php',
  'punishments/add': '/api/bbs/punishment/add/',
  'punishments/get': '/api/bbs/punishment/get/',
  'punishments/update': '/api/bbs/punishment/update/',
};

export function getBbsNewApiUrl(path: string) {
  const apiPath = path.replace(/^\/+/, '');
  const parsedPath = new URL(apiPath, 'http://capubbs.local/');
  const normalizedPathname = parsedPath.pathname.replace(/^\/+/, '').replace(/\/+$/, '');

  if (LEGACY_API_ALIASES.has(apiPath)) {
    return getCapubbsUnifiedApiUrl();
  }

  if (LEGACY_API_ALIASES.has(normalizedPathname)) {
    return getCapubbsUnifiedApiUrl();
  }

  const existingApiPath = EXISTING_REMOTE_API_PATHS[normalizedPathname];

  if (existingApiPath) {
    return `${existingApiPath}${parsedPath.search}`;
  }

  throw new Error(`未接入现有 API: ${normalizedPathname || apiPath}。请记录到 bbs-new/apiNeed.md，不要在 bbs-new/ 内新增 PHP。`);
}

export function getCapubbsUnifiedApiUrl() {
  return CAPUBBS_UNIFIED_API_PATH;
}

export function getCapubbsLegacyXmlApiUrl() {
  return CAPUBBS_LEGACY_XML_API_PATH;
}

export function getCapubbsLegacyJsonApiUrl() {
  return CAPUBBS_LEGACY_JSON_API_PATH;
}

export function getCapubbsRemoteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function getCapubbsPublicAssetUrl(path: string) {
  const value = path.trim();

  if (!value || /^data:image\//i.test(value) || value.startsWith('blob:')) {
    return value;
  }

  if (value.startsWith('//')) {
    return normalizeCapubbsPublicAssetUrl(`https:${value}`);
  }

  if (/^https?:\/\//i.test(value)) {
    return normalizeCapubbsPublicAssetUrl(value);
  }

  return `${CAPUBBS_PUBLIC_ASSET_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

function normalizeCapubbsPublicAssetUrl(value: string) {
  try {
    const url = new URL(value);

    if (!CAPUBBS_PUBLIC_ASSET_HOSTS.has(url.hostname.toLowerCase())) {
      return value;
    }

    return `${CAPUBBS_PUBLIC_ASSET_ORIGIN}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}
