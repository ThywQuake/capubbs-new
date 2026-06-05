import type { BoardThread, BoardThreadKind, ThreadAttachment, ThreadAuthor, ThreadDetail, ThreadFloor } from '../types/forum';
import {
  ACTIVITY_SIGNUP_BOARD_NAME,
  activitySignupQuestionTypeOptions,
  normalizeActivitySignupQuestion,
  type ActivityCoverImage,
  type ActivitySignupQuestion,
  type ActivitySignupQuestionType,
} from './activitySignup';
import { getBoardNewThreadPath, getBoardPath } from './boardRoutes';
import { getPublicProfilePath } from './userRoutes';

const THREAD_COMPOSE_DRAFTS_KEY_PREFIX = 'capubbs-thread-compose-drafts:v1';
const THREAD_COMPOSE_DRAFT_CHANGE_EVENT = 'capubbs-thread-compose-drafts-change';
const THREAD_COMPOSED_THREADS_KEY = 'capubbs-composed-threads';
const ACTIVITY_SIGNUP_SETTINGS_OVERRIDES_KEY = 'capubbs-activity-signup-settings-overrides';

export type SignupQuestionType = ActivitySignupQuestionType;
export type SignupQuestionDraft = ActivitySignupQuestion;

export type ThreadComposeDraftPayload = {
  activityCoverImage: ActivityCoverImage | null;
  attachments: ThreadAttachment[];
  content: string;
  contentMode: 'html' | 'markdown' | 'rich';
  signupEnabled: boolean;
  signupEnd: string;
  signupQuestions: SignupQuestionDraft[];
  signupStart: string;
  signatureIndex: number;
  title: string;
  updatedAt: string;
};

export type StoredThreadComposeDraft = ThreadComposeDraftPayload & {
  board: string;
  boardHref: string;
  excerpt: string;
  href: string;
  id: string;
};

export type PublishThreadPayload = Omit<ThreadComposeDraftPayload, 'updatedAt'> & {
  contentParagraphs: string[];
};

type PublishedThreadRecord = PublishThreadPayload & {
  authorName: string;
  board: string;
  createdAt: string;
  id: string;
};

export type ActivitySignupSettings = {
  closesAt: string;
  coverImage: ActivityCoverImage | null;
  opensAt: string;
  questions: SignupQuestionDraft[];
};

type ActivitySignupSettingsOverride = Partial<ActivitySignupSettings> & {
  updatedAt: string;
};

const currentAuthor: ThreadAuthor = {
  id: 'blueFrame',
  name: '蓝色车架',
  href: getPublicProfilePath('蓝色车架'),
  rating: '★★★☆',
  role: '楼主',
};

export function readThreadComposeDraft(boardName: string, ownerKey: string | null | undefined) {
  return readDrafts(ownerKey)[boardName] ?? null;
}

export function readThreadComposeDrafts(ownerKey: string | null | undefined): StoredThreadComposeDraft[] {
  return Object.entries(readDrafts(ownerKey))
    .map(([boardName, draft]) => mapStoredThreadComposeDraft(boardName, draft))
    .sort((firstDraft, secondDraft) => secondDraft.updatedAt.localeCompare(firstDraft.updatedAt));
}

export function saveThreadComposeDraft(
  boardName: string,
  draft: Omit<ThreadComposeDraftPayload, 'updatedAt'>,
  ownerKey: string | null | undefined,
) {
  const storageKey = getThreadComposeDraftsStorageKey(ownerKey);

  if (!storageKey) {
    return;
  }

  const drafts = readDrafts(ownerKey);

  drafts[boardName] = {
    ...draft,
    ...getSignupFieldsForBoard(boardName, draft),
    updatedAt: makeLocalTimestamp(),
  };

  writeJson(storageKey, drafts);
  notifyThreadComposeDraftChange(storageKey);
}

export function clearThreadComposeDraft(boardName: string, ownerKey: string | null | undefined) {
  const storageKey = getThreadComposeDraftsStorageKey(ownerKey);

  if (!storageKey) {
    return;
  }

  const drafts = readDrafts(ownerKey);

  delete drafts[boardName];
  writeJson(storageKey, drafts);
  notifyThreadComposeDraftChange(storageKey);
}

export function deleteThreadComposeDraft(boardName: string, ownerKey: string | null | undefined) {
  const storageKey = getThreadComposeDraftsStorageKey(ownerKey);

  if (!storageKey) {
    return false;
  }

  const drafts = readDrafts(ownerKey);

  if (!Object.prototype.hasOwnProperty.call(drafts, boardName)) {
    return false;
  }

  delete drafts[boardName];
  writeJson(storageKey, drafts);
  notifyThreadComposeDraftChange(storageKey);

  return true;
}

