import miSansRegularFontUrl from '../assets/fonts/MiSans-Regular.woff2';

const THREAD_FRAME_FONT_STYLE_ID = 'capubbs-thread-frame-font-style';
const THREAD_FRAME_FONT_CACHE_NAME = 'capubbs-thread-frame-fonts-v1';
const THREAD_FRAME_READING_FONT_FAMILY =
  '"MiSans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

let threadFrameFontObjectUrl: string | null = null;
let threadFrameFontLoadPromise: Promise<string> | null = null;

export function installThreadFrameFontStyles() {
  if (typeof document === 'undefined') {
    return;
  }

  const styleElement = getOrCreateThreadFrameFontStyleElement();

  setThreadFrameFontStyleText(styleElement);

  threadFrameFontLoadPromise ??= resolveThreadFrameFontUrl();
  void threadFrameFontLoadPromise.then((fontUrl) => {
    setThreadFrameFontStyleText(styleElement, fontUrl);
  });
}

function getOrCreateThreadFrameFontStyleElement() {
  const existingStyleElement = document.getElementById(THREAD_FRAME_FONT_STYLE_ID);

  if (existingStyleElement instanceof HTMLStyleElement) {
    return existingStyleElement;
  }

  const styleElement = document.createElement('style');

  styleElement.id = THREAD_FRAME_FONT_STYLE_ID;
  document.head.appendChild(styleElement);

  return styleElement;
}

function setThreadFrameFontStyleText(styleElement: HTMLStyleElement, fontUrl?: string) {
  const fontFaceRule = fontUrl
    ? `
@font-face {
  font-family: "MiSans";
  src: ${getThreadFrameFontSources(fontUrl)};
  font-display: swap;
  font-style: normal;
  font-weight: 400;
}
`
    : '';

  styleElement.textContent = `${fontFaceRule}
html.capubbs-floor-frame-document,
html.capubbs-floor-frame-document body {
  font-family: ${THREAD_FRAME_READING_FONT_FAMILY};
}

html.capubbs-floor-frame-document .capubbs-floor-frame-root {
  font-family: inherit;
}
`;
}

function getThreadFrameFontSources(primaryFontUrl: string) {
  const fontUrls = [primaryFontUrl, getThreadFrameFontAssetUrl()]
    .filter((fontUrl, index, fontUrlList) => fontUrlList.indexOf(fontUrl) === index);

  return fontUrls
    .map((fontUrl) => `url("${escapeCssString(fontUrl)}") format("woff2")`)
    .join(', ');
}

async function resolveThreadFrameFontUrl() {
  const fontAssetUrl = getThreadFrameFontAssetUrl();

  if (typeof window === 'undefined' || !window.caches) {
    return fontAssetUrl;
  }

  try {
    const fontRequest = new Request(fontAssetUrl);
    const fontCache = await window.caches.open(THREAD_FRAME_FONT_CACHE_NAME);
    const cachedResponse = await fontCache.match(fontRequest);

    if (cachedResponse) {
      return createThreadFrameFontObjectUrl(await cachedResponse.blob());
    }

    const fontResponse = await fetch(fontAssetUrl, { cache: 'force-cache' });

    if (!fontResponse.ok) {
      return fontAssetUrl;
    }

    const fontBlob = await fontResponse.clone().blob();

    try {
      await fontCache.put(fontRequest, fontResponse);
    } catch {
      // The font still works for the current session even if persistent cache storage is unavailable.
    }

    return createThreadFrameFontObjectUrl(fontBlob);
  } catch {
    return fontAssetUrl;
  }
}

function createThreadFrameFontObjectUrl(fontBlob: Blob) {
  if (threadFrameFontObjectUrl) {
    URL.revokeObjectURL(threadFrameFontObjectUrl);
  }

  threadFrameFontObjectUrl = URL.createObjectURL(fontBlob);

  return threadFrameFontObjectUrl;
}

function getThreadFrameFontAssetUrl() {
  if (typeof window === 'undefined') {
    return miSansRegularFontUrl;
  }

  try {
    return new URL(miSansRegularFontUrl, window.location.href).href;
  } catch {
    return miSansRegularFontUrl;
  }
}

function escapeCssString(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\a ')
    .replace(/\r/g, '\\d ');
}
