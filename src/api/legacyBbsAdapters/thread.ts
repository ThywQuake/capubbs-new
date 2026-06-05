import type { BoardThreadKind, ThreadActivitySignupQuestion, ThreadAttachment, ThreadAuthor, ThreadDetail, ThreadFloor, ThreadNestedReply } from '../../types/forum';
import { getLegacyForumBoardByBid } from '../../data/forumBoards';
import { getBoardPath } from '../../utils/boardRoutes';
import { renderLegacyQuotesForNewForum } from '../../utils/legacyQuote';
import { getPublicProfilePath } from '../../utils/userRoutes';
import type { LegacyBbsActivityDetail, LegacyBbsFloor, LegacyBbsNestedReply, LegacyBbsThreadFloorsResponse, LegacyBbsThreadItem, LegacyBbsThreadResponse } from '../legacyBbsClient';
import {
  formatBytes,
  getLegacyThreadId,
  getThreadBoardName,
  htmlToContentLines,
  normalizeAssetUrl,
  stripHtml,
} from './shared';

export function adaptLegacyBbsThreadDetail(
  response: LegacyBbsThreadResponse,
  floorsResponse: LegacyBbsThreadFloorsResponse = response.floorsPage,
): ThreadDetail {
  const thread = response.thread;
  const id = getLegacyThreadId(thread);
  const boardName = getThreadBoardName(thread);
  const boardPathName = getLegacyForumBoardByBid(thread.bid)?.name ?? boardName;
  const mainPost = adaptFloor(response.mainPost, 1, thread.author);
  const floors = floorsResponse.items.map((floor) => adaptFloor(floor, floor.pid, thread.author));

  return {
    id,
    title: thread.title,
    board: boardName,
    boardHref: getBoardPath(boardPathName),
    kind: getThreadKind(thread),
    author: adaptAuthor(thread.author),
    createdAt: mainPost.time || thread.updatedAt || thread.postDate,
    replies: thread.replies,
    views: thread.views,
    bookmarked: response.viewerState.bookmarked,
    bookmarks: thread.favorites,
    pinned: thread.pinned,
    globalPinned: thread.globalPinned,
    digest: thread.digest,
    locked: thread.locked,
    canReply: response.viewerState.canReply,
    canManageActivitySignup: response.viewerState.canManageActivitySignup,
    canModerate: response.viewerState.canModerate,
    canGlobalPin: response.viewerState.canGlobalPin,
    signupQuestions: adaptActivitySignupQuestions(response.activity),
    mainPost,
    floors,
    pagination: {
      authorOnly: Boolean(floorsResponse.authorOnly),
      currentPage: floorsResponse.page,
      pageSize: floorsResponse.pageSize,
      totalFloors: floorsResponse.total,
      totalPages: floorsResponse.pages,
    },
  };
}

export function adaptLegacyBbsThreadFloor(floor: LegacyBbsFloor, threadAuthor: string): ThreadFloor {
  return adaptFloor(floor, floor.pid, threadAuthor);
}

export function adaptLegacyBbsNestedReply(reply: LegacyBbsNestedReply): ThreadNestedReply {
  return adaptNestedReply(reply);
}

function adaptActivitySignupQuestions(activity: LegacyBbsActivityDetail): ThreadActivitySignupQuestion[] | undefined {
  const options = activity?.options;

  if (!Array.isArray(options)) {
    return undefined;
  }

  const questions = options
    .filter((option) => Number(option.hiden ?? 0) !== 1)
    .map<ThreadActivitySignupQuestion | null>((option) => {
      const id = String(option.option_id ?? '').trim();
      const label = String(option.option_name ?? '').trim();
      const typeId = Number(option.type_id);

      if (!id || !label) {
        return null;
      }

      return {
        id,
        label,
        options: typeId === 1 || typeId === 3
          ? (option.cases ?? [])
              .map((activityCase) => ({
                id: String(activityCase.case_id ?? '').trim(),
                label: String(activityCase.case_name ?? '').trim(),
              }))
              .filter((activityCase) => activityCase.id && activityCase.label)
          : undefined,
        required: Number(option.required) === 1,
        type: typeId === 3 ? 'multiChoice' : typeId === 1 ? 'choice' : 'text',
      };
    })
    .filter((question): question is ThreadActivitySignupQuestion => question !== null);

  return questions.length > 0 ? questions : undefined;
}

