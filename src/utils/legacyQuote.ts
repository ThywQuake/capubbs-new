import { getThreadNavigationTargetFromUrl } from './threadRoutes';
import { getPublicProfileAppPath, getPublicProfilePath } from './userRoutes';

const CAPUBBS_QUOTE_COMMENT_PREFIX = 'capubbs:quote ';
const LEGACY_AT_PATTERN = /\[at\]([\s\S]*?)\[\/at\]/gi;
const LEGACY_QUOTE_PATTERN = /\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\](?:\s*<!--\s*capubbs:quote\s+([\s\S]*?)\s*-->)?/gi;
const LEGACY_QUOTE_HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;
const LEGACY_QUOTE_INLINE_MARKUP_PATTERN = /\[(?:at|b|color|font|i|img|size|url)\b/i;
const LEGACY_RAW_INLINE_HTML_TEXT_PATTERN = /<(?:br|img)\b/i;
const LEGACY_ESCAPED_RAW_HTML_TAG_PATTERN = /&lt;\s*(\/?)\s*(a|b|br|em|font|i|img|span|strong|u)\b([\s\S]*?)&gt;/gi;
const LEGACY_TEXT_URL_PATTERN = /https?:\/\/[-A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%]+/gi;
const LEGACY_TEXT_URL_TRAILING_PUNCTUATION = '.,;:!?，。；：！？、)）]}】》';
const LEGACY_INLINE_MARKUP_IGNORED_TEXT_PARENTS = new Set(['a', 'script', 'style', 'textarea']);
const LEGACY_QUOTE_DANGEROUS_TAGS = new Set([
  'base',
  'button',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'textarea',
]);
const LEGACY_QUOTE_SAFE_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'font',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const LEGACY_QUOTE_SAFE_GLOBAL_ATTRIBUTES = new Set(['style', 'title']);
const LEGACY_QUOTE_SAFE_ATTRIBUTES_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target', 'title']),
  font: new Set(['color', 'face', 'size', 'style', 'title']),
  img: new Set(['alt', 'height', 'src', 'title', 'width']),
  td: new Set(['colspan', 'rowspan', 'style', 'title']),
  th: new Set(['colspan', 'rowspan', 'style', 'title']),
};
const LEGACY_QUOTE_SAFE_STYLE_PROPERTIES = new Set([
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'white-space',
  'width',
]);
const LEGACY_TYPOGRAPHY_STYLE_PROPERTIES = new Set([
  'font',
  'font-family',
  'font-kerning',
  'font-size',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'text-autospace',
  'text-indent',
]);

type LegacyQuoteStorageInput = {
  author: string;
  floor?: number;
  href?: string;
  text: string;
};

type QuoteMetadata = {
  floor?: number;
  href?: string;
};

export function buildLegacyQuoteStorage({ author, floor, href, text }: LegacyQuoteStorageInput) {
  const quote = `[quote=${sanitizeLegacyQuoteAuthor(author)}]${normalizeLegacyQuoteText(text)}[/quote]`;
  const metadataComment = buildQuoteMetadataComment({ floor, href });

  return `${quote}${metadataComment}`;
}

export function normalizeNewForumQuotesForLegacyStorage(html: string) {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const quotes = Array.from(document.querySelectorAll('blockquote.capubbs-floor-quote'));

  if (quotes.length === 0) {
    return html;
  }

  quotes.forEach((quote) => {
    const author = getNewForumQuoteAuthor(quote);
    const text = getNewForumQuoteText(quote);
    const jumpHref = quote.querySelector<HTMLAnchorElement>('.capubbs-floor-quote-jump[href]')?.getAttribute('href') ?? undefined;
    const floor = getFloorNumberFromHref(jumpHref);
    const storage = buildLegacyQuoteStorage({ author, floor, href: jumpHref, text });
    const fragment = document.createDocumentFragment();
    const { comment, text: storageText } = splitStorageQuoteComment(storage);

    fragment.append(document.createTextNode(storageText));

    if (comment) {
      fragment.append(document.createComment(comment));
    }

    quote.replaceWith(fragment);
  });

  return document.body.innerHTML.trim();
}

