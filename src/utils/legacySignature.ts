import { getThreadNavigationTargetFromUrl } from './threadRoutes';

const CAPUBBS_SIGNATURE_FLOOR_COMMENT_PREFIX = 'capubbs:signature-floor ';
const LEGACY_SIGNATURE_FLOOR_COMMENT_PATTERN = /<!--\s*capubbs:signature-floor\s+([\s\S]*?)\s*-->/gi;
const LEGACY_SIGNATURE_FLOOR_ESCAPED_COMMENT_PATTERN = /&lt;!--\s*capubbs:signature-floor\s+([\s\S]*?)\s*--&gt;/gi;
const LEGACY_SIGNATURE_FLOOR_COMMENT_PATTERNS = [
  LEGACY_SIGNATURE_FLOOR_COMMENT_PATTERN,
  LEGACY_SIGNATURE_FLOOR_ESCAPED_COMMENT_PATTERN,
];
const LEGACY_SIGNATURE_FLOOR_REFERENCE_SELECTOR = '[data-capubbs-signature-floor-url]';
const LEGACY_THREAD_CONTENT_PAGE_SIZE = 12;
const LOCAL_URL_ORIGIN = 'https://capubbs.local';

type SignatureFloorMetadata = {
  floor?: number;
  href?: string;
};

type SignatureFloorTarget = {
  appHref: string;
  href: string;
  pid: number;
};

export function translateLegacySignatureHtml(rawSignature: string) {
  if (!rawSignature.trim()) {
    return '';
  }

  const protectedSignature = protectSignatureFloorComments(rawSignature);
  const translatedSignature = translateLegacyInlineMarkup(protectedSignature.content.replace(/ /g, '&nbsp;'));

  return renderLegacySignatureFloorReferencesForNewForum(protectedSignature.restore(translatedSignature));
}

export function normalizeNewForumSignatureFloorsForLegacyStorage(html: string) {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const floorReferences = Array.from(document.querySelectorAll<HTMLElement>(LEGACY_SIGNATURE_FLOOR_REFERENCE_SELECTOR));

  floorReferences.forEach((reference) => {
    replaceNodeWithSignatureFloorComment(document, reference, reference.getAttribute('data-capubbs-signature-floor-url'));
  });

  const floorLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));

  floorLinks.forEach((link) => {
    replaceNodeWithSignatureFloorComment(document, link, link.getAttribute('href'));
  });

  return document.body.innerHTML.trim();
}

export function appendLegacySignatureFloorReferenceStorage(html: string, rawHref: string) {
  const target = rawHref ? getSignatureFloorTargetFromHref(rawHref) : null;

  if (!target || hasSignatureFloorTarget(html, target)) {
    return html;
  }

  return `${html}${buildSignatureFloorCommentStorage(target)}`;
}

export function getLegacySignatureFloorReferenceHref(html: string) {
  let href = '';

  walkSignatureFloorComments(html, (_match, rawMetadata) => {
    if (href) {
      return;
    }

    const target = getSignatureFloorTargetFromMetadata(parseSignatureFloorMetadata(rawMetadata));

    if (target) {
      href = target.appHref;
    }
  });

  return href;
}

export function renderLegacySignatureFloorReferencesForNewForum(html: string) {
  if (!html.trim()) {
    return html;
  }

  return replaceSignatureFloorComments(
    html,
    (_match, rawMetadata: string) => {
      const target = getSignatureFloorTargetFromMetadata(parseSignatureFloorMetadata(rawMetadata));

      return target ? renderSignatureFloorReference(target) : '';
    },
  );
}

export function hasLegacySignatureFloorReference(value: string) {
  return hasSignatureFloorComment(value) ||
    /data-capubbs-signature-floor-url\s*=/i.test(value);
}