export function subscribeThreadComposeDrafts(listener: () => void, ownerKey: string | null | undefined) {
  const storageKey = getThreadComposeDraftsStorageKey(ownerKey);

  if (!storageKey || typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) {
      listener();
    }
  };
  const handleDraftChange = (event: Event) => {
    const draftEvent = event as CustomEvent<{ storageKey?: string }>;

    if (draftEvent.detail?.storageKey === storageKey) {
      listener();
    }
  };

  window.addEventListener(THREAD_COMPOSE_DRAFT_CHANGE_EVENT, handleDraftChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(THREAD_COMPOSE_DRAFT_CHANGE_EVENT, handleDraftChange);
    window.removeEventListener('storage', handleStorage);
  };
}

export function publishComposedThread(boardName: string, payload: PublishThreadPayload) {
  const record: PublishedThreadRecord = {
    ...payload,
    ...getSignupFieldsForBoard(boardName, payload),
    authorName: currentAuthor.name,
    board: boardName,
    createdAt: makeLocalTimestamp(),
    id: `local-${slugifyBoard(boardName)}-${Date.now().toString(36)}`,
  };
  const records = readPublishedThreads().filter((thread) => thread.id !== record.id);

  writeJson(THREAD_COMPOSED_THREADS_KEY, [record, ...records]);

  return record;
}

export function getPublishedBoardThreads(boardName: string): BoardThread[] {
  return readPublishedThreads()
    .filter((thread) => thread.board === boardName)
    .map((thread) => {
      const kind = getPublishedThreadKind(thread);

      return {
        author: thread.authorName,
        authorHref: currentAuthor.href,
        createdAt: thread.createdAt,
        href: `#thread-${thread.id}`,
        id: thread.id,
        kind,
        lastReplyAt: thread.createdAt,
        lastReplyBy: thread.authorName,
        openForSignup: kind === 'activity' ? true : undefined,
        replies: 0,
        title: thread.title,
        views: 1,
      };
    });
}

export function getPublishedThreadDetail(threadId: string): ThreadDetail | null {
  const thread = readPublishedThreads().find((record) => record.id === threadId);

  if (!thread) {
    return null;
  }

  const kind = getPublishedThreadKind(thread);
  const mainPost: ThreadFloor = {
    attachments: thread.attachments,
    author: currentAuthor,
    content: thread.contentParagraphs.length > 0 ? thread.contentParagraphs : [''],
    floor: 1,
    id: `${thread.id}-floor-1`,
    time: thread.createdAt,
  };

  return {
    author: currentAuthor,
    board: thread.board,
    boardHref: getBoardPath(thread.board),
    bookmarks: 0,
    canManageActivitySignup: kind === 'activity' || undefined,
    canModerate: true,
    createdAt: thread.createdAt,
    floors: [],
    id: thread.id,
    kind,
    mainPost,
    replies: 0,
    title: thread.title,
    views: 1,
  };
}

export function getPublishedThreadDetails() {
  return readPublishedThreads()
    .map((thread) => getPublishedThreadDetail(thread.id))
    .filter((thread): thread is ThreadDetail => thread !== null);
}

export function getPublishedThreadSignupSettings(threadId: string) {
  const thread = readPublishedThreads().find((record) => record.id === threadId);
  const override = readActivitySignupSettingsOverrides()[threadId] ?? null;

  if (thread && getPublishedThreadKind(thread) !== 'activity') {
    return null;
  }

  if (!thread && !override) {
    return null;
  }

  const overrideHasCoverImage = Boolean(
    override && Object.prototype.hasOwnProperty.call(override, 'coverImage'),
  );

  return {
    closesAt: override?.closesAt ?? thread?.signupEnd ?? '',
    coverImage: overrideHasCoverImage ? override?.coverImage ?? null : thread?.activityCoverImage ?? null,
    opensAt: override?.opensAt ?? thread?.signupStart ?? '',
    questions: override?.questions
      ? normalizeSignupQuestions(override.questions)
      : normalizeSignupQuestions(Array.isArray(thread?.signupQuestions) ? thread.signupQuestions : []),
  };
}

export function saveActivitySignupSettings(threadId: string, settings: Partial<ActivitySignupSettings>) {
  const overrides = readActivitySignupSettingsOverrides();
  const previousOverride = overrides[threadId] ?? {};
  const nextOverride: ActivitySignupSettingsOverride = {
    ...previousOverride,
    updatedAt: makeLocalTimestamp(),
  };

  if (typeof settings.closesAt === 'string') {
    nextOverride.closesAt = settings.closesAt;
  }

  if (typeof settings.opensAt === 'string') {
    nextOverride.opensAt = settings.opensAt;
  }

  if (Array.isArray(settings.questions)) {
    nextOverride.questions = normalizeSignupQuestions(settings.questions);
  }

  if (Object.prototype.hasOwnProperty.call(settings, 'coverImage')) {
    nextOverride.coverImage = sanitizeActivityCoverImage(settings.coverImage) ?? null;
  }

  overrides[threadId] = nextOverride;
  writeJson(ACTIVITY_SIGNUP_SETTINGS_OVERRIDES_KEY, overrides);
}