export function renderLegacyQuotesForNewForum(html: string) {
  if (!html.trim()) {
    return html;
  }

  const htmlWithRawQuotes = html.replace(
    LEGACY_QUOTE_PATTERN,
    (_match, rawAuthor: string, rawText: string, rawMetadata: string | undefined) =>
      buildNewForumQuoteHtml({
        author: decodeHtmlEntities(rawAuthor.trim()),
        metadata: parseQuoteMetadata(rawMetadata),
        textHtml: buildQuoteContentHtmlFromLegacyMarkup(rawText),
      }),
  );
  const htmlWithLegacyInlineMarkup = translateLegacyBracketTagsToHtml(htmlWithRawQuotes);

  if (typeof DOMParser === 'undefined') {
    return renderLegacyMentionsString(normalizeLegacyTypographyString(htmlWithLegacyInlineMarkup));
  }

  const document = new DOMParser().parseFromString(htmlWithLegacyInlineMarkup, 'text/html');
  const legacyQuotes = Array.from(document.querySelectorAll('quote'));

  legacyQuotes.forEach((quote) => {
    const metadataComment = getAdjacentQuoteMetadataComment(quote);
    const metadata = parseQuoteMetadata(metadataComment?.data.replace(CAPUBBS_QUOTE_COMMENT_PREFIX, ''));
    const author = getLegacyRenderedQuoteAuthor(quote);
    const quoteFragment = new DOMParser().parseFromString(
      buildNewForumQuoteHtml({
        author,
        metadata,
        textHtml: buildQuoteContentHtmlFromLegacyElement(quote, author),
      }),
      'text/html',
    ).body.firstElementChild;

    if (quoteFragment) {
      quote.replaceWith(document.importNode(quoteFragment, true));
    }

    metadataComment?.remove();
  });

  normalizeLegacyTypographyForNewForum(document.body);
  renderLegacyInlineMarkupForNewForum(document.body, document);
  renderLegacyMentionsForNewForum(document.body, document);
  renderLegacyTextUrlsForNewForum(document.body, document);
  normalizeLegacyRawHtmlElementsForNewForum(document.body);

  return document.body.innerHTML.trim();
}

export function parseMarkdownFloorQuoteStorage(quoteLines: string[], metaPattern: RegExp) {
  const metaLineIndex = getMarkdownFloorQuoteMetaLineIndex(quoteLines, metaPattern);

  if (metaLineIndex === -1) {
    return null;
  }

  const metaMatch = quoteLines[metaLineIndex].match(metaPattern);

  if (!metaMatch) {
    return null;
  }

  const text = quoteLines
    .slice(0, metaLineIndex)
    .filter((line) => line.trim().length > 0)
    .join('\n');

  return buildLegacyQuoteStorage({
    author: unescapeMarkdownLinkText(metaMatch[1]),
    floor: getFloorNumberFromHref(metaMatch[3]),
    href: metaMatch[3],
    text,
  });
}

function getMarkdownFloorQuoteMetaLineIndex(quoteLines: string[], metaPattern: RegExp) {
  for (let index = quoteLines.length - 1; index >= 0; index -= 1) {
    if (!quoteLines[index].trim()) {
      continue;
    }

    return metaPattern.test(quoteLines[index]) ? index : -1;
  }

  return -1;
}

function buildQuoteMetadataComment(metadata: QuoteMetadata) {
  const normalizedHref = normalizeQuoteHref(metadata.href);
  const normalizedFloor = normalizeQuoteFloor(metadata.floor);
  const payload: QuoteMetadata = {};

  if (normalizedHref) {
    payload.href = normalizedHref;
  }

  if (normalizedFloor) {
    payload.floor = normalizedFloor;
  }

  return Object.keys(payload).length > 0 ? `<!--${CAPUBBS_QUOTE_COMMENT_PREFIX}${JSON.stringify(payload)}-->` : '';
}

function splitStorageQuoteComment(storage: string) {
  const commentMatch = storage.match(/<!--([\s\S]*?)-->$/);

  if (!commentMatch) {
    return {
      comment: '',
      text: storage,
    };
  }

  return {
    comment: commentMatch[1],
    text: storage.slice(0, commentMatch.index),
  };
}

function getNewForumQuoteAuthor(quote: Element) {
  const meta = quote.querySelector('.capubbs-floor-quote-meta span');
  const authorText = meta?.querySelector('a')?.textContent ?? meta?.textContent ?? '';
  const normalizedAuthor = authorText.replace(/^引用自\s*/, '').trim();

  return normalizedAuthor || '匿名用户';
}

function getNewForumQuoteText(quote: Element) {
  const contentBlocks = Array.from(quote.querySelectorAll('.capubbs-floor-quote-content'));
  const text = contentBlocks
    .map((block) => block.textContent?.trim() ?? '')
    .filter(Boolean)
    .join('\n');

  return text || quote.textContent?.replace(/引用自\s+[^\n]+/, '').trim() || '';
}

