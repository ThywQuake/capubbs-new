import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type NavigateFunction, useNavigate } from 'react-router-dom';
import { fetchLegacyReferencedFloorFrameHtml } from '../../api/legacyBbsClient/legacySignatureReferences';
import type { ThreadFloor } from '../../types/forum';
import { renderLegacyQuotesForNewForum } from '../../utils/legacyQuote';
import {
  getThreadNavigationTargetFromUrl,
  type ThreadNavigationTarget,
} from '../../utils/threadRoutes';
import { renderLegacySignatureFloorReferencesForNewForum } from '../../utils/legacySignature';

const MAX_FRAME_HEIGHT = 50000;
const MIN_FRAME_HEIGHT = 24;
const MAX_SELECTION_TEXT_LENGTH = 5000;
const SELECTION_AUTO_SCROLL_EDGE_SIZE = 72;
const SELECTION_AUTO_SCROLL_MAX_STEP = 24;
const SELECTION_AUTO_SCROLL_MIN_STEP = 2;
const SELECTION_AUTO_SCROLL_STALE_MS = 500;
const ROUTER_BASE_PATH = getNormalizedRouterBasePath(import.meta.env.BASE_URL);
const FLOOR_FRAME_ALLOWED_NAVIGATION_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const FLOOR_FRAME_ALLOW_POLICY = [
  "accelerometer 'none'",
  "autoplay 'none'",
  "camera 'none'",
  "clipboard-read 'none'",
  "clipboard-write 'none'",
  "encrypted-media 'none'",
  "fullscreen 'none'",
  "geolocation 'none'",
  "gyroscope 'none'",
  "magnetometer 'none'",
  "microphone 'none'",
  "midi 'none'",
  "payment 'none'",
  "picture-in-picture 'none'",
  "publickey-credentials-get 'none'",
  "screen-wake-lock 'none'",
  "serial 'none'",
  "usb 'none'",
  "xr-spatial-tracking 'none'",
].join('; ');

type ThreadFloorContentFrameProps = {
  currentAccountId: number | null;
  floor: ThreadFloor;
  isActivitySignupCanceled: boolean;
  navigationContextPath?: string;
  onSelectedTextChange?: (selectedText: string | null) => void;
  onThreadLinkNavigate?: ThreadLinkNavigateHandler;
};

type ThreadFloorSignatureFrameProps = {
  currentAccountId: number | null;
  floor: ThreadFloor;
  navigationContextPath?: string;
  onThreadLinkNavigate?: ThreadLinkNavigateHandler;
};

export type ThreadLinkNavigateHandler = (target: ThreadNavigationTarget) => boolean;

type ThreadHtmlFrameProps = {
  currentAccountId: number | null;
  fallbackContent: string[];
  frameIdSeed: string;
  htmlContent?: string;
  isActivitySignupCanceled: boolean;
  minHeight: number;
  navigationContextPath?: string;
  onSelectedTextChange?: (selectedText: string | null) => void;
  onThreadLinkNavigate?: ThreadLinkNavigateHandler;
  title: string;
  variant: 'content' | 'signature';
};

type FloorFrameMessage =
  | {
      frameId: string;
      height: number;
      source: 'capubbs-floor-frame';
      type: 'resize';
    }
  | {
      frameId: string;
      source: 'capubbs-floor-frame';
      text: string;
      type: 'selection';
    }
  | {
      frameId: string;
      pointerClientY: number;
      source: 'capubbs-floor-frame';
      type: 'selection-auto-scroll';
    }
  | {
      frameId: string;
      source: 'capubbs-floor-frame';
      type: 'selection-auto-scroll-stop';
    }
  | {
      frameId: string;
      requestId: string;
      source: 'capubbs-floor-frame';
      type: 'legacy-signature-floor-request';
      url: string;
    }
  | {
      frameId: string;
      source: 'capubbs-floor-frame';
      type: 'navigate';
      url: string;
    };

export function ThreadFloorContentFrame({
  currentAccountId,
  floor,
  isActivitySignupCanceled,
  navigationContextPath,
  onSelectedTextChange,
  onThreadLinkNavigate,
}: ThreadFloorContentFrameProps) {
  return (
    <ThreadHtmlFrame
      currentAccountId={currentAccountId}
      fallbackContent={floor.content}
      frameIdSeed={`floor-${floor.id}`}
      htmlContent={floor.htmlContent}
      isActivitySignupCanceled={isActivitySignupCanceled}
      minHeight={64}
      navigationContextPath={navigationContextPath}
      title={`第 ${floor.floor} 楼正文`}
      variant="content"
      onSelectedTextChange={onSelectedTextChange}
      onThreadLinkNavigate={onThreadLinkNavigate}
    />
  );
}

export function ThreadFloorSignatureFrame({
  currentAccountId,
  floor,
  navigationContextPath,
  onThreadLinkNavigate,
}: ThreadFloorSignatureFrameProps) {
  return (
    <ThreadHtmlFrame
      currentAccountId={currentAccountId}
      fallbackContent={floor.signature ?? []}
      frameIdSeed={`signature-${floor.id}`}
      htmlContent={floor.signatureHtml}
      isActivitySignupCanceled={false}
      minHeight={24}
      navigationContextPath={navigationContextPath}
      title={`第 ${floor.floor} 楼签名档`}
      variant="signature"
      onThreadLinkNavigate={onThreadLinkNavigate}
    />
  );
}