function getPublishedThreadKind(thread: Pick<PublishedThreadRecord, 'board' | 'signupEnabled'>): BoardThreadKind {
  return thread.signupEnabled && thread.board === ACTIVITY_SIGNUP_BOARD_NAME ? 'activity' : 'discussion';
}

function mapStoredThreadComposeDraft(boardName: string, draft: ThreadComposeDraftPayload): StoredThreadComposeDraft {
  return {
    ...draft,
    board: boardName,
    boardHref: getBoardPath(boardName),
    excerpt: getThreadComposeDraftExcerpt(draft),
    href: getBoardNewThreadPath(boardName),
    id: `thread-compose:${boardName}`,
  };
}

function readDrafts(ownerKey: string | null | undefined): Record<string, ThreadComposeDraftPayload> {
  const storageKey = getThreadComposeDraftsStorageKey(ownerKey);

  if (!storageKey) {
    return {};
  }

  const value = readJson(storageKey);

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, ThreadComposeDraftPayload>>((drafts, [boardName, draft]) => {
    const sanitizedDraft = sanitizeDraft(draft);

    if (sanitizedDraft) {
      drafts[boardName] = {
        ...sanitizedDraft,
        ...getSignupFieldsForBoard(boardName, sanitizedDraft),
      };
    }

    return drafts;
  }, {});
}

function getThreadComposeDraftsStorageKey(ownerKey: string | null | undefined) {
  const normalizedOwnerKey = ownerKey?.trim();

  return normalizedOwnerKey
    ? `${THREAD_COMPOSE_DRAFTS_KEY_PREFIX}:${encodeURIComponent(normalizedOwnerKey)}`
    : null;
}

function readPublishedThreads(): PublishedThreadRecord[] {
  const value = readJson(THREAD_COMPOSED_THREADS_KEY);

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPublishedThreadRecord);
}

function sanitizeDraft(value: unknown): ThreadComposeDraftPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const draft = value as Partial<ThreadComposeDraftPayload>;

  return {
    attachments: Array.isArray(draft.attachments) ? draft.attachments.filter(isThreadAttachment) : [],
    activityCoverImage: sanitizeActivityCoverImage(draft.activityCoverImage),
    content: typeof draft.content === 'string' ? draft.content : '',
    contentMode:
      draft.contentMode === 'markdown' || draft.contentMode === 'html' ? draft.contentMode : 'rich',
    signupEnabled: Boolean(draft.signupEnabled),
    signupEnd: typeof draft.signupEnd === 'string' ? draft.signupEnd : '',
    signupQuestions: Array.isArray(draft.signupQuestions)
      ? draft.signupQuestions.map(sanitizeSignupQuestion).filter((question): question is SignupQuestionDraft => question !== null)
      : [],
    signupStart: typeof draft.signupStart === 'string' ? draft.signupStart : '',
    signatureIndex: getSignatureIndex(draft.signatureIndex),
    title: typeof draft.title === 'string' ? draft.title : '',
    updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : '',
  };
}

function isPublishedThreadRecord(value: unknown): value is PublishedThreadRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Partial<PublishedThreadRecord>;

  return (
    typeof record.authorName === 'string' &&
    typeof record.board === 'string' &&
    typeof record.content === 'string' &&
    Array.isArray(record.contentParagraphs) &&
    typeof record.createdAt === 'string' &&
    typeof record.id === 'string' &&
    typeof record.title === 'string'
  );
}

function sanitizeSignupQuestion(value: unknown): SignupQuestionDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const question = value as Record<string, unknown>;
  const sanitizedQuestion: SignupQuestionDraft = {
    id: typeof question.id === 'string' ? question.id : makeQuestionId(),
    label: typeof question.label === 'string' ? question.label : '',
    required: Boolean(question.required),
    type: getSignupQuestionType(question.type),
  };
  const options = Array.isArray(question.options)
    ? question.options.filter((option): option is string => typeof option === 'string')
    : [];
  const min = getFiniteNumber(question.min);
  const max = getFiniteNumber(question.max);

  if (options.length > 0) {
    sanitizedQuestion.options = options;
  }

  if (min !== null) {
    sanitizedQuestion.min = min;
  }

  if (max !== null) {
    sanitizedQuestion.max = max;
  }

  return normalizeActivitySignupQuestion(sanitizedQuestion);
}