function buildNewForumQuoteHtml({
  author,
  metadata,
  textHtml,
}: {
  author: string;
  metadata: QuoteMetadata;
  textHtml: string;
}) {
  const authorText = author.trim() || '匿名用户';
  const authorHref = getPublicProfilePath(authorText);
  const href = normalizeQuoteHref(metadata.href);
  const authorLink = `<a class="capubbs-floor-quote-author" href="${escapeAttribute(authorHref)}">${escapeHtml(authorText)}</a>`;
  const jump = href
    ? `<a class="capubbs-floor-quote-jump" href="${escapeAttribute(href)}">&gt;&gt;</a>`
    : '';

  return [
    '<blockquote class="capubbs-floor-quote">',
    textHtml,
    `<p class="capubbs-floor-quote-meta"><span>引用自 ${authorLink}</span>${jump}</p>`,
    '</blockquote>',
  ].join('');
}

function buildQuoteContentHtmlFromPlainText(text: string) {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (paragraphs.length > 0 ? paragraphs : [''])
    .map((paragraph) => `<p class="capubbs-floor-quote-content">${escapeHtml(paragraph)}</p>`)
    .join('');
}

function buildQuoteContentHtmlFromLegacyMarkup(rawText: string) {
  const decodedText = decodeHtmlEntities(rawText);

  if (!shouldRenderQuoteContentAsHtml(decodedText) || typeof DOMParser === 'undefined') {
    return buildQuoteContentHtmlFromPlainText(decodedText);
  }

  const html = translateLegacyInlineMarkupForQuote(decodedText);
  const document = new DOMParser().parseFromString(html, 'text/html');

  sanitizeQuoteContentContainer(document.body);
  normalizeLegacyTypographyForNewForum(document.body);
  renderLegacyMentionsForNewForum(document.body, document);

  const contentHtml = document.body.innerHTML.trim();

  return contentHtml
    ? `<div class="capubbs-floor-quote-content">${contentHtml}</div>`
    : buildQuoteContentHtmlFromPlainText(decodedText);
}

function buildQuoteContentHtmlFromLegacyElement(quote: Element, author: string) {
  const ownerDocument = quote.ownerDocument;
  const container = ownerDocument.createElement('div');

  Array.from(quote.childNodes).forEach((childNode) => {
    container.appendChild(childNode.cloneNode(true));
  });

  stripLegacyRenderedQuotePrefix(container, author);
  trimLeadingQuoteSpacing(container);
  trimTrailingQuoteSpacing(container);
  sanitizeQuoteContentContainer(container);
  normalizeLegacyTypographyForNewForum(container);
  renderLegacyMentionsForNewForum(container, ownerDocument);

  const contentHtml = container.innerHTML.trim();

  return contentHtml
    ? `<div class="capubbs-floor-quote-content">${contentHtml}</div>`
    : buildQuoteContentHtmlFromPlainText(getLegacyRenderedQuoteText(quote, author));
}

function shouldRenderQuoteContentAsHtml(html: string) {
  return LEGACY_QUOTE_HTML_PATTERN.test(html) || LEGACY_QUOTE_INLINE_MARKUP_PATTERN.test(html);
}

function translateLegacyInlineMarkupForQuote(rawValue: string) {
  return translateLegacyBracketTagsToHtml(rawValue)
    .replace(/\r\n?/g, '\n')
    .replace(/\n<br\s*\/?>/gi, '<br>')
    .replace(/\n/g, '<br>');
}

function translateLegacyBracketTagsToHtml(rawValue: string) {
  return rawValue
    .replace(LEGACY_ESCAPED_RAW_HTML_TAG_PATTERN, renderEscapedLegacyRawHtmlTag)
    .replace(/\[img\]([\s\S]+?)\[\/img\]/gi, (_match, rawSrc: string) => {
      const src = rawSrc.trim();

      return src ? `<img src="${escapeAttribute(src)}">` : '';
    })
    .replace(/\[url\]([\s\S]+?)\[\/url\]/gi, (_match, rawHref: string) => {
      const href = rawHref.trim();

      return href ? `<a href="${escapeAttribute(href)}">${escapeHtml(href)}</a>` : '';
    })
    .replace(/\[url=([^\]]+)\]([\s\S]+?)\[\/url\]/gi, (_match, rawHref: string, label: string) => {
      const href = rawHref.trim();

      return href ? `<a href="${escapeAttribute(href)}">${label}</a>` : label;
    })
    .replace(/\[size=([^\]]+)\]/gi, (_match, size: string) => `<font size="${escapeAttribute(size.trim())}">`)
    .replace(/\[\/size\]/gi, '</font>')
    .replace(/\[font=([^\]]+)\]/gi, (_match, face: string) => `<font face="${escapeAttribute(face.trim())}">`)
    .replace(/\[\/font\]/gi, '</font>')
    .replace(/\[color=([^\]]+)\]/gi, (_match, color: string) => renderLegacyColorOpenTag(color))
    .replace(/\[\/color\]/gi, '</span>')
    .replace(/\[b\]/gi, '<b>')
    .replace(/\[\/b\]/gi, '</b>')
    .replace(/\[i\]/gi, '<i>')
    .replace(/\[\/i\]/gi, '</i>');
}