function ThreadHtmlFrame({
  currentAccountId,
  fallbackContent,
  frameIdSeed,
  htmlContent,
  isActivitySignupCanceled,
  minHeight,
  navigationContextPath,
  onSelectedTextChange,
  onThreadLinkNavigate,
  title,
  variant,
}: ThreadHtmlFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameIdRef = useRef(`${frameIdSeed}-${Math.random().toString(36).slice(2)}`);
  const selectionAutoScrollRef = useRef({
    animationFrameId: null as number | null,
    lastMessageAt: 0,
    pointerViewportY: 0,
  });
  const selectionAutoScrollTickRef = useRef<() => void>(() => undefined);
  const navigate = useNavigate();
  const [frameHeight, setFrameHeight] = useState(minHeight);
  const isDarkTheme = useDocumentTheme() === 'dark';
  const legacyNavigationBaseUrl = useMemo(getCurrentLegacyFloorFrameNavigationBaseUrl, []);
  const navigationContextUrl = useMemo(
    () => getFloorFrameNavigationContextUrl(navigationContextPath),
    [navigationContextPath],
  );
  const siteStyles = useFrameSiteStyles();
  const rawContentHtml = useMemo(
    () => htmlContent?.trim() || buildFallbackFloorContentHtml(fallbackContent),
    [fallbackContent, htmlContent],
  );
  const contentHtml = useMemo(() => {
    if (variant === 'content') {
      return renderLegacyQuotesForNewForum(rawContentHtml);
    }

    return renderLegacySignatureFloorReferencesForNewForum(rawContentHtml);
  }, [rawContentHtml, variant]);
  const srcDoc = useMemo(
    () =>
      buildThreadFloorFrameDocument({
        contentHtml,
        currentAccountId,
        frameId: frameIdRef.current,
        isActivitySignupCanceled,
        isDarkTheme,
        legacyNavigationBaseUrl,
        siteStyles,
        variant,
      }),
    [contentHtml, currentAccountId, isActivitySignupCanceled, isDarkTheme, legacyNavigationBaseUrl, siteStyles, variant],
  );
  const stopSelectionAutoScroll = useCallback(() => {
    const autoScrollState = selectionAutoScrollRef.current;

    if (autoScrollState.animationFrameId !== null) {
      window.cancelAnimationFrame(autoScrollState.animationFrameId);
      autoScrollState.animationFrameId = null;
    }

    autoScrollState.lastMessageAt = 0;
  }, []);

  const scheduleSelectionAutoScroll = useCallback(() => {
    const autoScrollState = selectionAutoScrollRef.current;

    if (autoScrollState.animationFrameId !== null) {
      return;
    }

    autoScrollState.animationFrameId = window.requestAnimationFrame(() => {
      selectionAutoScrollTickRef.current();
    });
  }, []);

  selectionAutoScrollTickRef.current = () => {
    const autoScrollState = selectionAutoScrollRef.current;
    const iframe = iframeRef.current;

    autoScrollState.animationFrameId = null;

    if (!iframe || Date.now() - autoScrollState.lastMessageAt > SELECTION_AUTO_SCROLL_STALE_MS) {
      stopSelectionAutoScroll();
      return;
    }

    const instruction = getSelectionAutoScrollInstruction(iframe, autoScrollState.pointerViewportY);

    if (instruction && canSelectionAutoScroll(instruction.target, instruction.deltaY)) {
      scrollSelectionAutoScrollTarget(instruction.target, instruction.deltaY);
    }

    scheduleSelectionAutoScroll();
  };

  const handleFrameLoad = useCallback(() => {
    stopSelectionAutoScroll();
    applyTransparentFloorFrameShell(iframeRef.current);
  }, [stopSelectionAutoScroll]);

  const handleSelectionAutoScroll = useCallback((message: Extract<FloorFrameMessage, { type: 'selection-auto-scroll' }>) => {
    const iframe = iframeRef.current;

    if (!iframe) {
      return;
    }

    selectionAutoScrollRef.current.pointerViewportY = iframe.getBoundingClientRect().top + message.pointerClientY;
    selectionAutoScrollRef.current.lastMessageAt = Date.now();
    scheduleSelectionAutoScroll();
  }, [scheduleSelectionAutoScroll]);

  useEffect(() => {
    return () => stopSelectionAutoScroll();
  }, [stopSelectionAutoScroll]);

  useEffect(() => {
    stopSelectionAutoScroll();
    setFrameHeight(minHeight);
    onSelectedTextChange?.(null);
  }, [contentHtml, frameIdSeed, minHeight, onSelectedTextChange, stopSelectionAutoScroll]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !isFloorFrameMessage(event.data)) {
        return;
      }

      if (event.data.frameId !== frameIdRef.current) {
        return;
      }

      if (event.data.type === 'resize') {
        setFrameHeight(Math.min(MAX_FRAME_HEIGHT, Math.max(MIN_FRAME_HEIGHT, Math.ceil(event.data.height))));
        return;
      }

      if (event.data.type === 'legacy-signature-floor-request') {
        void respondLegacySignatureFloorRequest(iframeRef.current, event.data);
        return;
      }

      if (event.data.type === 'navigate') {
        navigateFloorFrameLink(event.data.url, navigate, navigationContextUrl, onThreadLinkNavigate);
        return;
      }

      if (event.data.type === 'selection-auto-scroll') {
        handleSelectionAutoScroll(event.data);
        return;
      }

      if (event.data.type === 'selection-auto-scroll-stop') {
        stopSelectionAutoScroll();
        return;
      }

      onSelectedTextChange?.(normalizeQuoteText(event.data.text));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    handleSelectionAutoScroll,
    navigate,
    navigationContextUrl,
    onSelectedTextChange,
    onThreadLinkNavigate,
    stopSelectionAutoScroll,
  ]);

  return (
    <iframe
      ref={iframeRef}
      allow={FLOOR_FRAME_ALLOW_POLICY}
      allowTransparency
      className="capubbs-html-preview-frame block w-full border-0 bg-transparent"
      {...({ credentialless: '' } as { credentialless: string })}
      onLoad={handleFrameLoad}
      referrerPolicy="no-referrer"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={{
        background: 'transparent',
        backgroundColor: 'transparent',
        colorScheme: 'normal',
        height: frameHeight,
        maxWidth: '100%',
        minWidth: 0,
      }}
      title={title}
    />
  );
}