function getSignupFieldsForBoard(
  boardName: string,
  draft: Pick<ThreadComposeDraftPayload, 'activityCoverImage' | 'signupEnabled' | 'signupEnd' | 'signupQuestions' | 'signupStart'>,
) {
  const signupEnabled = boardName === ACTIVITY_SIGNUP_BOARD_NAME && Boolean(draft.signupEnabled);

  return {
    activityCoverImage: signupEnabled ? sanitizeActivityCoverImage(draft.activityCoverImage) : null,
    signupEnabled,
    signupEnd: signupEnabled ? draft.signupEnd : '',
    signupQuestions: signupEnabled ? normalizeSignupQuestions(draft.signupQuestions) : [],
    signupStart: signupEnabled ? draft.signupStart : '',
  };
}

function normalizeSignupQuestions(questions: unknown[]) {
  return questions.map(sanitizeSignupQuestion).filter((question): question is SignupQuestionDraft => question !== null);
}

function readActivitySignupSettingsOverrides(): Record<string, ActivitySignupSettingsOverride> {
  const value = readJson(ACTIVITY_SIGNUP_SETTINGS_OVERRIDES_KEY);

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, ActivitySignupSettingsOverride>>((overrides, [threadId, settings]) => {
    const sanitizedSettings = sanitizeActivitySignupSettingsOverride(settings);

    if (sanitizedSettings) {
      overrides[threadId] = sanitizedSettings;
    }

    return overrides;
  }, {});
}

function sanitizeActivitySignupSettingsOverride(value: unknown): ActivitySignupSettingsOverride | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const settings = value as Partial<ActivitySignupSettingsOverride>;
  const override: ActivitySignupSettingsOverride = {
    updatedAt: typeof settings.updatedAt === 'string' ? settings.updatedAt : '',
  };

  if (typeof settings.closesAt === 'string') {
    override.closesAt = settings.closesAt;
  }

  if (typeof settings.opensAt === 'string') {
    override.opensAt = settings.opensAt;
  }

  if (Array.isArray(settings.questions)) {
    override.questions = normalizeSignupQuestions(settings.questions);
  }

  if (Object.prototype.hasOwnProperty.call(settings, 'coverImage')) {
    override.coverImage = sanitizeActivityCoverImage(settings.coverImage) ?? null;
  }

  return override;
}

function sanitizeActivityCoverImage(value: unknown): ActivityCoverImage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const coverImage = value as Partial<ActivityCoverImage>;

  if (
    typeof coverImage.dataUrl !== 'string' ||
    typeof coverImage.meta !== 'string' ||
    typeof coverImage.name !== 'string'
  ) {
    return null;
  }

  return {
    dataUrl: coverImage.dataUrl,
    meta: coverImage.meta,
    name: coverImage.name,
  };
}

function getSignupQuestionType(value: unknown): ActivitySignupQuestionType {
  if (typeof value !== 'string') {
    return 'text';
  }

  if (isSignupQuestionType(value)) {
    return value;
  }

  if (value === 'longText') {
    return 'textarea';
  }

  if (value === 'singleChoice') {
    return 'radio';
  }

  return 'text';
}

function isSignupQuestionType(value: string): value is ActivitySignupQuestionType {
  return activitySignupQuestionTypeOptions.some((option) => option.value === value);
}

function getFiniteNumber(value: unknown) {
  if (typeof value !== 'number') {
    return null;
  }

  return Number.isFinite(value) ? value : null;
}

function getSignatureIndex(value: unknown) {
  const signatureIndex = getFiniteNumber(value);

  return signatureIndex && signatureIndex >= 1 && signatureIndex <= 3 ? signatureIndex : 0;
}

function isThreadAttachment(value: unknown): value is ThreadAttachment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const attachment = value as Partial<ThreadAttachment>;

  return (
    typeof attachment.href === 'string' &&
    typeof attachment.meta === 'string' &&
    typeof attachment.name === 'string'
  );
}

function readJson(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Drafts are a local convenience layer; failed writes should not interrupt editing.
  }
}

function notifyThreadComposeDraftChange(storageKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(THREAD_COMPOSE_DRAFT_CHANGE_EVENT, { detail: { storageKey } }));
}

function getThreadComposeDraftExcerpt(draft: Pick<ThreadComposeDraftPayload, 'attachments' | 'content' | 'contentMode'>) {
  const text = draft.contentMode === 'rich' || draft.contentMode === 'html'
    ? getHtmlPlainText(draft.content)
    : draft.content.replace(/[#*_>`\-[\]()]/g, ' ').replace(/\s+/g, ' ').trim();

  if (text) {
    return text;
  }

  return draft.attachments.length > 0 ? '附件发帖草稿' : '空白发帖草稿';
}

function getHtmlPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function makeLocalTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

function makeQuestionId() {
  return `question-${Date.now().toString(36)}`;
}

function slugifyBoard(boardName: string) {
  const encodedBoard = encodeURIComponent(boardName).replace(/%/g, '').toLowerCase();

  return encodedBoard || 'board';
}