function renderEscapedLegacyRawHtmlTag(_match: string, rawClosing: string, rawTagName: string, rawAttributes: string) {
  const tagName = rawTagName.toLowerCase();

  if (rawClosing) {
    return tagName === 'br' || tagName === 'img' ? '' : `</${tagName}>`;
  }

  return `<${tagName}${decodeHtmlEntities(rawAttributes)}>`;
}

function renderLegacyColorOpenTag(color: string) {
  const normalizedColor = color.trim();

  return normalizedColor
    ? `<span style="color: ${escapeAttribute(normalizedColor)}">`
    : '<span>';
}

function stripLegacyRenderedQuotePrefix(root: HTMLElement, author: string) {
  const textNode = findFirstMeaningfulTextNode(root);

  if (!textNode) {
    return;
  }

  const escapedAuthor = escapeRegExp(author);
  const authorPattern = `(?:\\[at\\]\\s*${escapedAuthor}\\s*\\[\\/at\\]|@?${escapedAuthor})`;
  const prefixPattern = new RegExp(`^\\s*引用自\\s+${authorPattern}\\s*[：:]\\s*`, 'i');

  textNode.textContent = (textNode.textContent ?? '').replace(prefixPattern, '');
}

function findFirstMeaningfulTextNode(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;

    return textNode.textContent?.trim() ? textNode : null;
  }

  for (const childNode of Array.from(node.childNodes)) {
    const result = findFirstMeaningfulTextNode(childNode);

    if (result) {
      return result;
    }
  }

  return null;
}

function trimLeadingQuoteSpacing(node: Node) {
  while (node.firstChild) {
    const childNode = node.firstChild;

    if (isIgnorableQuoteBoundaryNode(childNode)) {
      childNode.remove();
      continue;
    }

    if (childNode.nodeType === Node.ELEMENT_NODE) {
      trimLeadingQuoteSpacing(childNode);

      if (!hasMeaningfulQuoteContent(childNode)) {
        childNode.remove();
        continue;
      }
    }

    return;
  }
}

function trimTrailingQuoteSpacing(node: Node) {
  while (node.lastChild) {
    const childNode = node.lastChild;

    if (isIgnorableQuoteBoundaryNode(childNode)) {
      childNode.remove();
      continue;
    }

    if (childNode.nodeType === Node.ELEMENT_NODE) {
      trimTrailingQuoteSpacing(childNode);

      if (!hasMeaningfulQuoteContent(childNode)) {
        childNode.remove();
        continue;
      }
    }

    return;
  }
}

function isIgnorableQuoteBoundaryNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return !(node.textContent ?? '').trim();
  }

  return node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br';
}

function hasMeaningfulQuoteContent(node: Node) {
  if ((node.textContent ?? '').trim()) {
    return true;
  }

  return Array.from(node.childNodes).some((childNode) => {
    if (childNode.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tagName = (childNode as Element).tagName.toLowerCase();

    return ['br', 'hr', 'img'].includes(tagName);
  });
}

function sanitizeQuoteContentContainer(root: HTMLElement) {
  Array.from(root.childNodes).forEach(sanitizeQuoteContentNode);
}

function sanitizeQuoteContentNode(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (LEGACY_QUOTE_DANGEROUS_TAGS.has(tagName)) {
    element.remove();
    return;
  }

  Array.from(element.childNodes).forEach(sanitizeQuoteContentNode);

  if (!LEGACY_QUOTE_SAFE_TAGS.has(tagName)) {
    unwrapQuoteElement(element);
    return;
  }

  sanitizeQuoteElementAttributes(element, tagName);

  if (tagName === 'img' && !element.getAttribute('src')) {
    element.remove();
  }
}

function unwrapQuoteElement(element: HTMLElement) {
  const parent = element.parentNode;

  if (!parent) {
    element.remove();
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function sanitizeQuoteElementAttributes(element: HTMLElement, tagName: string) {
  const allowedAttributes = LEGACY_QUOTE_SAFE_ATTRIBUTES_BY_TAG[tagName] ?? LEGACY_QUOTE_SAFE_GLOBAL_ATTRIBUTES;

  Array.from(element.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = attribute.value;

    if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
      element.removeAttribute(attribute.name);
      return;
    }

    if (!allowedAttributes.has(attributeName) && !LEGACY_QUOTE_SAFE_GLOBAL_ATTRIBUTES.has(attributeName)) {
      element.removeAttribute(attribute.name);
      return;
    }

    if (attributeName === 'style') {
      const style = sanitizeQuoteStyleText(attributeValue);

      if (style) {
        element.setAttribute('style', style);
      } else {
        element.removeAttribute(attribute.name);
      }

      return;
    }

    if (attributeName === 'href') {
      const href = normalizeQuoteContentUrl(attributeValue, false);

      if (href) {
        element.setAttribute('href', href);
      } else {
        element.removeAttribute(attribute.name);
      }

      return;
    }

    if (attributeName === 'src') {
      const src = normalizeQuoteContentUrl(attributeValue, true);

      if (src) {
        element.setAttribute('src', src);
      } else {
        element.removeAttribute(attribute.name);
      }

      return;
    }

    if (attributeName === 'target') {
      if (attributeValue === '_blank') {
        element.setAttribute('rel', 'noreferrer');
      } else {
        element.removeAttribute(attribute.name);
      }

      return;
    }

    if ((attributeName === 'width' || attributeName === 'height' || attributeName === 'colspan' || attributeName === 'rowspan') && !isSafeQuoteDimension(attributeValue)) {
      element.removeAttribute(attribute.name);
    }
  });
}

function normalizeLegacyRawHtmlElementsForNewForum(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLElement>('a, img')).forEach((element) => {
    if (element.tagName.toLowerCase() === 'a') {
      normalizeLegacyRawAnchorElement(element as HTMLAnchorElement);
      return;
    }

    normalizeLegacyRawImageElement(element as HTMLImageElement);
  });
}