function adaptFloor(floor: LegacyBbsFloor, floorNumber: number, threadAuthor: string): ThreadFloor {
  const author = floor.author || '匿名用户';
  const renderedHtmlContent = renderLegacyQuotesForNewForum(floor.rawText || floor.contentHtml);
  const legacyEditNotice = normalizeLegacyFloorEditNotice(renderedHtmlContent, author);
  const htmlContent = legacyEditNotice.htmlContent;
  const databaseEditedAt = floor.updatedAt && floor.updatedAt !== floor.createdAt ? floor.updatedAt : undefined;

  return {
    id: `${floor.bid}-${floor.tid}-${floor.pid}`,
    floor: Math.max(1, floorNumber),
    fid: floor.fid > 0 ? floor.fid : undefined,
    author: adaptAuthor(author, author === threadAuthor ? '楼主' : undefined, floor.authorAvatar, floor.authorStar),
    time: floor.createdAt || '',
    editedAt: legacyEditNotice.editedAt ?? databaseEditedAt,
    content: getFloorContentLines(htmlContent),
    htmlContent,
    signatureHtml: floor.signatureHtml,
    signatureIndex: floor.signatureIndex > 0 ? floor.signatureIndex : undefined,
    attachments: floor.attachments.map(adaptAttachment),
    nestedReplies: floor.nestedReplies.map(adaptNestedReply),
  };
}

function getFloorContentLines(htmlContent: string) {
  const content = htmlToContentLines(htmlContent);

  return /<\s*strike\b/i.test(htmlContent) && !content.includes('报名状态：已取消')
    ? [...content, '报名状态：已取消']
    : content;
}

function adaptAttachment(attachment: LegacyBbsFloor['attachments'][number]): ThreadAttachment {
  return {
    name: attachment.name || `附件 ${attachment.id}`,
    meta: formatBytes(attachment.size),
    href: normalizeAssetUrl(attachment.path) ?? '#',
  };
}

function adaptNestedReply(reply: LegacyBbsNestedReply): ThreadNestedReply {
  const author = reply.author || '匿名用户';
  const parsedReplyTarget = parseNestedReplyTarget(reply.content);

  return {
    id: String(reply.id),
    fid: reply.fid > 0 ? reply.fid : undefined,
    author,
    authorHref: getPublicProfilePath(author),
    target: parsedReplyTarget?.target,
    targetHref: parsedReplyTarget ? getPublicProfilePath(parsedReplyTarget.target) : undefined,
    content: stripHtml(parsedReplyTarget?.content ?? reply.content),
    time: reply.createdAt || '',
  };
}

function parseNestedReplyTarget(content: string) {
  const text = stripHtml(content).trim();
  const match = text.match(/^回复\s+@(.+?)[：:]\s*([\s\S]*)$/);

  if (!match) {
    return null;
  }

  return {
    target: match[1].trim(),
    content: match[2].trim(),
  };
}

type LegacyFloorEditNotice = {
  editedAt: string;
  editor: string;
};

type NormalizedLegacyFloorEditNotice = {
  editedAt?: string;
  htmlContent: string;
};

const LEGACY_FLOOR_EDIT_NOTICE_CORE_PATTERN =
  /此[贴帖]子由\s*(.{1,80}?)\s*在\s*(\d{4}[-.]\d{1,2}[-.]\d{1,2}\s+\d{1,2}[:：.]\d{2}(?:[:：.]\d{2})?)\s*编辑过[。.]?/g;
const LEGACY_FLOOR_EDIT_NOTICE_TAIL_PATTERN =
  /[\s\u00a0]*此[贴帖]子由\s*(.{1,80}?)\s*在\s*(\d{4}[-.]\d{1,2}[-.]\d{1,2}\s+\d{1,2}[:：.]\d{2}(?:[:：.]\d{2})?)\s*编辑过[。.]?\s*$/;