function applyTransparentFloorFrameShell(iframe: HTMLIFrameElement | null) {
  if (!iframe) {
    return;
  }

  iframe.style.setProperty('background', 'transparent', 'important');
  iframe.style.setProperty('background-color', 'transparent', 'important');
  iframe.style.setProperty('color-scheme', 'normal');

  try {
    const frameDocument = iframe.contentDocument;

    if (!frameDocument) {
      return;
    }

    applyTransparentFloorFrameElement(frameDocument.documentElement);
    applyTransparentFloorFrameElement(frameDocument.body);
    applyTransparentFloorFrameElement(frameDocument.querySelector('.capubbs-floor-frame-root'));
    frameDocument.documentElement.style.setProperty('color-scheme', 'normal', 'important');
  } catch {
    // The frame is sandboxed without same-origin access; the injected frame script applies the same styles.
  }
}

function applyTransparentFloorFrameElement(element: Element | null) {
  if (!element || !('style' in element)) {
    return;
  }

  const style = (element as HTMLElement).style;

  style.setProperty('background', 'transparent', 'important');
  style.setProperty('background-color', 'transparent', 'important');
  style.setProperty('background-image', 'none', 'important');
}

function getSelectionAutoScrollInstruction(iframe: HTMLIFrameElement, pointerViewportY: number) {
  if (!Number.isFinite(pointerViewportY) || typeof window === 'undefined') {
    return null;
  }

  const target = getNearestSelectionAutoScrollContainer(iframe);
  const bounds = getSelectionAutoScrollBounds(target);

  if (!bounds) {
    return null;
  }

  const edgeSize = Math.min(
    SELECTION_AUTO_SCROLL_EDGE_SIZE,
    Math.max(24, (bounds.bottom - bounds.top) / 3),
  );
  const topEdge = bounds.top + edgeSize;
  const bottomEdge = bounds.bottom - edgeSize;

  if (pointerViewportY < topEdge) {
    return {
      deltaY: -getSelectionAutoScrollStep(topEdge - pointerViewportY, edgeSize),
      target,
    };
  }

  if (pointerViewportY > bottomEdge) {
    return {
      deltaY: getSelectionAutoScrollStep(pointerViewportY - bottomEdge, edgeSize),
      target,
    };
  }

  return null;
}

function getSelectionAutoScrollBounds(target: HTMLElement | null) {
  if (target) {
    const rect = target.getBoundingClientRect();
    const top = Math.max(0, rect.top);
    const bottom = Math.min(window.innerHeight, rect.bottom);

    return bottom > top ? { bottom, top } : null;
  }

  return window.innerHeight > 0 ? { bottom: window.innerHeight, top: 0 } : null;
}

function getSelectionAutoScrollStep(distance: number, edgeSize: number) {
  const progress = Math.max(0, Math.min(1, distance / edgeSize));

  return Math.ceil(SELECTION_AUTO_SCROLL_MIN_STEP + progress * (SELECTION_AUTO_SCROLL_MAX_STEP - SELECTION_AUTO_SCROLL_MIN_STEP));
}