function normalizeLegacyRawAnchorElement(anchor: HTMLAnchorElement) {
  Array.from(anchor.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();

    if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
      anchor.removeAttribute(attribute.name);
    }
  });

  const href = normalizeQuoteContentUrl(anchor.getAttribute('href') ?? '', false);

  if (href) {
    anchor.setAttribute('href', href);
  } else {
    anchor.removeAttribute('href');
  }

  const target = anchor.getAttribute('target');

  if (target === '_blank') {
    anchor.setAttribute('rel', 'noreferrer');
  } else if (target) {
    anchor.removeAttribute('target');
  }
}

function normalizeLegacyRawImageElement(image: HTMLImageElement) {
  sanitizeQuoteElementAttributes(image, 'img');

  if (!image.getAttribute('src')) {
    image.remove();
  }
}

function sanitizeQuoteStyleText(style: string) {
  return style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(':');

      if (separatorIndex === -1) {
        return '';
      }

      const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
      const value = declaration.slice(separatorIndex + 1).trim();

      if (!LEGACY_QUOTE_SAFE_STYLE_PROPERTIES.has(property) || isUnsafeQuoteStyleValue(value)) {
        return '';
      }

      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function isUnsafeQuoteStyleValue(value: string) {
  return /(?:expression\s*\(|javascript:|vbscript:|@import|url\s*\()/i.test(value);
}

function normalizeQuoteContentUrl(value: string, allowDataImage: boolean) {
  const url = value.trim();

  if (!url || /^(?:javascript|vbscript):/i.test(url)) {
    return '';
  }

  if (/^data:/i.test(url)) {
    return allowDataImage && /^data:image\//i.test(url) ? url : '';
  }

  if (!allowDataImage) {
    const threadTarget = getThreadNavigationTargetFromUrl(url, getLegacyQuoteCurrentUrl(), import.meta.env.BASE_URL);

    if (threadTarget) {
      return getLegacyQuoteAppPath(threadTarget.path);
    }
  }

  return url;
}

function getLegacyQuoteAppPath(path: string) {
  const normalizedBasePath = normalizeLegacyQuoteBasePath(import.meta.env.BASE_URL);

  return normalizedBasePath && path.startsWith('/') ? `${normalizedBasePath}${path}` : path;
}

function normalizeLegacyQuoteBasePath(baseUrl: string) {
  if (!baseUrl || baseUrl === '/') {
    return '';
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function getLegacyQuoteCurrentUrl() {
  if (typeof window === 'undefined') {
    return 'https://test.chexie.net/bbs/content/';
  }

  return window.location.href;
}

function isSafeQuoteDimension(value: string) {
  return /^\d{1,4}%?$/.test(value.trim());
}

function getAdjacentQuoteMetadataComment(node: Element) {
  let sibling = node.nextSibling;

  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
      sibling = sibling.nextSibling;
      continue;
    }

    if (sibling.nodeType === Node.COMMENT_NODE) {
      const comment = sibling as Comment;

      return comment.data.trim().startsWith(CAPUBBS_QUOTE_COMMENT_PREFIX) ? comment : null;
    }

    return null;
  }

  return null;
}

function parseQuoteMetadata(rawValue: string | undefined): QuoteMetadata {
  if (!rawValue) {
    return {};
  }

  try {
    const value = JSON.parse(rawValue) as QuoteMetadata;

    return {
      floor: normalizeQuoteFloor(value.floor),
      href: normalizeQuoteHref(value.href),
    };
  } catch {
    return {};
  }
}

function getLegacyRenderedQuoteAuthor(quote: Element) {
  const text = quote.textContent ?? '';
  const match = text.match(/引用自\s+(?:\[at\]([\s\S]+?)\[\/at\]|(.+?))\s*[：:]/i);
  const authorText = (match?.[1] ?? match?.[2])?.replace(/^@/, '').trim();

  if (authorText) {
    return authorText;
  }

  const authorLinkText = quote.querySelector('a')?.textContent?.replace(/^@/, '').trim();

  return authorLinkText || '匿名用户';
}

function getLegacyRenderedQuoteText(quote: Element, author: string) {
  const text = (quote.textContent ?? '').replace(/\s+/g, ' ').trim();
  const escapedAuthor = escapeRegExp(author);
  const authorPattern = `(?:\\[at\\]\\s*${escapedAuthor}\\s*\\[\\/at\\]|@?${escapedAuthor})`;
  const content = text.replace(new RegExp(`^引用自\\s+${authorPattern}\\s*[：:]\\s*`, 'i'), '').trim();

  return content;
}

function renderLegacyInlineMarkupForNewForum(root: HTMLElement, ownerDocument: Document) {
  const textNodes: Text[] = [];

  collectLegacyInlineMarkupTextNodes(root, textNodes);

  textNodes.forEach((textNode) => {
    replaceLegacyInlineMarkupInTextNode(textNode, ownerDocument);
  });
}

function collectLegacyInlineMarkupTextNodes(node: Node, textNodes: Text[]) {
  if (node.nodeType === 1) {
    const tagName = (node as Element).tagName.toLowerCase();

    if (LEGACY_INLINE_MARKUP_IGNORED_TEXT_PARENTS.has(tagName)) {
      return;
    }
  }

  if (node.nodeType === 3) {
    const text = node.textContent ?? '';

    if (hasLegacyInlineMarkup(text)) {
      textNodes.push(node as Text);
    }

    return;
  }

  Array.from(node.childNodes).forEach((childNode) => collectLegacyInlineMarkupTextNodes(childNode, textNodes));
}

function replaceLegacyInlineMarkupInTextNode(textNode: Text, ownerDocument: Document) {
  if (typeof DOMParser === 'undefined') {
    return;
  }

  const text = textNode.textContent ?? '';
  const document = new DOMParser().parseFromString(translateLegacyInlineMarkupForQuote(text), 'text/html');
  const fragment = ownerDocument.createDocumentFragment();

  sanitizeQuoteContentContainer(document.body);
  normalizeLegacyTypographyForNewForum(document.body);
  renderLegacyMentionsForNewForum(document.body, document);

  Array.from(document.body.childNodes).forEach((childNode) => {
    fragment.append(ownerDocument.importNode(childNode, true));
  });

  textNode.replaceWith(fragment);
}

function renderLegacyMentionsForNewForum(root: HTMLElement, ownerDocument: Document) {
  const textNodes: Text[] = [];

  renderLegacyMentionAnchorsForNewForum(root);
  collectLegacyMentionTextNodes(root, textNodes);

  textNodes.forEach((textNode) => {
    replaceLegacyMentionsInTextNode(textNode, ownerDocument);
  });
}

function renderLegacyMentionAnchorsForNewForum(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLAnchorElement>('a')).forEach((anchor) => {
    const username = getLegacyMentionAnchorUsername(anchor);

    if (!username) {
      return;
    }

    anchor.classList.add('capubbs-legacy-mention');
    anchor.href = getPublicProfileAppPath(username);
    anchor.textContent = `@${username}`;
    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
  });
}

function getLegacyMentionAnchorUsername(anchor: HTMLAnchorElement) {
  const text = anchor.textContent ?? '';
  const match = text.match(/^\s*\[at\]([\s\S]*?)\[\/at\]\s*$/i);

  return match ? normalizeLegacyMentionUsername(match[1]) : '';
}

function collectLegacyMentionTextNodes(node: Node, textNodes: Text[]) {
  if (node.nodeType === 1) {
    const tagName = (node as Element).tagName.toLowerCase();

    if (LEGACY_INLINE_MARKUP_IGNORED_TEXT_PARENTS.has(tagName)) {
      return;
    }
  }

  if (node.nodeType === 3) {
    const text = node.textContent ?? '';

    if (hasLegacyMentionMarkup(text)) {
      textNodes.push(node as Text);
    }

    return;
  }

  Array.from(node.childNodes).forEach((childNode) => collectLegacyMentionTextNodes(childNode, textNodes));
}

function replaceLegacyMentionsInTextNode(textNode: Text, ownerDocument: Document) {
  const text = textNode.textContent ?? '';
  const fragment = ownerDocument.createDocumentFragment();
  let consumedIndex = 0;
  let didReplace = false;
  let match: RegExpExecArray | null;

  LEGACY_AT_PATTERN.lastIndex = 0;

  while ((match = LEGACY_AT_PATTERN.exec(text)) !== null) {
    const username = normalizeLegacyMentionUsername(match[1]);

    if (!username) {
      continue;
    }

    fragment.append(ownerDocument.createTextNode(text.slice(consumedIndex, match.index)));
    fragment.append(createLegacyMentionAnchor(ownerDocument, username));
    consumedIndex = match.index + match[0].length;
    didReplace = true;
  }

  LEGACY_AT_PATTERN.lastIndex = 0;

  if (!didReplace) {
    return;
  }

  fragment.append(ownerDocument.createTextNode(text.slice(consumedIndex)));
  textNode.replaceWith(fragment);
}

function createLegacyMentionAnchor(ownerDocument: Document, username: string) {
  const anchor = ownerDocument.createElement('a');

  anchor.className = 'capubbs-legacy-mention';
  anchor.href = getPublicProfileAppPath(username);
  anchor.textContent = `@${username}`;

  return anchor;
}

function renderLegacyTextUrlsForNewForum(root: HTMLElement, ownerDocument: Document) {
  const textNodes: Text[] = [];

  collectLegacyTextUrlNodes(root, textNodes);

  textNodes.forEach((textNode) => {
    replaceLegacyTextUrlsInTextNode(textNode, ownerDocument);
  });
}

function collectLegacyTextUrlNodes(node: Node, textNodes: Text[]) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = (node as Element).tagName.toLowerCase();

    if (LEGACY_INLINE_MARKUP_IGNORED_TEXT_PARENTS.has(tagName)) {
      return;
    }
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';

    if (hasLegacyTextUrl(text)) {
      textNodes.push(node as Text);
    }

    return;
  }

  Array.from(node.childNodes).forEach((childNode) => collectLegacyTextUrlNodes(childNode, textNodes));
}