const LEGACY_FLOOR_TRAILING_SEPARATOR_PATTERN = /(?:\s|&nbsp;|<\s*br\s*\/?\s*>)*$/i;
const DOM_TEXT_NODE = 3;
const DOM_ELEMENT_NODE = 1;
const DOM_TEXT_NODE_FILTER = 4;
const TRAILING_EMPTY_ELEMENT_MEDIA_SELECTOR = 'audio, canvas, embed, iframe, img, object, svg, table, video';

function normalizeLegacyFloorEditNotice(htmlContent: string, floorAuthor: string): NormalizedLegacyFloorEditNotice {
  const notice = getTrailingLegacyFloorEditNotice(stripHtml(htmlContent));

  if (!notice || !isSameLegacyFloorEditor(notice.editor, floorAuthor)) {
    return { htmlContent };
  }

  const cleanedHtmlContent =
    removeTrailingLegacyFloorEditNoticeFromHtml(htmlContent, notice) ??
    removeTrailingLegacyFloorEditNoticeString(htmlContent, notice);

  if (typeof cleanedHtmlContent !== 'string' || cleanedHtmlContent === htmlContent) {
    return { htmlContent };
  }

  return {
    editedAt: notice.editedAt,
    htmlContent: cleanedHtmlContent,
  };
}

function getTrailingLegacyFloorEditNotice(text: string): LegacyFloorEditNotice | null {
  const normalizedText = decodeLegacyFloorEditNoticeText(text).replace(/\s+/g, ' ').trim();
  let notice: LegacyFloorEditNotice | null = null;

  LEGACY_FLOOR_EDIT_NOTICE_CORE_PATTERN.lastIndex = 0;

  for (const match of normalizedText.matchAll(LEGACY_FLOOR_EDIT_NOTICE_CORE_PATTERN)) {
    const matchIndex = match.index ?? -1;
    const matchEnd = matchIndex + match[0].length;

    if (matchIndex < 0 || normalizedText.slice(matchEnd).trim()) {
      continue;
    }

    notice = {
      editedAt: normalizeLegacyFloorEditNoticeTimestamp(match[2]),
      editor: normalizeLegacyFloorEditNoticeEditor(match[1]),
    };
  }

  return notice;
}

function removeTrailingLegacyFloorEditNoticeFromHtml(
  htmlContent: string,
  notice: LegacyFloorEditNotice,
): string | null {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const document = new DOMParser().parseFromString(htmlContent, 'text/html');

  trimTrailingFloorContent(document.body);

  if (removeTrailingLegacyFloorEditNoticeElement(document.body, notice)) {
    trimTrailingFloorContent(document.body);
    return document.body.innerHTML.trim();
  }

  const textNode = getLastMeaningfulTextNode(document.body);
  const match = textNode?.data.match(LEGACY_FLOOR_EDIT_NOTICE_TAIL_PATTERN);

  if (!textNode || !match) {
    return null;
  }

  const textNodeNotice = {
    editedAt: normalizeLegacyFloorEditNoticeTimestamp(match[2]),
    editor: normalizeLegacyFloorEditNoticeEditor(match[1]),
  };

  if (!isSameLegacyFloorEditor(textNodeNotice.editor, notice.editor) || textNodeNotice.editedAt !== notice.editedAt) {
    return null;
  }

  textNode.data = textNode.data.slice(0, match.index).replace(/[\s\u00a0]+$/g, '');
  trimTrailingFloorContent(document.body);

  return document.body.innerHTML.trim();
}

function removeTrailingLegacyFloorEditNoticeElement(root: HTMLElement, notice: LegacyFloorEditNotice) {
  const element = getLastMeaningfulElement(root);

  if (!element || element === root) {
    return false;
  }

  const elementText = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  const match = elementText.match(new RegExp(`^${LEGACY_FLOOR_EDIT_NOTICE_TAIL_PATTERN.source}`));

  if (!match) {
    return false;
  }

  const elementNotice = {
    editedAt: normalizeLegacyFloorEditNoticeTimestamp(match[2]),
    editor: normalizeLegacyFloorEditNoticeEditor(match[1]),
  };

  if (!isSameLegacyFloorEditor(elementNotice.editor, notice.editor) || elementNotice.editedAt !== notice.editedAt) {
    return false;
  }

  element.remove();

  return true;
}

