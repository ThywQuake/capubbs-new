const IMAGE_CACHE_PREFIX = 'capubbs-image-cache:v1:';
const DEFAULT_MAX_LOCAL_STORAGE_IMAGE_LENGTH = 2_000_000;

export function readInitialCachedImages(sources: string[], namespace: string) {
  return getUniqueImageSources(sources).reduce<Record<string, string>>((cachedImages, source) => {
    if (shouldBypassImageCache(source)) {
      cachedImages[source] = source;
      return cachedImages;
    }

    const cachedImage = readCachedImage(namespace, source);

    if (cachedImage) {
      cachedImages[source] = cachedImage;
    }

    return cachedImages;
  }, {});
}

export function getUniqueImageSources(sources: string[]) {
  return Array.from(new Set(sources.filter(Boolean)));
}

export function readCachedImage(namespace: string, source: string) {
  if (typeof window === 'undefined' || shouldBypassImageCache(source)) {
    return null;
  }

  try {
    return window.localStorage.getItem(getImageCacheKey(namespace, source));
  } catch {
    return null;
  }
}

export async function cacheImageSource(
  namespace: string,
  source: string,
  maxLocalStorageLength = DEFAULT_MAX_LOCAL_STORAGE_IMAGE_LENGTH,
) {
  if (typeof window === 'undefined' || shouldBypassImageCache(source)) {
    return source;
  }

  const cachedImage = readCachedImage(namespace, source);

  if (cachedImage) {
    return cachedImage;
  }

  try {
    const response = await window.fetch(source, { cache: 'force-cache' });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await readBlobAsDataUrl(blob);

    if (!dataUrl) {
      return null;
    }

    writeCachedImage(namespace, source, dataUrl, maxLocalStorageLength);
    return dataUrl;
  } catch {
    return null;
  }
}

function getImageCacheKey(namespace: string, source: string) {
  return `${IMAGE_CACHE_PREFIX}${namespace}:${source}`;
}

function shouldBypassImageCache(source: string) {
  return source.startsWith('data:') || source.startsWith('blob:');
}

function writeCachedImage(namespace: string, source: string, dataUrl: string, maxLocalStorageLength: number) {
  if (typeof window === 'undefined' || dataUrl.length > maxLocalStorageLength) {
    return;
  }

  try {
    window.localStorage.setItem(getImageCacheKey(namespace, source), dataUrl);
  } catch {
    // Storage can be full or disabled. The caller can still use the fetched image for this session.
  }
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(null);
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(blob);
  });
}