function replaceLegacyTextUrlsInTextNode(textNode: Text, ownerDocument: Document) {
  const text = textNode.textContent ?? '';
  const fragment = ownerDocument.createDocumentFragment();
  let consumedIndex = 0;
  let didReplace = false;
  let match: RegExpExecArray | null;

  LEGACY_TEXT_URL_PATTERN.lastIndex = 0;

  while ((match = LEGACY_TEXT_URL_PATTERN.exec(text)) !== null) {
    const url = trimLegacyTextUrl(match[0]);
    const anchor = url ? createLegacyTextUrlAnchor(ownerDocument, url) : null;

    if (!anchor) {
      continue;
    }

    fragment.append(ownerDocument.createTextNode(text.slice(consumedIndex, match.index)));
    fragment.append(anchor);
    consumedIndex = match.index + url.length;
    didReplace = true;
  }

  LEGACY_TEXT_URL_PATTERN.lastIndex = 0;

  if (!didReplace) {
    return;
  }

  fragment.append(ownerDocument.createTextNode(text.slice(consumedIndex)));
  textNode.replaceWith(fragment);
}

function createLegacyTextUrlAnchor(ownerDocument: Document, url: string) {
  const href = normalizeQuoteContentUrl(url, false);

  if (!href) {
    return null;
  }

  const anchor = ownerDocument.createElement('a');

  anchor.href = href;
  anchor.textContent = url;

  return anchor;
}