export function getLegacySignatureExcerpt(rawSignature: string) {
  return replaceSignatureFloorComments(decodeBasicHtmlEntities(rawSignature), () => ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\[img\]([\s\S]+?)\[\/img\]/gi, '图片')
    .replace(/\[url(?:=[^\]]+)?\]([\s\S]+?)\[\/url\]/gi, '$1')
    .replace(/\[at\]([\s\S]+?)\[\/at\]/gi, '@$1')
    .replace(/\[quote(?:=[^\]]+)?\]([\s\S]+?)\[\/quote\]/gi, '$1')
    .replace(/\[(?:\/)?(?:b|i|size|font|color)(?:=[^\]]+)?\]/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateLegacyInlineMarkup(rawValue: string) {
  return rawValue
    .replace(/\r\n?/g, '\n')
    .replace(/\n<br\s*\/?>/gi, '<br>')
    .replace(/\n/g, '<br>')
    .replace(/\[img\]([\s\S]+?)\[\/img\]/gi, "<img src='$1'>")
    .replace(/\[quote=([^\]]+)\]([\s\S]+?)\[\/quote\]/gi, '<quote><div style="background:#F5F5F5;padding:10px"><font color="gray" size="2">引用自 [at]$1[/at] ：<br><br>$2<br><br></font></div></quote>')
    .replace(/\[size=([^\]]+)\]([\s\S]+?)\[\/size\]/gi, "<font size='$1'>$2</font>")
    .replace(/\[font=([^\]]+)\]([\s\S]+?)\[\/font\]/gi, "<font face='$1'>$2</font>")
    .replace(/\[color=([^\]]+)\]([\s\S]+?)\[\/color\]/gi, "<font color='$1'>$2</font>")
    .replace(/\[color=([^\]]+)\]([\s\S]+?)$/gi, "<font color='$1'>$2</font>")
    .replace(/\[at\]([\s\S]+?)\[\/at\]/gi, '<a href="/bbs/user/?name=$1">@$1</a>')
    .replace(/\[url\]([\s\S]+?)\[\/url\]/gi, "<a href='$1'>$1</a>")
    .replace(/\[url=([^\]]+)\]([\s\S]+?)\[\/url\]/gi, "<a href='$1'>$2</a>")
    .replace(/\[b\]([\s\S]+?)\[\/b\]/gi, '<b>$1</b>')
    .replace(/\[i\]([\s\S]+?)\[\/i\]/gi, '<i>$1</i>');
}

function protectSignatureFloorComments(value: string) {
  const comments: string[] = [];
  const content = replaceSignatureFloorComments(value, (comment) => {
    const token = `___CAPUBBS_SIGNATURE_FLOOR_${comments.length}___`;

    comments.push(comment);

    return token;
  });

  return {
    content,
    restore: (nextValue: string) =>
      comments.reduce(
        (result, comment, index) => result.replace(`___CAPUBBS_SIGNATURE_FLOOR_${index}___`, comment),
        nextValue,
      ),
  };
}

function replaceNodeWithSignatureFloorComment(document: Document, node: Element, rawHref: string | null) {
  const comment = buildSignatureFloorComment(rawHref);

  if (!comment) {
    return;
  }

  const commentNode = document.createComment(comment);

  node.replaceWith(commentNode);
  removeGeneratedSignatureFloorScript(commentNode);
}

function buildSignatureFloorComment(rawHref: string | null) {
  const target = rawHref ? getSignatureFloorTargetFromHref(rawHref) : null;

  if (!target) {
    return '';
  }

  return buildSignatureFloorCommentData(target);
}

function buildSignatureFloorCommentStorage(target: SignatureFloorTarget) {
  return `<!--${buildSignatureFloorCommentData(target)}-->`;
}

function buildSignatureFloorCommentData(target: SignatureFloorTarget) {
  const payload: SignatureFloorMetadata = {
    floor: target.pid,
    href: target.href,
  };

  return `${CAPUBBS_SIGNATURE_FLOOR_COMMENT_PREFIX}${JSON.stringify(payload)}`;
}

function hasSignatureFloorTarget(html: string, target: SignatureFloorTarget) {
  let hasTarget = false;

  walkSignatureFloorComments(html, (_match, rawMetadata) => {
    const existingTarget = getSignatureFloorTargetFromMetadata(parseSignatureFloorMetadata(rawMetadata));

    if (existingTarget?.href === target.href) {
      hasTarget = true;
    }
  });

  return hasTarget || new RegExp(`data-capubbs-signature-floor-url=["']${escapeRegExp(target.href)}["']`, 'i').test(html);
}

function parseSignatureFloorMetadata(rawValue: string): SignatureFloorMetadata {
  try {
    const value = JSON.parse(decodeBasicHtmlEntities(rawValue).trim()) as SignatureFloorMetadata;

    return {
      floor: normalizePositiveInteger(value.floor),
      href: typeof value.href === 'string' ? value.href : undefined,
    };
  } catch {
    return {};
  }
}

function replaceSignatureFloorComments(
  value: string,
  replacer: (match: string, rawMetadata: string) => string,
) {
  return LEGACY_SIGNATURE_FLOOR_COMMENT_PATTERNS.reduce((result, pattern) => {
    pattern.lastIndex = 0;

    return result.replace(pattern, (match, rawMetadata: string) => replacer(match, rawMetadata));
  }, value);
}