function getNearestSelectionAutoScrollContainer(element: HTMLElement) {
  let node = element.parentElement;

  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

function canSelectionAutoScroll(target: HTMLElement | null, deltaY: number) {
  if (deltaY === 0) {
    return false;
  }

  if (target) {
    if (deltaY < 0) {
      return target.scrollTop > 0;
    }

    return target.scrollTop + target.clientHeight < target.scrollHeight - 1;
  }

  const scrollingElement = document.scrollingElement;
  const scrollTop = window.scrollY || scrollingElement?.scrollTop || 0;
  const viewportHeight = window.innerHeight || scrollingElement?.clientHeight || 0;
  const scrollHeight = scrollingElement?.scrollHeight || document.documentElement.scrollHeight || 0;

  if (deltaY < 0) {
    return scrollTop > 0;
  }

  return scrollTop + viewportHeight < scrollHeight - 1;
}

function scrollSelectionAutoScrollTarget(target: HTMLElement | null, deltaY: number) {
  if (target) {
    target.scrollTop += deltaY;
    return;
  }

  window.scrollBy({ behavior: 'auto', top: deltaY });
}

async function respondLegacySignatureFloorRequest(
  iframe: HTMLIFrameElement | null,
  request: Extract<FloorFrameMessage, { type: 'legacy-signature-floor-request' }>,
) {
  const targetWindow = iframe?.contentWindow;

  if (!targetWindow) {
    return;
  }

  try {
    const html = await fetchLegacyReferencedFloorFrameHtml(request.url);

    targetWindow.postMessage({
      frameId: request.frameId,
      html,
      requestId: request.requestId,
      source: 'capubbs-parent-frame',
      type: 'legacy-signature-floor-response',
    }, '*');
  } catch {
    targetWindow.postMessage({
      frameId: request.frameId,
      html: '',
      requestId: request.requestId,
      source: 'capubbs-parent-frame',
      type: 'legacy-signature-floor-response',
    }, '*');
  }
}

function isFloorFrameMessage(value: unknown): value is FloorFrameMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Record<string, unknown>;

  if (message.source !== 'capubbs-floor-frame' || typeof message.frameId !== 'string') {
    return false;
  }

  if (message.type === 'resize') {
    return typeof message.height === 'number' && Number.isFinite(message.height);
  }

  if (message.type === 'legacy-signature-floor-request') {
    return typeof message.requestId === 'string' && typeof message.url === 'string';
  }

  if (message.type === 'navigate') {
    return typeof message.url === 'string';
  }

  if (message.type === 'selection-auto-scroll') {
    return typeof message.pointerClientY === 'number' && Number.isFinite(message.pointerClientY);
  }

  if (message.type === 'selection-auto-scroll-stop') {
    return true;
  }

  return message.type === 'selection' && typeof message.text === 'string';
}

function buildThreadFloorFrameDocument({
  contentHtml,
  currentAccountId,
  frameId,
  isActivitySignupCanceled,
  isDarkTheme,
  legacyNavigationBaseUrl,
  siteStyles,
  variant,
}: {
  contentHtml: string;
  currentAccountId: number | null;
  frameId: string;
  isActivitySignupCanceled: boolean;
  isDarkTheme: boolean;
  legacyNavigationBaseUrl: string;
  siteStyles: string;
  variant: 'content' | 'signature';
}) {
  const frameBootstrapScript = buildThreadFloorFrameBootstrapScript(frameId, currentAccountId, legacyNavigationBaseUrl);
  const frameContentSecurityPolicy = buildThreadFloorFrameContentSecurityPolicy();
  const frameOverrideStyles = buildThreadFloorFrameOverrideStyles();
  const themeClassName = isDarkTheme ? 'dark' : 'light';
  const canceledSignupClassName = 'capubbs-activity-signup-canceled';
  const contentClassName = [
    'capubbs-editor-prose',
    variant === 'signature'
      ? 'text-xs leading-[var(--capubbs-thread-card-line-height)] text-zinc-500 dark:text-white/60'
      : 'text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-700 dark:text-zinc-200 sm:text-base',
    variant === 'signature' ? 'sig' : '',
    isActivitySignupCanceled
      ? `${canceledSignupClassName} text-rose-700 line-through decoration-2 decoration-rose-600 dark:text-rose-200 dark:decoration-rose-200`
      : '',
  ].filter(Boolean).join(' ');
  const activitySignupCanceledStyles = isActivitySignupCanceled
    ? `
  .${canceledSignupClassName},
  .${canceledSignupClassName} * {
    color: rgb(190 18 60) !important;
    text-decoration-line: line-through !important;
    text-decoration-thickness: 2px !important;
    text-decoration-color: rgb(225 29 72) !important;
  }
  .dark .${canceledSignupClassName},
  .dark .${canceledSignupClassName} * {
    color: rgb(254 205 211) !important;
    text-decoration-color: rgb(254 205 211) !important;
  }`
    : '';

  return `<!doctype html>
<html class="${themeClassName} capubbs-floor-frame-document" style="background: transparent; color-scheme: normal;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="${frameContentSecurityPolicy}">
  <style>${escapeStyleText(siteStyles)}</style>
  <style>${frameOverrideStyles}</style>
  <style>${activitySignupCanceledStyles}</style>
  <script>${frameBootstrapScript}</script>
</head>
<body class="capubbs-floor-frame-body" style="background: transparent;">
  <main class="capubbs-floor-frame-root ${contentClassName}" style="background: transparent;">${deferThreadFloorFrameScripts(contentHtml)}</main>
</body>
</html>`;
}