function hasLegacyTextUrl(text: string) {
  LEGACY_TEXT_URL_PATTERN.lastIndex = 0;
  const hasTextUrl = LEGACY_TEXT_URL_PATTERN.test(text);
  LEGACY_TEXT_URL_PATTERN.lastIndex = 0;

  return hasTextUrl;
}

function trimLegacyTextUrl(rawUrl: string) {
  let url = rawUrl;

  while (url && LEGACY_TEXT_URL_TRAILING_PUNCTUATION.includes(url.charAt(url.length - 1))) {
    url = url.slice(0, -1);
  }

  return url;
}

function renderLegacyMentionsString(html: string) {
  return html.replace(LEGACY_AT_PATTERN, (match, rawUsername: string) => {
    const username = normalizeLegacyMentionUsername(decodeHtmlEntities(rawUsername));

    if (!username) {
      return match;
    }

    return `<a class="capubbs-legacy-mention" href="${escapeAttribute(getPublicProfileAppPath(username))}">@${escapeHtml(username)}</a>`;
  });
}

function hasLegacyMentionMarkup(text: string) {
  LEGACY_AT_PATTERN.lastIndex = 0;
  const hasMention = LEGACY_AT_PATTERN.test(text);
  LEGACY_AT_PATTERN.lastIndex = 0;

  return hasMention;
}