function removeTrailingLegacyFloorEditNoticeString(htmlContent: string, notice: LegacyFloorEditNotice) {
  const escapedEditor = escapeRegExp(notice.editor);
  const escapedEditedAt = escapeRegExp(notice.editedAt);
  const pattern = new RegExp(
    `(?:\\s|&nbsp;|<\\s*br\\s*\\/?\\s*>)*此[贴帖]子由\\s*${escapedEditor}\\s*在\\s*${escapedEditedAt}\\s*编辑过[。.]?${LEGACY_FLOOR_TRAILING_SEPARATOR_PATTERN.source}$`,
    'i',
  );
  const cleanedHtmlContent = htmlContent.replace(pattern, '').trim();

  return cleanedHtmlContent === htmlContent ? null : cleanedHtmlContent;
}

function getLastMeaningfulElement(root: HTMLElement) {
  let current: Element | null = root;

  while (current?.lastElementChild) {
    const child: Element = current.lastElementChild;

    if (!child.textContent?.trim() && !child.querySelector(TRAILING_EMPTY_ELEMENT_MEDIA_SELECTOR)) {
      child.remove();
      continue;
    }

    current = child;
  }

  return current;
}

function getLastMeaningfulTextNode(root: HTMLElement) {
  const walker = root.ownerDocument.createTreeWalker(root, DOM_TEXT_NODE_FILTER);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (node.nodeType === DOM_TEXT_NODE && node.textContent?.trim()) {
      textNodes.push(node as Text);
    }
  }

  return textNodes.at(-1) ?? null;
}

function trimTrailingFloorContent(parent: Element) {
  while (parent.lastChild) {
    const child = parent.lastChild;

    if (child.nodeType === DOM_TEXT_NODE) {
      const trimmedText = (child.textContent ?? '').replace(/[\s\u00a0]+$/g, '');

      if (trimmedText) {
        child.textContent = trimmedText;
        return;
      }

      child.remove();
      continue;
    }

    if (child.nodeType !== DOM_ELEMENT_NODE) {
      child.remove();
      continue;
    }

    const element = child as Element;

    if (element.tagName.toLowerCase() === 'br') {
      element.remove();
      continue;
    }

    trimTrailingFloorContent(element);

    if (!element.textContent?.trim() && !element.querySelector(TRAILING_EMPTY_ELEMENT_MEDIA_SELECTOR)) {
      element.remove();
      continue;
    }

    return;
  }
}

function normalizeLegacyFloorEditNoticeEditor(editor: string) {
  return decodeLegacyFloorEditNoticeText(editor)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^@+/, '');
}

function normalizeLegacyFloorEditNoticeTimestamp(timestamp: string) {
  return timestamp.trim().replace(/：/g, ':');
}

function isSameLegacyFloorEditor(left: string, right: string) {
  return normalizeLegacyFloorEditNoticeEditor(left).toLowerCase() === normalizeLegacyFloorEditNoticeEditor(right).toLowerCase();
}

function decodeLegacyFloorEditNoticeText(text: string) {
  if (typeof document === 'undefined') {
    return text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"');
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;

  return textarea.value;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function adaptAuthor(name: string, role?: string, avatarSrc?: string, starLevel?: number): ThreadAuthor {
  const displayName = name || '匿名用户';
  const normalizedStarLevel = getLegacyAuthorStarLevel(starLevel);

  return {
    avatarSrc,
    id: displayName,
    name: displayName,
    href: getPublicProfilePath(displayName),
    rating: normalizedStarLevel > 0 ? '★'.repeat(normalizedStarLevel) : '',
    role,
    starLevel: normalizedStarLevel,
  };
}

function getLegacyAuthorStarLevel(starLevel: number | undefined) {
  const normalizedStarLevel = Math.floor(Number(starLevel));

  return Number.isFinite(normalizedStarLevel) ? Math.min(9, Math.max(0, normalizedStarLevel)) : 0;
}

function getThreadKind(thread: LegacyBbsThreadItem): BoardThreadKind {
  if (thread.isActivity) {
    return 'activity';
  }

  return thread.digest ? 'digest' : 'discussion';
}