function walkSignatureFloorComments(
  value: string,
  visitor: (match: string, rawMetadata: string) => void,
) {
  LEGACY_SIGNATURE_FLOOR_COMMENT_PATTERNS.forEach((pattern) => {
    pattern.lastIndex = 0;

    let match = pattern.exec(value);

    while (match) {
      visitor(match[0], match[1] ?? '');
      match = pattern.exec(value);
    }
  });
}

function hasSignatureFloorComment(value: string) {
  return LEGACY_SIGNATURE_FLOOR_COMMENT_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;

    return pattern.test(value);
  });
}

function getSignatureFloorTargetFromMetadata(metadata: SignatureFloorMetadata): SignatureFloorTarget | null {
  const hrefTarget = metadata.href ? getSignatureFloorTargetFromHref(metadata.href) : null;

  if (hrefTarget) {
    return hrefTarget;
  }

  const floor = normalizePositiveInteger(metadata.floor);

  return floor ? buildSignatureFloorTargetFromParts(0, 0, floor) : null;
}

function getSignatureFloorTargetFromHref(rawHref: string): SignatureFloorTarget | null {
  const threadTarget = getThreadNavigationTargetFromUrl(rawHref, getLegacySignatureCurrentUrl(), import.meta.env.BASE_URL);

  if (!threadTarget) {
    return null;
  }

  const threadIdMatch = threadTarget.threadId.match(/^(\d+)-(\d+)$/);

  if (!threadIdMatch) {
    return null;
  }

  const bid = Number(threadIdMatch[1]);
  const tid = Number(threadIdMatch[2]);
  const pid = getFloorNumberFromThreadPath(threadTarget.path);

  return buildSignatureFloorTargetFromParts(bid, tid, pid);
}

function buildSignatureFloorTargetFromParts(bid: number, tid: number, pid: number | undefined): SignatureFloorTarget | null {
  const normalizedBid = normalizePositiveInteger(bid);
  const normalizedTid = normalizePositiveInteger(tid);
  const normalizedPid = normalizePositiveInteger(pid);

  if (!normalizedBid || !normalizedTid || !normalizedPid) {
    return null;
  }

  const page = Math.max(1, Math.ceil(normalizedPid / LEGACY_THREAD_CONTENT_PAGE_SIZE));

  return {
    appHref: `/threads/${normalizedBid}-${normalizedTid}#floor-${normalizedPid}`,
    href: `/bbs/content/?bid=${normalizedBid}&tid=${normalizedTid}&p=${page}#pid${normalizedPid}`,
    pid: normalizedPid,
  };
}

function getFloorNumberFromThreadPath(path: string) {
  try {
    const url = new URL(path, LOCAL_URL_ORIGIN);
    const searchFloor = normalizePositiveInteger(url.searchParams.get('floor') ?? url.searchParams.get('pid'));
    const hashFloor = getFloorNumberFromHash(url.hash);

    return searchFloor ?? hashFloor;
  } catch {
    return getFloorNumberFromHash(path);
  }
}

function getFloorNumberFromHash(hash: string) {
  const match = hash.match(/#(?:floor-|pid)?(\d+)\b/i);

  return match ? normalizePositiveInteger(match[1]) : undefined;
}

function normalizePositiveInteger(value: unknown) {
  const number = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);

  return Number.isFinite(number) && number > 0 ? Math.floor(number) : undefined;
}

function getLegacySignatureCurrentUrl() {
  if (typeof window === 'undefined') {
    return 'https://test.chexie.net/bbs/content/';
  }

  return window.location.href;
}

function renderSignatureFloorReference(target: SignatureFloorTarget) {
  const safeHref = escapeAttribute(target.href);
  const scriptHref = toSafeScriptJson(target.href);

  return [
    `<div class="capubbs-signature-floor-reference" data-capubbs-signature-floor-url="${safeHref}"></div>`,
    `<script>(function(){var script=document.currentScript;var target=script&&script.previousElementSibling;if(!target||!window.$||!window.$.get){return;}window.$.get(${scriptHref}).done(function(html){window.$(target).html(html);}).fail(function(){if(target.parentNode){target.parentNode.removeChild(target);}});}());</script>`,
  ].join('');
}

function removeGeneratedSignatureFloorScript(node: ChildNode) {
  let sibling = node.nextSibling;

  while (sibling?.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
    sibling = sibling.nextSibling;
  }

  if (
    sibling instanceof HTMLScriptElement &&
    /capubbs-signature-floor-reference|legacy-signature-floor/i.test(sibling.textContent ?? '')
  ) {
    sibling.remove();
  }
}

function toSafeScriptJson(value: string) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function decodeBasicHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(text: string) {
  return escapeHtml(text).replace(/`/g, '&#096;');
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