function normalizeLegacyMentionUsername(username: string) {
  return username.replace(/\s+/g, ' ').trim();
}

function hasLegacyInlineMarkup(text: string) {
  return LEGACY_QUOTE_INLINE_MARKUP_PATTERN.test(text) || LEGACY_RAW_INLINE_HTML_TEXT_PATTERN.test(text) || /\r?\n/.test(text);
}

function normalizeLegacyTypographyForNewForum(root: HTMLElement) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
  const legacyElements = new Set<HTMLElement>();

  elements.forEach((element) => {
    if (hasLegacyTypographyMarker(element) || (element.parentElement && legacyElements.has(element.parentElement))) {
      legacyElements.add(element);
    }
  });

  legacyElements.forEach((element) => {
    normalizeLegacyTypographyElement(element);
  });
}

function normalizeLegacyTypographyElement(element: HTMLElement) {
  const normalizedStyle = normalizeLegacyStyleText(element.getAttribute('style') ?? '');

  if (normalizedStyle) {
    element.setAttribute('style', normalizedStyle);
  } else {
    element.removeAttribute('style');
  }

  if (element.tagName.toLowerCase() === 'font') {
    element.removeAttribute('face');
    element.removeAttribute('size');
  }
}

function hasLegacyTypographyMarker(element: HTMLElement) {
  const className = element.getAttribute('class') ?? '';
  const style = element.getAttribute('style') ?? '';

  return /\bMso\w*/i.test(className) || /\bmso-|text-autospace|mso-pagination|mso-char-indent-count/i.test(style);
}

function normalizeLegacyTypographyString(html: string) {
  if (!hasLegacyTypographyStyleMarker(html)) {
    return html;
  }

  return html
    .replace(/\sstyle=(["'])([\s\S]*?)\1/gi, (_match, quote: string, style: string) => {
      const normalizedStyle = normalizeLegacyStyleText(style);

      return normalizedStyle ? ` style=${quote}${normalizedStyle}${quote}` : '';
    })
    .replace(/<font\b([^>]*)>/gi, (_match, rawAttributes: string) => {
      const attributes = String(rawAttributes)
        .replace(/\s+(?:face|size)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .trim();

      return attributes ? `<font ${attributes}>` : '<font>';
    });
}

function normalizeLegacyStyleText(style: string) {
  return style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const property = declaration.split(':', 1)[0]?.trim() ?? '';

      return property && !isLegacyTypographyStyleProperty(property);
    })
    .join('; ');
}

function hasLegacyTypographyStyleMarker(style: string) {
  return /\bmso-|text-autospace|mso-pagination|mso-char-indent-count/i.test(style);
}

function isLegacyTypographyStyleProperty(property: string) {
  const normalizedProperty = property.trim().toLowerCase();

  return normalizedProperty.startsWith('mso-') || LEGACY_TYPOGRAPHY_STYLE_PROPERTIES.has(normalizedProperty);
}

function normalizeQuoteHref(href: string | undefined) {
  const value = href?.trim();

  if (!value || /^(?:javascript|data|vbscript):/i.test(value)) {
    return undefined;
  }

  const threadTarget = getThreadNavigationTargetFromUrl(value, getLegacyQuoteCurrentUrl(), import.meta.env.BASE_URL);

  if (threadTarget) {
    return getLegacyQuoteAppPath(threadTarget.path);
  }

  return /^(?:https?:|\/|#)/i.test(value) ? value : undefined;
}

function normalizeQuoteFloor(floor: number | undefined) {
  if (typeof floor !== 'number' || !Number.isFinite(floor)) {
    return undefined;
  }

  const normalizedFloor = Math.floor(floor);

  return normalizedFloor > 0 ? normalizedFloor : undefined;
}

function getFloorNumberFromHref(href: string | undefined) {
  const value = href?.trim() ?? '';
  const match = value.match(/#floor-(\d+)\b/);

  return match ? normalizeQuoteFloor(Number(match[1])) : undefined;
}

function normalizeLegacyQuoteText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\[\/quote\]/gi, '[/ quote]')
    .trim();
}

function sanitizeLegacyQuoteAuthor(author: string) {
  return (author.trim() || '匿名用户').replace(/]/g, '');
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unescapeMarkdownLinkText(text: string) {
  return text.replace(/\\([\\[\]])/g, '$1');
}

function decodeHtmlEntities(text: string) {
  if (typeof document === 'undefined') {
    return text;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;

  return textarea.value;
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
