const LEGACY_REJECTED_TOKEN_STORAGE_KEY = 'capubbs-legacy-rejected-token:v1';
const LEGACY_TOKEN_MAX_AGE_SECONDS = 999999;
const LEGACY_TOKEN_PATTERN = /^[a-f0-9]{32}$/i;

export function writeLegacyTokenCookie(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return;
  }

  clearRejectedLegacyTokenValue(normalizedToken);
  writeLegacyTokenCookieValue(normalizedToken);
}

export function readLegacyToken() {
  return getUsableLegacyToken([readLegacyTokenCookieValue()]);
}

export function hasLegacyToken() {
  return readLegacyToken() !== '';
}

export function syncLegacyTokenCookie() {
  const token = readLegacyToken();

  if (token) {
    writeLegacyTokenCookieValue(token);
  }

  return token;
}

export function clearLegacyTokenCookie() {
  const token = readLegacyToken();

  if (typeof document === 'undefined') {
    writeRejectedLegacyTokenValue(token);
    return;
  }

  clearLegacyTokenCookieValue();
  writeRejectedLegacyTokenValue(token);
}

function writeLegacyTokenCookieValue(token: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${LEGACY_TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${getPrimaryLegacyCookieDomainAttribute()}`;
}

function readLegacyTokenCookieValue() {
  if (typeof document === 'undefined') {
    return '';
  }

  const tokenCookie = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('token='));

  if (!tokenCookie) {
    return '';
  }

  try {
    return decodeURIComponent(tokenCookie.slice('token='.length)).trim();
  } catch {
    return '';
  }
}

function getUsableLegacyToken(tokens: string[]) {
  return tokens.find(isUsableLegacyToken) ?? '';
}

function isUsableLegacyToken(token: string) {
  const normalizedToken = token.trim();

  return LEGACY_TOKEN_PATTERN.test(normalizedToken) && normalizedToken !== readRejectedLegacyTokenValue();
}

function readRejectedLegacyTokenValue() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(LEGACY_REJECTED_TOKEN_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

function writeRejectedLegacyTokenValue(token: string) {
  if (!token || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LEGACY_REJECTED_TOKEN_STORAGE_KEY, token);
  } catch {
    return;
  }
}

function clearRejectedLegacyTokenValue(token: string) {
  if (!token || typeof window === 'undefined') {
    return;
  }

  try {
    if (window.localStorage.getItem(LEGACY_REJECTED_TOKEN_STORAGE_KEY)?.trim() === token) {
      window.localStorage.removeItem(LEGACY_REJECTED_TOKEN_STORAGE_KEY);
    }
  } catch {
    return;
  }
}

function clearLegacyTokenCookieValue() {
  getLegacyCookieDomainAttributes().forEach((domainAttribute) => {
    document.cookie = `token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${domainAttribute}`;
  });
}

function getPrimaryLegacyCookieDomainAttribute() {
  return getLegacyCookieDomainAttributes()[1] ?? '';
}

function getLegacyCookieDomainAttributes() {
  if (typeof window === 'undefined') {
    return [''];
  }

  const hostname = window.location.hostname.toLowerCase();

  if (!canUseCookieDomainAttribute(hostname)) {
    return [''];
  }

  const domainAttributes = ['', `; domain=.${hostname}`];
  const parentDomain = getParentCookieDomain(hostname);

  if (parentDomain) {
    domainAttributes.push(`; domain=.${parentDomain}`);
  }

  return domainAttributes;
}

function canUseCookieDomainAttribute(hostname: string) {
  return Boolean(hostname) && hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

function getParentCookieDomain(hostname: string) {
  const parts = hostname.split('.');

  return parts.length > 2 ? parts.slice(1).join('.') : '';
}
