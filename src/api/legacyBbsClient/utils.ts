import { getCapubbsPublicAssetUrl } from '../bbsNewApiRoutes';

export const LEGACY_BOARD_PAGE_SIZE = 25;

export function normalizeRequestPath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export function normalizeLegacyIcon(icon: string) {
  const value = icon.trim();

  if (!value) {
    return '';
  }

  if (/^data:image\//i.test(value)) {
    return value;
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('/')) {
    return getCapubbsPublicAssetUrl(value);
  }

  if (/^\d+$/.test(value)) {
    return getCapubbsPublicAssetUrl(`/bbsimg/i/${value}.gif`);
  }

  return getCapubbsPublicAssetUrl(`/bbsimg/icons/${value}`);
}

export function formatLegacyTimestamp(value: unknown) {
  const raw = stringValue(value).trim();

  if (!raw) {
    return '';
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    const date = new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);

    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
  }

  return raw;
}

export function optionalNumber(value: unknown) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : undefined;
}

export function toNullableNumber(value: unknown, fallback: number | null = null) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

export function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function stringValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function stripLegacyHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|blockquote|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripLegacyMarkupWithLineBreaks(value: string) {
  return decodeLegacyHtmlEntities(value)
    .replace(/\r\n?/g, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/\[br\s*\/?\]/gi, '\n')
    .replace(/\[\/?(p|div|li|tr|h[1-6])\]/gi, '\n')
    .replace(/\[quote(?:=[^\]]*)?\][\s\S]*?\[\/quote\]/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\/?[a-z*]+(?:=[^\]]*)?\]/gi, ' ');
}

export function decodeLegacyHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
