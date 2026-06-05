export type ArchivePanNodeType = 'folder' | 'file';
export type ArchivePanFileKind = 'document' | 'image' | 'route' | 'spreadsheet' | 'zip';

export type ArchivePanNode = {
  id: string;
  name: string;
  type: ArchivePanNodeType;
  children?: ArchivePanNode[];
  downloadUrl?: string;
  downloads?: number;
  error?: string;
  isLoaded?: boolean;
  isLoading?: boolean;
  kind?: ArchivePanFileKind;
  path?: string;
  size?: string;
  sourceUrl?: string;
  updatedAt?: string;
  uploadedBy?: string;
};

const PAN_ARCHIVE_API_PATH = '/bbs-new/api/archive/';
const PAN_ARCHIVE_DEFAULT_PATH = '/index/download.php';
const PAN_ARCHIVE_ORIGIN = 'http://pan.chexie.net';
const PAN_ARCHIVE_ROOT_ID = 'pan-archive-root';
const PAN_DOWNLOAD_CENTER_ID = 'pan-download-center';

export async function fetchPanArchiveFolder(path = PAN_ARCHIVE_DEFAULT_PATH, signal?: AbortSignal) {
  const response = await fetch(getPanArchiveApiUrl(path), {
    headers: {
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    },
    signal,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text.trim() || '真实网盘读取失败。');
  }

  return parsePanArchiveHtml(text, path);
}

export function getPanArchiveExternalUrl(path = PAN_ARCHIVE_DEFAULT_PATH) {
  return resolvePanUrl(path);
}

function getPanArchiveApiUrl(path: string) {
  const searchParams = new URLSearchParams({ path });

  return `${PAN_ARCHIVE_API_PATH}?${searchParams.toString()}`;
}

function parsePanArchiveHtml(html: string, sourcePath: string): ArchivePanNode {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const downloadListRoot = parseLegacyDownloadList(document);

  if (downloadListRoot) {
    return downloadListRoot;
  }

  const directoryRoot = parseApacheDirectoryListing(document, sourcePath);

  if (directoryRoot) {
    return directoryRoot;
  }

  throw new Error('真实网盘返回的页面暂时不能识别。');
}

function parseLegacyDownloadList(document: Document): ArchivePanNode | null {
  const items = Array.from(document.querySelectorAll('li.list-group-item')).reduce<ArchivePanNode[]>((nodes, item, index) => {
      const anchor = item.querySelector('a');
      const name = anchor?.textContent?.trim();

      if (!name) {
        return nodes;
      }

      const legacyId = getHiddenSpanText(item, 'id') || String(index + 1);
      const sourceUrl = getHiddenSpanText(item, 'url');
      const href = anchor?.getAttribute('href') ?? sourceUrl;
      const downloadUrl = href ? resolvePanUrl(href) : undefined;
      const downloads = Number.parseInt(item.querySelector('.badge')?.textContent?.trim() ?? '', 10);

      nodes.push({
        downloadUrl,
        downloads: Number.isFinite(downloads) ? downloads : undefined,
        id: `pan-download-${createStableId(legacyId)}`,
        isLoaded: true,
        kind: getFileKind(name, sourceUrl),
        name,
        sourceUrl: sourceUrl ? resolvePanUrl(sourceUrl) : downloadUrl,
        type: 'file' as const,
        uploadedBy: 'pan.chexie.net',
      });

      return nodes;
    }, []);

  if (items.length === 0) {
    return null;
  }

  return {
    children: [
      {
        children: items,
        id: PAN_DOWNLOAD_CENTER_ID,
        isLoaded: true,
        name: '下载中心',
        path: PAN_ARCHIVE_DEFAULT_PATH,
        type: 'folder',
      },
    ],
    id: PAN_ARCHIVE_ROOT_ID,
    isLoaded: true,
    name: '档案室',
    path: PAN_ARCHIVE_DEFAULT_PATH,
    type: 'folder',
  };
}

function parseApacheDirectoryListing(document: Document, sourcePath: string): ArchivePanNode | null {
  const title = document.querySelector('title')?.textContent?.trim() ?? '';

  if (!/^Index of\b/i.test(title)) {
    return null;
  }

  const links = Array.from(document.querySelectorAll('a'));
  const children = links.reduce<ArchivePanNode[]>((nodes, link) => {
      const href = link.getAttribute('href')?.trim();
      const label = link.textContent?.trim();

      if (!href || !label || href.startsWith('?') || href === '../' || label === 'Parent Directory') {
        return nodes;
      }

      const url = new URL(href, resolvePanUrl(sourcePath));
      const isFolder = href.endsWith('/') || url.pathname.endsWith('/');
      const name = decodeURIComponent(label.replace(/\/$/, ''));
      const path = `${url.pathname}${url.search}`;

      nodes.push({
        downloadUrl: isFolder ? undefined : url.href,
        id: `pan-path-${createStableId(path)}`,
        isLoaded: !isFolder,
        kind: isFolder ? undefined : getFileKind(name, url.href),
        name,
        path,
        sourceUrl: url.href,
        type: isFolder ? 'folder' as const : 'file' as const,
        uploadedBy: 'pan.chexie.net',
      });

      return nodes;
    }, []);

  return {
    children,
    id: sourcePath === PAN_ARCHIVE_DEFAULT_PATH ? PAN_ARCHIVE_ROOT_ID : `pan-path-${createStableId(sourcePath)}`,
    isLoaded: true,
    name: getFolderNameFromPath(sourcePath) || '档案室',
    path: sourcePath,
    sourceUrl: resolvePanUrl(sourcePath),
    type: 'folder',
  };
}

function getHiddenSpanText(item: Element, id: string) {
  return Array.from(item.querySelectorAll('span'))
    .find((span) => span.id === id)
    ?.textContent
    ?.trim();
}

function resolvePanUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value.startsWith('/') ? value : `/${value}`, PAN_ARCHIVE_ORIGIN).href;
}

function getFolderNameFromPath(path: string) {
  const withoutQuery = path.split('?')[0] ?? path;
  const parts = withoutQuery.split('/').filter(Boolean);

  return parts[parts.length - 1] ?? '';
}

function createStableId(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function getFileKind(fileName: string, url = ''): ArchivePanFileKind {
  const extension = `${fileName} ${url}`.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();

  if (extension === 'gpx' || extension === 'kml') {
    return 'route';
  }

  if (extension === 'zip' || extension === 'rar' || extension === '7z') {
    return 'zip';
  }

  if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp' || extension === 'gif') {
    return 'image';
  }

  if (extension === 'xls' || extension === 'xlsx' || extension === 'csv') {
    return 'spreadsheet';
  }

  return 'document';
}