function deferThreadFloorFrameScripts(html: string) {
  return html.replace(/<script\b([^>]*)>/gi, (_match, rawAttributes: string) => {
    const attributes = String(rawAttributes).replace(/\s+type\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    return `<script${attributes} type="text/capubbs-user-script">`;
  });
}

function buildThreadFloorFrameOverrideStyles() {
  return `
:root,
html,
body,
html.capubbs-floor-frame-document,
html.capubbs-floor-frame-document body,
html.capubbs-floor-frame-document .capubbs-floor-frame-root {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}

html.capubbs-floor-frame-document {
  color-scheme: normal !important;
}

html.capubbs-floor-frame-document,
html.capubbs-floor-frame-document body {
  margin: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
}

html.capubbs-floor-frame-document.light body {
  color: rgb(63 63 70);
}

html.capubbs-floor-frame-document.dark body {
  color: rgb(228 228 231);
}
`;
}

function buildFallbackFloorContentHtml(content: string[]) {
  return content
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function buildThreadFloorFrameContentSecurityPolicy() {
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline' http: https: data: blob:",
    "style-src 'unsafe-inline' http: https:",
    "img-src http: https: data: blob:",
    "media-src http: https: data: blob:",
    "font-src http: https: data: blob:",
    "connect-src 'none'",
    "worker-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

function getCurrentDocumentStyleText() {
  if (typeof document === 'undefined') {
    return '';
  }

  return Array.from(document.styleSheets)
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        const ownerNode = styleSheet.ownerNode;

        return ownerNode instanceof HTMLStyleElement ? ownerNode.textContent ?? '' : '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

function useFrameSiteStyles() {
  const [siteStyles, setSiteStyles] = useState(getCurrentDocumentStyleText);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    const updateSiteStyles = () => {
      const nextSiteStyles = getCurrentDocumentStyleText();
      setSiteStyles((currentSiteStyles) => currentSiteStyles === nextSiteStyles ? currentSiteStyles : nextSiteStyles);
    };
    const observer = new MutationObserver(updateSiteStyles);

    observer.observe(document.head, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    updateSiteStyles();

    return () => observer.disconnect();
  }, []);

  return siteStyles;
}

function buildThreadFloorFrameBootstrapScript(
  frameId: string,
  currentAccountId: number | null,
  legacyNavigationBaseUrl: string,
) {
  const exposedAccountId = typeof currentAccountId === 'number' && Number.isFinite(currentAccountId)
    ? currentAccountId
    : null;

  return `(function () {
  var frameId = ${toSafeScriptJson(frameId)};
  var currentAccountId = ${toSafeScriptJson(exposedAccountId)};
  var legacyNavigationBaseUrl = ${toSafeScriptJson(legacyNavigationBaseUrl)};

  Object.defineProperty(window, 'CAPUBBS_CURRENT_ACCOUNT_ID', {
    value: currentAccountId,
    writable: false,
    enumerable: true,
    configurable: false
  });
  Object.defineProperty(window, 'CAPUBBS', {
    value: Object.freeze({ currentAccountId: currentAccountId }),
    writable: false,
    enumerable: true,
    configurable: false
  });

  function postMessageToParent(message) {
    window.parent.postMessage(Object.assign({
      source: 'capubbs-floor-frame',
      frameId: frameId
    }, message), '*');
  }

  function setTransparentFrameElementBackground(element) {
    if (!element || !element.style || !element.style.setProperty) {
      return;
    }

    element.style.setProperty('background', 'transparent', 'important');
    element.style.setProperty('background-color', 'transparent', 'important');
    element.style.setProperty('background-image', 'none', 'important');
  }

  function applyTransparentFrameCanvas() {
    setTransparentFrameElementBackground(document.documentElement);

    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.setProperty('color-scheme', 'normal', 'important');
    }

    setTransparentFrameElementBackground(document.body);
    setTransparentFrameElementBackground(document.querySelector('.capubbs-floor-frame-root'));
  }

  applyTransparentFrameCanvas();

  var legacyGrayscaleNamedColors = {
    black: 0,
    darkgray: 169,
    darkgrey: 169,
    dimgray: 105,
    dimgrey: 105,
    gainsboro: 220,
    gray: 128,
    grey: 128,
    lightgray: 211,
    lightgrey: 211,
    silver: 192,
    white: 255,
    whitesmoke: 245
  };

  function getLegacyGrayscaleColor(value) {
    var colorText = String(value == null ? '' : value).trim().toLowerCase().replace(/^['"]|['"]$/g, '');
    var compactColorText = colorText.replace(/\\s+/g, '');
    var namedChannel = legacyGrayscaleNamedColors[compactColorText];

    if (typeof namedChannel === 'number') {
      return { alpha: 1, channel: namedChannel };
    }

    var hexMatch = compactColorText.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);

    if (hexMatch) {
      var hex = hexMatch[1];
      var redHex = '';
      var greenHex = '';
      var blueHex = '';

      if (hex.length === 3) {
        redHex = hex.charAt(0) + hex.charAt(0);
        greenHex = hex.charAt(1) + hex.charAt(1);
        blueHex = hex.charAt(2) + hex.charAt(2);
      } else {
        redHex = hex.slice(0, 2);
        greenHex = hex.slice(2, 4);
        blueHex = hex.slice(4, 6);
      }

      if (redHex === greenHex && greenHex === blueHex) {
        return { alpha: 1, channel: parseInt(redHex, 16) };
      }

      return null;
    }

    var rgbMatch = colorText.match(/^rgba?\\(\\s*(\\d{1,3}%?)(?:\\s*,\\s*|\\s+)(\\d{1,3}%?)(?:\\s*,\\s*|\\s+)(\\d{1,3}%?)(?:\\s*(?:,|\\/)\\s*([01](?:\\.\\d+)?|\\.\\d+|100%|\\d{1,3}%))?\\s*\\)$/);

    if (!rgbMatch) {
      return null;
    }

    var red = parseLegacyRgbChannel(rgbMatch[1]);
    var green = parseLegacyRgbChannel(rgbMatch[2]);
    var blue = parseLegacyRgbChannel(rgbMatch[3]);
    var alpha = parseLegacyAlphaChannel(rgbMatch[4]);

    if (red === null || green === null || blue === null || alpha === null || red !== green || green !== blue) {
      return null;
    }

    return { alpha: alpha, channel: red };
  }

  function parseLegacyRgbChannel(value) {
    var rawValue = String(value || '').trim();
    var isPercent = rawValue.endsWith('%');
    var channel = Number(isPercent ? rawValue.slice(0, -1) : rawValue);

    if (!Number.isFinite(channel)) {
      return null;
    }

    if (isPercent) {
      if (channel < 0 || channel > 100) {
        return null;
      }

      return Math.round(channel * 2.55);
    }

    return channel >= 0 && channel <= 255 ? channel : null;
  }

  function parseLegacyAlphaChannel(value) {
    if (value === undefined) {
      return 1;
    }

    var rawValue = String(value).trim();
    var isPercent = rawValue.endsWith('%');
    var alpha = Number(isPercent ? rawValue.slice(0, -1) : rawValue);

    if (!Number.isFinite(alpha)) {
      return null;
    }

    if (isPercent) {
      return alpha >= 0 && alpha <= 100 ? alpha / 100 : null;
    }

    return alpha >= 0 && alpha <= 1 ? alpha : null;
  }

  function getDarkThemeInvertedTextColor(grayscaleColor, allowAlpha) {
    var invertedChannel = 255 - grayscaleColor.channel;

    if (allowAlpha && grayscaleColor.alpha < 1) {
      return 'rgba(' + invertedChannel + ', ' + invertedChannel + ', ' + invertedChannel + ', ' + grayscaleColor.alpha + ')';
    }

    return rgbChannelToHexColor(invertedChannel);
  }

  function rgbChannelToHexColor(channel) {
    var hex = Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');

    return '#' + hex + hex + hex;
  }

  function applyDarkThemeTextColorInversion(root) {
    if (!document.documentElement.classList.contains('dark')) {
      return;
    }

    var scope = root && root.querySelectorAll ? root : document;
    var elements = Array.prototype.slice.call(scope.querySelectorAll('[color], [style]'));

    if (scope.nodeType === 1 && (scope.hasAttribute('color') || scope.hasAttribute('style'))) {
      elements.unshift(scope);
    }

    elements.forEach(function (element) {
      var originalColorAttribute = element.getAttribute('data-capubbs-original-color-attr') || element.getAttribute('color');
      var colorAttributeGrayscale = getLegacyGrayscaleColor(originalColorAttribute);

      if (colorAttributeGrayscale) {
        element.setAttribute('data-capubbs-original-color-attr', originalColorAttribute);
        element.setAttribute('color', getDarkThemeInvertedTextColor(colorAttributeGrayscale, false));
      }

      if (!element.style || !element.style.getPropertyValue) {
        return;
      }

      var originalStyleColor = element.getAttribute('data-capubbs-original-style-color') || element.style.getPropertyValue('color');
      var styleColorGrayscale = getLegacyGrayscaleColor(originalStyleColor);

      if (styleColorGrayscale) {
        element.setAttribute('data-capubbs-original-style-color', originalStyleColor);
        element.style.setProperty(
          'color',
          getDarkThemeInvertedTextColor(styleColorGrayscale, true),
          element.style.getPropertyPriority('color')
        );
      }
    });
  }

  var legacySignatureRequestSeq = 0;
  var legacySignatureRequests = {};

  function CapubbsQuery(nodes) {
    this.nodes = nodes || [];
    this.length = this.nodes.length;
    for (var index = 0; index < this.nodes.length; index += 1) {
      this[index] = this.nodes[index];
    }
  }

  CapubbsQuery.prototype.find = function (selector) {
    var results = [];

    this.nodes.forEach(function (node) {
      if (!node || !node.querySelectorAll) {
        return;
      }

      Array.prototype.forEach.call(node.querySelectorAll(selector), function (item) {
        results.push(item);
      });
    });

    return new CapubbsQuery(results);
  };

  CapubbsQuery.prototype.html = function (value) {
    if (arguments.length === 0) {
      return this.nodes[0] && this.nodes[0].innerHTML ? this.nodes[0].innerHTML : '';
    }

    this.nodes.forEach(function (node) {
      if (node) {
        node.innerHTML = String(value == null ? '' : value);
        applyDarkThemeTextColorInversion(node);
        applyTransparentFrameCanvas();
      }
    });
    queueResizeMessage();

    return this;
  };

  CapubbsQuery.prototype.each = function (callback) {
    this.nodes.forEach(function (node, index) {
      callback.call(node, index, node);
    });

    return this;
  };

  function createCapubbsQuery(value) {
    if (value instanceof CapubbsQuery) {
      return value;
    }

    if (typeof value === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', value, { once: true });
      } else {
        value();
      }

      return new CapubbsQuery([]);
    }

    if (typeof value === 'string') {
      return new CapubbsQuery(Array.prototype.slice.call(document.querySelectorAll(value)));
    }

    if (value && typeof value.length === 'number' && !value.nodeType && value !== window) {
      return new CapubbsQuery(Array.prototype.slice.call(value));
    }

    return new CapubbsQuery(value ? [value] : []);
  }

  createCapubbsQuery.parseHTML = function (html) {
    var template = document.createElement('template');
    template.innerHTML = String(html == null ? '' : html);

    return Array.prototype.slice.call(template.content.childNodes);
  };

  createCapubbsQuery.get = function (url, callback) {
    var requestId = 'legacy-signature-' + (++legacySignatureRequestSeq);
    var callbacks = {
      done: typeof callback === 'function' ? [callback] : [],
      fail: []
    };

    legacySignatureRequests[requestId] = callbacks;
    postMessageToParent({
      requestId: requestId,
      type: 'legacy-signature-floor-request',
      url: String(url == null ? '' : url)
    });

    return {
      done: function (handler) {
        if (typeof handler === 'function') {
          callbacks.done.push(handler);
        }

        return this;
      },
      fail: function (handler) {
        if (typeof handler === 'function') {
          callbacks.fail.push(handler);
        }

        return this;
      }
    };
  };

  if (!window.$) {
    window.$ = createCapubbsQuery;
  }
  if (!window.jQuery) {
    window.jQuery = window.$;
  }

  window.addEventListener('message', function (event) {
    var data = event.data || {};

    if (data.source !== 'capubbs-parent-frame' || data.frameId !== frameId) {
      return;
    }

    if (data.type !== 'legacy-signature-floor-response') {
      return;
    }

    var callbacks = legacySignatureRequests[data.requestId];
    delete legacySignatureRequests[data.requestId];

    if (!callbacks) {
      return;
    }

    var html = String(data.html || '');
    var handlers = html ? callbacks.done : callbacks.fail;

    handlers.forEach(function (handler) {
      handler(html);
    });
    applyTransparentFrameCanvas();
    applyDarkThemeTextColorInversion(document.body);
    queueResizeMessage();
  });

  function executeDeferredUserScripts() {
    Array.prototype.slice.call(document.querySelectorAll('script[type="text/capubbs-user-script"]')).forEach(function (script) {
      var executableScript = document.createElement('script');

      Array.prototype.forEach.call(script.attributes, function (attribute) {
        if (attribute.name !== 'type') {
          executableScript.setAttribute(attribute.name, attribute.value);
        }
      });
      executableScript.text = script.text || script.textContent || '';
      script.parentNode.replaceChild(executableScript, script);
    });
    applyTransparentFrameCanvas();
    applyDarkThemeTextColorInversion(document.body);
    queueResizeMessage();
  }

  function getClickedAnchor(target) {
    var element = target && target.nodeType === 1 ? target : target && target.parentElement;

    return element && element.closest ? element.closest('a[href]') : null;
  }

  function isAbsoluteUrlLike(href) {
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
  }

  function getLinkNavigationUrl(anchor, rawHref) {
    var href = String(rawHref || '').trim();

    if (!href) {
      return '';
    }

    if (href.charAt(0) === '#') {
      return href;
    }

    if (href.charAt(0) === '?' || (!isAbsoluteUrlLike(href) && href.charAt(0) !== '/')) {
      try {
        return new URL(href, legacyNavigationBaseUrl).href;
      } catch (_error) {
        return anchor.href || href;
      }
    }

    return anchor.href || href;
  }

  function handleFrameLinkClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isTrusted === false
    ) {
      return;
    }

    var anchor = getClickedAnchor(event.target);
    var navigationUrl = anchor ? getLinkNavigationUrl(anchor, anchor.getAttribute('href')) : '';

    if (!navigationUrl) {
      return;
    }

    event.preventDefault();
    postMessageToParent({
      type: 'navigate',
      url: navigationUrl
    });
  }

  function getContentHeight() {
    var body = document.body;
    var root = document.documentElement;

    return Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      root ? root.scrollHeight : 0,
      root ? root.offsetHeight : 0
    );
  }

  var resizeQueued = false;
  function queueResizeMessage() {
    if (resizeQueued) {
      return;
    }

    resizeQueued = true;
    window.requestAnimationFrame(function () {
      resizeQueued = false;
      postMessageToParent({
        type: 'resize',
        height: getContentHeight()
      });
    });
  }

  function postSelectionMessage() {
    var selection = window.getSelection ? window.getSelection() : null;
    var text = selection && !selection.isCollapsed ? String(selection.toString() || '') : '';

    postMessageToParent({
      type: 'selection',
      text: text
    });
  }

  var selectionAutoScrollActive = false;
  var selectionAutoScrollPointerClientY = 0;
  var selectionAutoScrollFrame = 0;

  function getEventElement(target) {
    return target && target.nodeType === 1 ? target : target && target.parentElement;
  }

  function isInteractiveSelectionTarget(target) {
    var element = getEventElement(target);

    return Boolean(
      element &&
      element.closest &&
      element.closest('input, textarea, select, button, option, [contenteditable=""], [contenteditable="true"]')
    );
  }

  function postSelectionAutoScrollMessage() {
    postMessageToParent({
      type: 'selection-auto-scroll',
      pointerClientY: selectionAutoScrollPointerClientY
    });
  }

  function queueSelectionAutoScrollMessage() {
    if (!selectionAutoScrollActive || selectionAutoScrollFrame) {
      return;
    }

    selectionAutoScrollFrame = window.requestAnimationFrame(function tickSelectionAutoScroll() {
      selectionAutoScrollFrame = 0;

      if (!selectionAutoScrollActive) {
        return;
      }

      postSelectionAutoScrollMessage();
      queueSelectionAutoScrollMessage();
    });
  }

  function stopSelectionAutoScroll() {
    if (selectionAutoScrollFrame) {
      window.cancelAnimationFrame(selectionAutoScrollFrame);
      selectionAutoScrollFrame = 0;
    }

    if (!selectionAutoScrollActive) {
      return;
    }

    selectionAutoScrollActive = false;
    postMessageToParent({
      type: 'selection-auto-scroll-stop'
    });
  }

  function handleSelectionAutoScrollMouseDown(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isInteractiveSelectionTarget(event.target)
    ) {
      return;
    }

    selectionAutoScrollActive = true;
    selectionAutoScrollPointerClientY = event.clientY;
    queueSelectionAutoScrollMessage();
  }

  function handleSelectionAutoScrollMouseMove(event) {
    if (!selectionAutoScrollActive) {
      return;
    }

    if (event.buttons !== undefined && (event.buttons & 1) !== 1) {
      stopSelectionAutoScroll();
      return;
    }

    selectionAutoScrollPointerClientY = event.clientY;
  }

  function initFrameBridge() {
    applyTransparentFrameCanvas();
    applyDarkThemeTextColorInversion(document.body);
    queueResizeMessage();
    window.setTimeout(queueResizeMessage, 50);
    window.setTimeout(queueResizeMessage, 250);

    if (window.ResizeObserver) {
      new ResizeObserver(queueResizeMessage).observe(document.documentElement);
      if (document.body) {
        new ResizeObserver(queueResizeMessage).observe(document.body);
      }
    }

    document.addEventListener('selectionchange', postSelectionMessage);
    document.addEventListener('keyup', postSelectionMessage);
    document.addEventListener('mouseup', postSelectionMessage);
    document.addEventListener('mousedown', handleSelectionAutoScrollMouseDown);
    document.addEventListener('mousemove', handleSelectionAutoScrollMouseMove);
    document.addEventListener('mouseup', stopSelectionAutoScroll);
    document.addEventListener('dragstart', stopSelectionAutoScroll);
    window.addEventListener('blur', stopSelectionAutoScroll);
    window.addEventListener('mouseup', stopSelectionAutoScroll);
    window.addEventListener('load', function () {
      applyTransparentFrameCanvas();
      queueResizeMessage();
    });
    executeDeferredUserScripts();
    applyTransparentFrameCanvas();
    document.addEventListener('click', handleFrameLinkClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFrameBridge, { once: true });
  } else {
    initFrameBridge();
  }
}());`;
}

function navigateFloorFrameLink(
  rawUrl: string,
  navigate: NavigateFunction,
  navigationContextUrl: string,
  onThreadLinkNavigate?: ThreadLinkNavigateHandler,
) {
  const threadTarget = getThreadNavigationTargetFromUrl(rawUrl, navigationContextUrl, import.meta.env.BASE_URL);

  if (threadTarget) {
    if (onThreadLinkNavigate?.(threadTarget)) {
      return;
    }

    navigate(threadTarget.path);
    return;
  }

  const url = getSafeFloorFrameNavigationUrl(rawUrl, navigationContextUrl);

  if (!url) {
    return;
  }

  if (url.origin === window.location.origin) {
    navigate(getRouterPathFromSameOriginUrl(url));
    return;
  }

  window.location.assign(url.href);
}

function getSafeFloorFrameNavigationUrl(rawUrl: string, navigationContextUrl: string) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl || typeof window === 'undefined') {
    return null;
  }

  try {
    const url = new URL(trimmedUrl, navigationContextUrl);

    return FLOOR_FRAME_ALLOWED_NAVIGATION_PROTOCOLS.has(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function getRouterPathFromSameOriginUrl(url: URL) {
  const pathname = stripRouterBasePath(url.pathname);

  return `${pathname}${url.search}${url.hash}`;
}

function stripRouterBasePath(pathname: string) {
  if (!ROUTER_BASE_PATH) {
    return pathname || '/';
  }

  if (pathname === ROUTER_BASE_PATH) {
    return '/';
  }

  if (pathname.startsWith(`${ROUTER_BASE_PATH}/`)) {
    return pathname.slice(ROUTER_BASE_PATH.length) || '/';
  }

  return pathname || '/';
}

function getNormalizedRouterBasePath(baseUrl: string) {
  try {
    const pathname = new URL(baseUrl || '/', 'https://capubbs.local').pathname;
    const normalizedPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    return normalizedPathname === '/' ? '' : normalizedPathname;
  } catch {
    return '';
  }
}

function getCurrentLegacyFloorFrameNavigationBaseUrl() {
  if (typeof window === 'undefined') {
    return 'https://test.chexie.net/bbs/content/';
  }

  return new URL('/bbs/content/', window.location.origin).href;
}

function getFloorFrameNavigationContextUrl(navigationContextPath?: string) {
  const fallbackUrl = typeof window === 'undefined' ? 'https://test.chexie.net/' : window.location.href;

  try {
    return new URL(navigationContextPath || fallbackUrl, fallbackUrl).href;
  } catch {
    return fallbackUrl;
  }
}

function normalizeQuoteText(text: string) {
  const normalizedText = text
    .slice(0, MAX_SELECTION_TEXT_LENGTH)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalizedText || null;
}

function toSafeScriptJson(value: unknown) {
  return (JSON.stringify(value) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeStyleText(text: string) {
  return text.replace(/<\/style/gi, '<\\/style');
}

function getCurrentDocumentTheme() {
  if (typeof document === 'undefined') {
    return 'light';
  }

  return document.documentElement.dataset.theme === 'dark' || document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';
}

function useDocumentTheme() {
  const [theme, setTheme] = useState(getCurrentDocumentTheme);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    const updateTheme = () => setTheme(getCurrentDocumentTheme());
    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributeFilter: ['class', 'data-theme'],
      attributes: true,
    });
    updateTheme();

    return () => observer.disconnect();
  }, []);

  return theme;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
