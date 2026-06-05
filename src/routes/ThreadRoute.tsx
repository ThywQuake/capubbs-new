import {
  ArrowLeft,
  Ban,
  Bookmark,
  Eye,
  FileText,
  Lock,
  LogIn,
  Maximize2,
  MessageCircle,
  MessageSquareQuote,
  Paperclip,
  Pencil,
  Reply,
  Save,
  Send,
  Settings,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LEGACY_THREAD_CONTENT_PAGE_SIZE, useLegacyBbs, useLegacyBbsThreadDetail } from '../api/LegacyBbsDataContext';
import { adaptLegacyBbsNestedReply, adaptLegacyBbsThreadFloor } from '../api/legacyBbsAdapters';
import {
  legacyBbsPost,
  type LegacyBbsActivitySignupResponse,
  type LegacyBbsBookmarkState,
  type LegacyBbsNestedReply,
  type LegacyBbsViewer,
  type LegacyBbsWritePostResponse,
} from '../api/legacyBbsClient';
import defaultActivityCover from '../assets/activity/activity.avif';
import { Avatar } from '../components/common/Avatar';
import { markdownFloorQuoteMetaPattern } from '../components/editor/RichTextEditor.constants';
import {
  getRichTextEditorStorageValue,
  RichTextEditor,
  type RichTextEditorValue,
} from '../components/editor/RichTextEditor';
import { Metric, ToggleMetric } from '../components/feed/Metric';
import {
  getSignatureOptionByIndex,
  normalizeSignatureIndex,
  SignatureSelector,
  useLegacySignatureOptions,
  type LegacySignatureOption,
  type SignatureLoadStatus,
} from '../components/thread/SignatureSelector';
import {
  ThreadFloorContentFrame,
  ThreadFloorSignatureFrame,
  type ThreadLinkNavigateHandler,
} from '../components/thread/ThreadFloorContentFrame';
import { PaginationControls } from '../components/user/PaginationControls';
import { getThreadDetail } from '../data/threadDetails';
import type { ThreadActivitySignupQuestion, ThreadAttachment, ThreadAuthor, ThreadDetail, ThreadFloor, ThreadNestedReply } from '../types/forum';
import { getActivityGradientClass } from '../utils/activityGradients';
import {
  activitySignupGroups,
  formatActivitySignupContent,
  getEmptyActivitySignupDraft,
  getActivitySignupDraftFromFloor,
  hasActivitySignupValue,
  isActivitySignupThread,
  isCanceledActivitySignupFloor,
  type ActivitySignupDraft,
  type ActivitySignupValue,
} from '../utils/activitySignup';
import { canViewerPostToBoard, getBoardStarRequirementMessage } from '../utils/boardStarRequirement';
import { joinClassNames } from '../utils/classNames';
import { formatPostTimestamp } from '../utils/formatPostTimestamp';
import { getLoginPathWithReturnTo } from '../utils/authRoutes';
import {
  normalizeNewForumQuotesForLegacyStorage,
  parseMarkdownFloorQuoteStorage,
} from '../utils/legacyQuote';
import {
  readStoredReplyDraft,
  saveStoredReplyDraft,
  type StoredReplyAttachment,
} from '../utils/replyDraftStorage';
import {
  getThreadActivityAdminPath,
  getThreadFloorEditPath,
  getThreadFloorPath,
  getThreadIdFromPath,
  getThreadPath,
} from '../utils/threadRoutes';
import { getPublicProfilePath } from '../utils/userRoutes';
import { isGuestViewer } from '../utils/viewerPermissions';
import { getViewerStorageOwnerKey } from '../utils/viewerStorage';

type ThreadRouteProps = {
  enableFloatingPreview?: boolean;
  locationOverride?: ThreadRouteLocation;
  onNavigatePath?: (path: string) => void;
  onThreadLinkNavigate?: ThreadLinkNavigateHandler;
  onThreadTitleChange?: (threadId: string, title: string) => void;
  showFloorDirectory?: boolean;
  threadId: string | null;
  variant?: 'page' | 'preview';
};

type ThreadRouteLocation = {
  hash: string;
  key: string;
  pathname: string;
  search: string;
};

type ThreadPreviewTarget = {
  key: string;
  location: ThreadRouteLocation;
  path: string;
  threadId: string;
};

type FloatingPreviewPanePosition = {
  x: number;
  y: number;
};

type FloatingPreviewPaneDragState = {
  height: number;
  offsetX: number;
  offsetY: number;
  pointerId: number;
  width: number;
};

type ThreadFloorDirectoryEntry = {
  author: string;
  excerpt: string;
  floor: number;
};

type PendingDeletion =
  | {
      kind: 'thread';
      target: ThreadDetail;
    }
  | {
      kind: 'floor';
      target: ThreadFloor;
    }
  | {
      kind: 'nestedReply';
      target: ThreadNestedReply;
    }
  | {
      kind: 'cancelSignup';
      target: ThreadFloor;
    };

type NestedReplyComposerTarget = {
  target?: string;
  targetHref?: string;
};

type ReplyFloorSubmitPayload = {
  sig: number;
  text: string;
};

type ActivitySignupSubmitPayload = {
  draft: ActivitySignupDraft;
  signatureHtml: string;
  signatureIndex: number;
};

type FloorQuoteRequest = {
  author: string;
  authorHref: string;
  floor: number;
  href: string;
  id: number;
  text: string;
};

type ReplyAttachmentDraft = StoredReplyAttachment & {
  restored?: boolean;
};

type ThreadBookmarkState = {
  bookmarked: boolean;
  bookmarks: number;
};

const currentThreadUser: ThreadAuthor = {
  id: '蓝色车架',
  name: '蓝色车架',
  href: '/user-center',
  rating: '★★★',
  starLevel: 3,
};
const emptySignupQuestions: ThreadActivitySignupQuestion[] = [];
const HASH_SCROLL_RETRY_LIMIT = 25;
const FLOATING_PREVIEW_PANE_MARGIN = 12;
const FLOATING_PREVIEW_PANE_DEFAULT_WIDTH = 416;
const FLOATING_PREVIEW_PANE_DEFAULT_HEIGHT = 640;

export function ThreadRoute({
  enableFloatingPreview = true,
  locationOverride,
  onNavigatePath,
  onThreadLinkNavigate,
  onThreadTitleChange,
  showFloorDirectory = true,
  threadId,
  variant = 'page',
}: ThreadRouteProps) {
  const routerLocation = useLocation();
  const location = locationOverride ?? routerLocation;
  const navigate = useNavigate();
  const legacyBbs = useLegacyBbs();
  const isPreviewMode = variant === 'preview';
  const hashTarget = parseThreadHashTarget(location.hash, location.search);
  const searchParams = new URLSearchParams(location.search);
  const authorOnly = searchParams.get('authorOnly') === '1';
  const threadPage = getThreadPageFromSearch(location.search, hashTarget.floorNumber);
  const legacyThreadState = useLegacyBbsThreadDetail(threadId, hashTarget.floorNumber, threadPage, authorOnly);
  const staticThread = getThreadDetail(threadId);
  const rawThread = legacyThreadState.thread ?? staticThread;
  const [deletedFloorIds, setDeletedFloorIds] = useState<Record<string, boolean>>({});
  const [deletedNestedReplyIds, setDeletedNestedReplyIds] = useState<Record<string, boolean>>({});
  const [deletedThreadIds, setDeletedThreadIds] = useState<Record<string, boolean>>({});
  const [threadBookmarkOverrides, setThreadBookmarkOverrides] = useState<Record<string, ThreadBookmarkState>>({});
  const [pendingBookmarkKeys, setPendingBookmarkKeys] = useState<Record<string, boolean>>({});
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [postedFloorsByThreadId, setPostedFloorsByThreadId] = useState<Record<string, ThreadFloor[]>>({});
  const [signupFloorsByThreadId, setSignupFloorsByThreadId] = useState<Record<string, ThreadFloor[]>>({});
  const [signupFloorOverridesByThreadId, setSignupFloorOverridesByThreadId] = useState<Record<string, Record<string, ThreadFloor>>>({});
  const [canceledSignupFloorIdsByThreadId, setCanceledSignupFloorIdsByThreadId] = useState<Record<string, Record<string, boolean>>>({});
  const [localNestedRepliesByFloorId, setLocalNestedRepliesByFloorId] = useState<Record<string, ThreadNestedReply[]>>({});
  const [nestedReplyTargetsByFloorId, setNestedReplyTargetsByFloorId] = useState<Record<string, NestedReplyComposerTarget>>({});
  const [floorQuoteRequest, setFloorQuoteRequest] = useState<FloorQuoteRequest | null>(null);
  const [threadPreviewTarget, setThreadPreviewTarget] = useState<ThreadPreviewTarget | null>(null);
  const floorQuoteRequestIdRef = useRef(0);
  const lastScrolledHashRef = useRef('');
  const canUseAuthenticatedActions = !isPreviewMode && !isGuestViewer(legacyBbs.viewer);
  const currentAccountId = legacyBbs.viewer?.id ?? null;
  const currentUser = getCurrentThreadUser(legacyBbs.viewer);
  const replyDraftOwnerKey = getViewerStorageOwnerKey(legacyBbs.viewer);
  const signatureProfileName = legacyBbs.viewer?.username.trim() ?? null;
  const thread = rawThread ?? null;
  const routePath = `${location.pathname}${location.search}${location.hash}`;
  const navigateThreadPath = useCallback((path: string) => {
    if (onNavigatePath) {
      onNavigatePath(path);
      return;
    }

    navigate(path);
  }, [navigate, onNavigatePath]);
  const handleThreadLinkNavigate = useCallback<ThreadLinkNavigateHandler>((target) => {
    if (onThreadLinkNavigate) {
      return onThreadLinkNavigate(target);
    }

    const currentThreadId = thread?.id ?? threadId;

    if (
      isPreviewMode ||
      !enableFloatingPreview ||
      !currentThreadId ||
      target.threadId === currentThreadId ||
      !canOpenThreadSidePreview()
    ) {
      return false;
    }

    setThreadPreviewTarget(createThreadPreviewTarget(target.path));
    return true;
  }, [enableFloatingPreview, isPreviewMode, onThreadLinkNavigate, thread?.id, threadId]);
  const handleCloseThreadPreview = useCallback(() => {
    setThreadPreviewTarget(null);
  }, []);
  const handleThreadPageChange = (page: number) => {
    navigateThreadPath(getThreadPagePath(location.pathname, location.search, page));
  };
  const handleFloorDirectoryNavigate = (floorNumber: number) => {
    navigateThreadPath(`${location.pathname}${location.search}#floor-${floorNumber}`);

    const targetElement = getVisibleHashTargetElement(`floor-${floorNumber}`);
    if (targetElement) {
      scrollHashTargetIntoView(targetElement);
    }
  };

  useEffect(() => {
    if (!enableFloatingPreview) {
      setThreadPreviewTarget(null);
    }
  }, [enableFloatingPreview]);

  useEffect(() => {
    if (!threadId || !thread || thread.id !== threadId) {
      return;
    }

    onThreadTitleChange?.(threadId, thread.title);
  }, [onThreadTitleChange, thread, threadId]);

  useEffect(() => {
    if (!thread) {
      return;
    }

    setThreadBookmarkOverrides((current) => ({
      ...current,
      [thread.id]: {
        bookmarked: Boolean(thread.bookmarked),
        bookmarks: thread.bookmarks,
      },
    }));
  }, [thread?.bookmarked, thread?.bookmarks, thread?.id]);

  useEffect(() => {
    if (!hashTarget.targetId) {
      lastScrolledHashRef.current = '';
      return;
    }

    const targetId = hashTarget.targetId;
    const fallbackTargetId =
      hashTarget.fallbackFloorNumber && targetId !== `floor-${hashTarget.fallbackFloorNumber}`
        ? `floor-${hashTarget.fallbackFloorNumber}`
        : null;
    const threadVersion = [
      thread?.id,
      thread?.mainPost.floor,
      thread?.mainPost.nestedReplies?.map((reply) => reply.id).join(',') ?? '',
      thread?.floors
        .map((floor) => `${floor.floor}:${floor.nestedReplies?.map((reply) => reply.id).join(',') ?? ''}`)
        .join('|'),
      signupFloorsByThreadId[thread?.id ?? '']?.map((floor) => floor.floor).join(',') ?? '',
    ].join('|');
    const scrollKey = `${location.key}|${location.pathname}${location.search}${location.hash}|${threadVersion}`;
    let timeoutId: number | null = null;
    let retryCount = 0;

    const scrollToHashTarget = () => {
      const primaryElement = getVisibleHashTargetElement(targetId);
      const fallbackElement =
        primaryElement || retryCount < HASH_SCROLL_RETRY_LIMIT || !fallbackTargetId
          ? null
          : getVisibleHashTargetElement(fallbackTargetId);
      const floorElement = primaryElement ?? fallbackElement;
      if (!floorElement) {
        if (retryCount >= HASH_SCROLL_RETRY_LIMIT) {
          return;
        }

        retryCount += 1;
        timeoutId = window.setTimeout(scrollToHashTarget, 80);
        return;
      }

      if (lastScrolledHashRef.current !== scrollKey) {
        scrollHashTargetIntoView(floorElement);
        lastScrolledHashRef.current = fallbackElement ? `${scrollKey}|fallback` : scrollKey;
      }
    };

    const frame = window.requestAnimationFrame(scrollToHashTarget);

    return () => {
      window.cancelAnimationFrame(frame);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    hashTarget.fallbackFloorNumber,
    hashTarget.targetId,
    location.hash,
    location.key,
    location.pathname,
    location.search,
    signupFloorsByThreadId,
    thread,
  ]);

  if (!thread && legacyThreadState.isLegacyThreadId && legacyThreadState.status === 'loading') {
    return <ThreadDetailSkeleton showComposer={!isPreviewMode} showHeader={!isPreviewMode} />;
  }

  if (!thread && isLoginRequiredThreadError(legacyThreadState.error)) {
    return (
      <LoginRequiredPanel
        title="请登录后查看"
        description={threadId ? `当前帖子「${threadId}」所在版块需要登录后才能查看。` : '当前帖子需要登录后才能查看。'}
      />
    );
  }

  if (!thread) {
    return <ThreadNotFound threadId={threadId} />;
  }

  if (deletedThreadIds[thread.id]) {
    return <ThreadDeletedNotice thread={thread} />;
  }

  const isActivityThread = isActivitySignupThread(thread);
  const requiredStar = legacyBbs.getBoardSummary(thread.board)?.requiredStar ?? 0;
  const canReplyToThread =
    canUseAuthenticatedActions &&
    !thread.locked &&
    thread.canReply !== false &&
    canViewerPostToBoard(legacyBbs.viewer, requiredStar);
  const replyRequirementMessage = getBoardStarRequirementMessage(requiredStar);
  const replyRestrictionTitle = thread.locked ? '帖子已锁定' : '当前星级暂不能回复';
  const replyRestrictionDescription = thread.locked
    ? `《${thread.title}》已锁定，暂时不能继续回复。`
    : replyRequirementMessage || `当前账号暂不能参与《${thread.title}》的讨论。`;
  const activitySignupRestrictionTitle = thread.locked ? '帖子已锁定' : '当前星级暂不能报名';
  const activitySignupRestrictionDescription = thread.locked
    ? `《${thread.title}》已锁定，暂时不能继续报名。`
    : replyRequirementMessage || `当前账号暂不能参与《${thread.title}》的活动报名。`;
  const postedFloors = postedFloorsByThreadId[thread.id] ?? [];
  const signupFloors = signupFloorsByThreadId[thread.id] ?? [];
  const signupFloorOverrides = signupFloorOverridesByThreadId[thread.id] ?? {};
  const canceledSignupFloorIds = canceledSignupFloorIdsByThreadId[thread.id] ?? {};
  const threadFloors = thread.floors.map((floor) => signupFloorOverrides[floor.id] ?? floor);
  const visibleFloors = [...threadFloors, ...postedFloors, ...signupFloors].filter(
    (floor) =>
      !deletedFloorIds[floor.id] &&
      (!authorOnly || floor.author.name === thread.mainPost.author.name),
  );
  const currentUserSignupFloor = isActivityThread
    ? findCurrentUserActivitySignupFloor(visibleFloors, currentUser, thread.signupQuestions ?? [])
    : null;
  const currentUserSignup = currentUserSignupFloor
    ? {
        floor: currentUserSignupFloor,
        isCanceled: Boolean(canceledSignupFloorIds[currentUserSignupFloor.id] || isCanceledActivitySignupFloor(currentUserSignupFloor)),
      }
    : null;
  const threadBookmark = threadBookmarkOverrides[thread.id] ?? {
    bookmarked: Boolean(thread.bookmarked),
    bookmarks: thread.bookmarks,
  };
  const withLocalNestedReplies = (floor: ThreadFloor): ThreadFloor => {
    const localReplies = localNestedRepliesByFloorId[floor.id] ?? [];

    if (localReplies.length === 0) {
      return floor;
    }

    return {
      ...floor,
      nestedReplies: [...(floor.nestedReplies ?? []), ...localReplies],
    };
  };
  const mainPostWithLocalReplies = withLocalNestedReplies(thread.mainPost);
  const threadPagination = thread.pagination;
  const showThreadPagination = Boolean(threadPagination && threadPagination.totalPages > 1);
  const showMainPost = !threadPagination || threadPagination.currentPage <= 1;
  const floorDirectoryEntries = getThreadFloorDirectoryEntries(
    showMainPost ? [mainPostWithLocalReplies, ...visibleFloors] : visibleFloors,
  );
  const threadTarget = parseThreadTarget(thread.id);
  const applyThreadBookmarkState = (state: LegacyBbsBookmarkState) => {
    setThreadBookmarkOverrides((current) => ({
      ...current,
      [thread.id]: {
        bookmarked: state.bookmarked,
        bookmarks: state.bookmarks,
      },
    }));
  };
  const setBookmarkPending = (key: string, isPending: boolean) => {
    setPendingBookmarkKeys((current) => {
      if (!isPending && !current[key]) {
        return current;
      }

      const next = { ...current };
      if (isPending) {
        next[key] = true;
      } else {
        delete next[key];
      }

      return next;
    });
  };
  const handleThreadBookmarkChange = (isBookmarked: boolean) => {
    if (!threadTarget) {
      setThreadBookmarkOverrides((current) => ({
        ...current,
        [thread.id]: {
          ...threadBookmark,
          bookmarked: isBookmarked,
          bookmarks: Math.max(0, threadBookmark.bookmarks + (isBookmarked ? 1 : -1)),
        },
      }));
      return;
    }

    const key = `${thread.id}:thread-bookmark`;
    setBookmarkPending(key, true);
    legacyBbsPost<LegacyBbsBookmarkState>(
      '/favorites/thread',
      {
        bid: threadTarget.bid,
        bookmarked: isBookmarked,
        bookmarks: Math.max(0, threadBookmark.bookmarks + (isBookmarked ? 1 : -1)),
        tid: threadTarget.tid,
      },
    )
      .then(applyThreadBookmarkState)
      .catch(() => {
        setThreadBookmarkOverrides((current) => ({
          ...current,
          [thread.id]: threadBookmark,
        }));
      })
      .finally(() => setBookmarkPending(key, false));
  };
  const openNestedReplyComposer = (floorId: string, target?: NestedReplyComposerTarget) => {
    setNestedReplyTargetsByFloorId((current) => ({
      ...current,
      [floorId]: target ?? {},
    }));
  };
  const requestFloorQuote = (floor: ThreadFloor, selectedText: string | null) => {
    floorQuoteRequestIdRef.current += 1;
    setFloorQuoteRequest({
      author: floor.author.id || floor.author.name,
      authorHref: floor.author.href,
      floor: floor.floor,
      href: `${getThreadPath(thread.id)}#floor-${floor.floor}`,
      id: floorQuoteRequestIdRef.current,
      text: selectedText || floor.content.join('\n\n'),
    });
  };
  const addPostedFloor = (floor: ThreadFloor) => {
    setPostedFloorsByThreadId((current) => ({
      ...current,
      [thread.id]: [
        ...(current[thread.id] ?? []).filter((postedFloor) => postedFloor.id !== floor.id),
        floor,
      ].sort((left, right) => left.floor - right.floor),
    }));
  };
  const submitReplyFloor = async ({ sig, text }: ReplyFloorSubmitPayload) => {
    if (!canReplyToThread) {
      throw new Error(replyRestrictionDescription || '当前账号暂不能在本版回复。');
    }

    if (!threadTarget) {
      throw new Error('当前帖子没有真实数据库编号，无法发布回复。');
    }

    const savedPost = await legacyBbsPost<LegacyBbsWritePostResponse>(
      `/threads/${threadTarget.bid}/${threadTarget.tid}/floors`,
      {
        attachs: '',
        sig,
        text,
        title: `Re: ${thread.title}`,
        type: 'web',
      },
    );

    if (savedPost.floor) {
      addPostedFloor(adaptLegacyBbsThreadFloor(savedPost.floor, thread.author.name));
    }
    if (savedPost.pid > 0) {
      navigate(getThreadFloorPath(savedPost.threadId, savedPost.pid));
    }

    return savedPost;
  };
  const submitNestedReply = async (floor: ThreadFloor, content: string) => {
    const trimmedContent = content.trim();
    const replyTarget = nestedReplyTargetsByFloorId[floor.id];

    if (!trimmedContent) {
      return;
    }

    if (!canReplyToThread) {
      window.alert(replyRestrictionDescription || '当前账号暂不能在本版回复。');
      return;
    }

    if (threadTarget && floor.fid) {
      const storedContent = replyTarget?.target ? `回复 @${replyTarget.target}：${trimmedContent}` : trimmedContent;

      try {
        const savedReply = await legacyBbsPost<LegacyBbsNestedReply>(
          `/threads/${threadTarget.bid}/${threadTarget.tid}/floors/${floor.floor}/nested-replies`,
          {
            fid: floor.fid,
            text: storedContent,
          },
        );
        const nestedReply = {
          ...adaptLegacyBbsNestedReply(savedReply),
          ...(replyTarget?.target
            ? {
                content: trimmedContent,
                target: replyTarget.target,
                targetHref: replyTarget.targetHref,
              }
            : {}),
        };

        setLocalNestedRepliesByFloorId((current) => ({
          ...current,
          [floor.id]: [...(current[floor.id] ?? []), nestedReply],
        }));
        setNestedReplyTargetsByFloorId((current) => {
          const next = { ...current };
          delete next[floor.id];
          return next;
        });
      } catch (error) {
        window.alert(getErrorMessage(error));
      }
      return;
    }

    const nestedReply: ThreadNestedReply = {
      id: `nested-${floor.id}-${Date.now()}`,
      author: currentUser.name,
      authorHref: currentUser.href,
      content: trimmedContent,
      time: makeLocalTimestamp(),
      ...(replyTarget?.target
        ? {
            target: replyTarget.target,
            targetHref: replyTarget.targetHref,
          }
        : {}),
    };

    setLocalNestedRepliesByFloorId((current) => ({
      ...current,
      [floor.id]: [...(current[floor.id] ?? []), nestedReply],
    }));
    setNestedReplyTargetsByFloorId((current) => {
      const next = { ...current };
      delete next[floor.id];
      return next;
    });
  };
  const updateSignupFloor = (floor: ThreadFloor) => {
    const isExistingThreadFloor = thread.floors.some((threadFloor) => threadFloor.id === floor.id);

    if (floor.id.startsWith(`signup-${thread.id}-`) || !isExistingThreadFloor) {
      setSignupFloorsByThreadId((current) => ({
        ...current,
        [thread.id]: [
          ...(current[thread.id] ?? []).filter((signupFloor) => signupFloor.id !== floor.id),
          floor,
        ].sort((left, right) => left.floor - right.floor),
      }));
      return;
    }

    setSignupFloorOverridesByThreadId((current) => ({
      ...current,
      [thread.id]: {
        ...(current[thread.id] ?? {}),
        [floor.id]: floor,
      },
    }));
  };
  const clearSignupCancellation = (floorId: string) => {
    setCanceledSignupFloorIdsByThreadId((current) => ({
      ...current,
      [thread.id]: {
        ...(current[thread.id] ?? {}),
        [floorId]: false,
      },
    }));
  };
  const submitActivitySignupAction = async (
    action: 'cancel' | 'join' | 'modify' | 'restore',
    draft?: ActivitySignupDraft,
    signatureIndex = 0,
  ) => {
    if (!threadTarget) {
      throw new Error('当前活动帖没有真实数据库编号，无法同步报名。');
    }

    const response = await legacyBbsPost<LegacyBbsActivitySignupResponse>(
      `/threads/${threadTarget.bid}/${threadTarget.tid}/activity-signup`,
      {
        action,
        optionValues: draft ? getActivitySignupOptionValues(draft, thread.signupQuestions ?? []) : {},
        sig: signatureIndex,
        title: thread.title,
        type: 'web',
      },
    );

    if (response.floor) {
      const updatedFloor = adaptLegacyBbsThreadFloor(response.floor, thread.author.name);
      updateSignupFloor(updatedFloor);
      setCanceledSignupFloorIdsByThreadId((current) => ({
        ...current,
        [thread.id]: {
          ...(current[thread.id] ?? {}),
          [updatedFloor.id]: response.canceled,
        },
      }));
    }

    return response;
  };
  const confirmDeletion = async () => {
    if (!pendingDeletion) {
      return;
    }

    setIsConfirmingDeletion(true);

    try {
      if (pendingDeletion.kind === 'thread') {
        if (threadTarget) {
          await legacyBbsPost(`/threads/${threadTarget.bid}/${threadTarget.tid}/delete`);
        }
        setDeletedThreadIds((current) => ({
          ...current,
          [pendingDeletion.target.id]: true,
        }));
      } else if (pendingDeletion.kind === 'floor') {
        if (threadTarget) {
          await legacyBbsPost(`/threads/${threadTarget.bid}/${threadTarget.tid}/floors/${pendingDeletion.target.floor}/delete`);
        }
        setDeletedFloorIds((current) => ({
          ...current,
          [pendingDeletion.target.id]: true,
        }));
      } else if (pendingDeletion.kind === 'nestedReply') {
        if (threadTarget && pendingDeletion.target.fid) {
          await legacyBbsPost(
            `/threads/${threadTarget.bid}/${threadTarget.tid}/nested-replies/${pendingDeletion.target.id}/delete`,
            { fid: pendingDeletion.target.fid },
          );
        }
        setDeletedNestedReplyIds((current) => ({
          ...current,
          [pendingDeletion.target.id]: true,
        }));
      } else if (threadTarget) {
        await submitActivitySignupAction('cancel');
      } else {
        const canceledFloor: ThreadFloor = {
          ...pendingDeletion.target,
          editedAt: makeLocalTimestamp(),
        };

        updateSignupFloor(canceledFloor);
        setCanceledSignupFloorIdsByThreadId((current) => ({
          ...current,
          [thread.id]: {
            ...(current[thread.id] ?? {}),
            [pendingDeletion.target.id]: true,
          },
        }));
      }

      setPendingDeletion(null);
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setIsConfirmingDeletion(false);
    }
  };
  const submitActivitySignup = async ({ draft, signatureHtml, signatureIndex }: ActivitySignupSubmitPayload) => {
    if (!canReplyToThread) {
      throw new Error(activitySignupRestrictionDescription || '当前账号暂不能参与本版活动报名。');
    }

    if (currentUserSignup) {
      if (threadTarget) {
        await submitActivitySignupAction(currentUserSignup.isCanceled ? 'restore' : 'modify', draft, signatureIndex);
        return;
      }

      const updatedFloor: ThreadFloor = {
        ...currentUserSignup.floor,
        content: formatActivitySignupContent(draft, thread.signupQuestions ?? []),
        editedAt: makeLocalTimestamp(),
        signatureHtml: signatureIndex > 0 ? signatureHtml : '',
        signatureIndex: signatureIndex > 0 ? signatureIndex : undefined,
      };

      updateSignupFloor(updatedFloor);
      clearSignupCancellation(updatedFloor.id);
      return;
    }

    const nextFloorNumber = Math.max(thread.mainPost.floor, ...thread.floors.map((floor) => floor.floor), ...signupFloors.map((floor) => floor.floor)) + 1;
    const signupFloor: ThreadFloor = {
      id: `signup-${thread.id}-${Date.now()}`,
      floor: nextFloorNumber,
      author: currentUser,
      time: makeLocalTimestamp(),
      content: formatActivitySignupContent(draft, thread.signupQuestions ?? []),
      signatureHtml: signatureIndex > 0 ? signatureHtml : '',
      signatureIndex: signatureIndex > 0 ? signatureIndex : undefined,
    };

    if (threadTarget) {
      await submitActivitySignupAction('join', draft, signatureIndex);
      return;
    }

    setSignupFloorsByThreadId((current) => ({
      ...current,
      [thread.id]: [...(current[thread.id] ?? []), signupFloor],
    }));
  };

  const threadArticle = (
    <article
      className={joinClassNames(
        isPreviewMode ? 'space-y-3' : 'space-y-4',
        !isPreviewMode && showFloorDirectory && floorDirectoryEntries.length > 0 && 'xl:pr-8',
      )}
    >
      {!isPreviewMode ? (
        <ThreadHeader
          thread={thread}
          bookmarked={threadBookmark.bookmarked}
          bookmarks={threadBookmark.bookmarks}
          replyCount={thread.replies + signupFloors.length}
          canUseAuthenticatedActions={canUseAuthenticatedActions}
          isBookmarkPending={Boolean(pendingBookmarkKeys[`${thread.id}:thread-bookmark`])}
          onBookmarkChange={handleThreadBookmarkChange}
        />
      ) : null}
        {!isPreviewMode && isActivityThread ? (
          canReplyToThread ? (
            <ActivitySignupForm
              currentUser={currentUser}
              ownerKey={replyDraftOwnerKey}
              signatureProfileName={signatureProfileName}
              signup={currentUserSignup}
              thread={thread}
              onRequestCancel={(floor) => setPendingDeletion({ kind: 'cancelSignup', target: floor })}
              onSubmit={submitActivitySignup}
            />
          ) : canUseAuthenticatedActions ? (
            <ReplyRestrictedPanel
              description={activitySignupRestrictionDescription}
              title={activitySignupRestrictionTitle}
            />
          ) : (
            <LoginRequiredPanel
              title="请登录后报名"
              description={`登录后可以填写《${thread.title}》的活动报名表。`}
            />
          )
        ) : null}
        {showThreadPagination && threadPagination ? (
          <ThreadPaginationBar pagination={threadPagination} onPageChange={handleThreadPageChange} />
        ) : null}

        {showMainPost ? (
          <ThreadFloorCard
            floor={mainPostWithLocalReplies}
            thread={thread}
            activeNestedReplyTarget={nestedReplyTargetsByFloorId[thread.mainPost.id]}
            currentAccountId={currentAccountId}
            currentUser={currentUser}
            isActivityThread={isActivityThread}
            isMainPost
            canReplyToThread={canReplyToThread}
            canUseAuthenticatedActions={canUseAuthenticatedActions}
            deletedNestedReplyIds={deletedNestedReplyIds}
            onOpenNestedReply={() => openNestedReplyComposer(thread.mainPost.id)}
            onQuoteFloor={requestFloorQuote}
            onRequestDelete={() => setPendingDeletion({ kind: 'thread', target: thread })}
            onRequestNestedReplyDelete={(reply) => setPendingDeletion({ kind: 'nestedReply', target: reply })}
            onRequestNestedReplyReply={(reply) => openNestedReplyComposer(thread.mainPost.id, { target: reply.author, targetHref: reply.authorHref })}
            onSubmitNestedReply={(content) => submitNestedReply(thread.mainPost, content)}
            navigationContextPath={routePath}
            previewLayout={isPreviewMode}
            onThreadLinkNavigate={handleThreadLinkNavigate}
          />
        ) : null}

        {visibleFloors.map((floor) => {
          const floorWithLocalReplies = withLocalNestedReplies(floor);

          return (
            <ThreadFloorCard
              key={floor.id}
              floor={floorWithLocalReplies}
              thread={thread}
              activeNestedReplyTarget={nestedReplyTargetsByFloorId[floor.id]}
              currentAccountId={currentAccountId}
              currentUser={currentUser}
              isActivityThread={isActivityThread}
              isActivitySignupCanceled={Boolean(canceledSignupFloorIds[floor.id] || isCanceledActivitySignupFloor(floor))}
              canReplyToThread={canReplyToThread}
              canUseAuthenticatedActions={canUseAuthenticatedActions}
              deletedNestedReplyIds={deletedNestedReplyIds}
              onOpenNestedReply={() => openNestedReplyComposer(floor.id)}
              onQuoteFloor={requestFloorQuote}
              onRequestDelete={() => setPendingDeletion({ kind: 'floor', target: floor })}
              onRequestNestedReplyDelete={(reply) => setPendingDeletion({ kind: 'nestedReply', target: reply })}
              onRequestNestedReplyReply={(reply) => openNestedReplyComposer(floor.id, { target: reply.author, targetHref: reply.authorHref })}
              onSubmitNestedReply={(content) => submitNestedReply(floor, content)}
              navigationContextPath={routePath}
              previewLayout={isPreviewMode}
              onThreadLinkNavigate={handleThreadLinkNavigate}
            />
          );
        })}

        {showThreadPagination && threadPagination ? (
          <ThreadPaginationBar pagination={threadPagination} onPageChange={handleThreadPageChange} />
        ) : null}

        {isPreviewMode || isActivityThread ? null : canReplyToThread ? (
          <ReplyComposer
            ownerKey={replyDraftOwnerKey}
            signatureProfileName={signatureProfileName}
            onSubmit={submitReplyFloor}
            quoteRequest={floorQuoteRequest}
            thread={thread}
          />
        ) : canUseAuthenticatedActions ? (
          <ReplyRestrictedPanel
            description={replyRestrictionDescription}
            title={replyRestrictionTitle}
          />
        ) : (
          <LoginRequiredPanel
            title="请登录后回复"
            description={`登录后可以参与《${thread.title}》的讨论并保存草稿。`}
          />
        )}
    </article>
  );

  return (
    <>
      {isPreviewMode ? (
        threadArticle
      ) : (
        <>
          {threadArticle}
          {showFloorDirectory ? (
            <ThreadFloorDirectory
              activeFloorNumber={hashTarget.floorNumber}
              entries={floorDirectoryEntries}
              onNavigate={handleFloorDirectoryNavigate}
            />
          ) : null}
          {enableFloatingPreview && threadPreviewTarget ? (
            <ThreadSidePreviewPane
              target={threadPreviewTarget}
              onClose={handleCloseThreadPreview}
              onOpenFullScreen={() => {
                navigate(threadPreviewTarget.path);
                setThreadPreviewTarget(null);
              }}
              onTargetChange={setThreadPreviewTarget}
            />
          ) : null}
        </>
      )}

      {!isPreviewMode ? (
        <DeleteConfirmDialog
          isConfirming={isConfirmingDeletion}
          pendingDeletion={pendingDeletion}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={confirmDeletion}
        />
      ) : null}
    </>
  );
}

function ThreadSidePreviewPane({
  onClose,
  onOpenFullScreen,
  onTargetChange,
  target,
}: {
  onClose: () => void;
  onOpenFullScreen: () => void;
  onTargetChange: (target: ThreadPreviewTarget) => void;
  target: ThreadPreviewTarget;
}) {
  const paneRef = useRef<HTMLElement>(null);
  const paneScrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<FloatingPreviewPaneDragState | null>(null);
  const [panePosition, setPanePosition] = useState<FloatingPreviewPanePosition | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const handlePreviewThreadLinkNavigate = useCallback<ThreadLinkNavigateHandler>((nextTarget) => {
    onTargetChange(createThreadPreviewTarget(nextTarget.path));
    return true;
  }, [onTargetChange]);
  const handlePreviewPathNavigate = useCallback((path: string) => {
    onTargetChange(createThreadPreviewTarget(path));
  }, [onTargetChange]);
  const handlePreviewTitleChange = useCallback((_threadId: string, title: string) => {
    setPreviewTitle(title);
  }, []);

  useEffect(() => {
    setPreviewTitle('');
    paneScrollRef.current?.scrollTo({ top: 0 });
  }, [target.key]);

  useEffect(() => {
    if (!panePosition) {
      return;
    }

    const handleWindowResize = () => {
      const rect = paneRef.current?.getBoundingClientRect();

      setPanePosition((currentPosition) => currentPosition
        ? clampFloatingPreviewPanePosition(
            currentPosition,
            rect?.width ?? FLOATING_PREVIEW_PANE_DEFAULT_WIDTH,
            rect?.height ?? FLOATING_PREVIEW_PANE_DEFAULT_HEIGHT,
          )
        : currentPosition);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [panePosition]);

  const handlePreviewHeaderPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (isFloatingPreviewInteractiveTarget(event.target)) {
      return;
    }

    const pane = paneRef.current;

    if (!pane) {
      return;
    }

    const rect = pane.getBoundingClientRect();

    dragStateRef.current = {
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
      width: rect.width,
    };
    setPanePosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const handlePreviewHeaderPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setPanePosition(clampFloatingPreviewPanePosition(
      {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      },
      dragState.width,
      dragState.height,
    ));
  }, []);

  const stopPreviewHeaderDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const paneStyle: CSSProperties = {
    height: 'min(42rem, calc(100vh - var(--capubbs-route-column-top-offset, var(--capubbs-desktop-topbar-offset)) - 1rem))',
    ...(panePosition
      ? {
          left: panePosition.x,
          right: 'auto',
          top: panePosition.y,
        }
      : {}),
  };

  return (
    <aside
      ref={paneRef}
      className="fixed right-[max(1rem,calc((100vw-1480px)/2+1rem))] top-[var(--capubbs-route-column-top-offset,var(--capubbs-desktop-topbar-offset))] z-30 hidden min-h-[24rem] min-w-0 w-[26rem] max-w-[calc(100vw-2rem)] xl:block 2xl:w-[28rem]"
      style={paneStyle}
    >
      <section
        aria-label="帖子预览"
        className="card-surface flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800"
      >
        <header
          className={joinClassNames(
            'z-10 flex min-h-12 touch-none select-none items-center justify-between gap-2 border-b border-zinc-200 bg-[#f7f3ea]/95 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          onPointerCancel={stopPreviewHeaderDrag}
          onPointerDown={handlePreviewHeaderPointerDown}
          onPointerMove={handlePreviewHeaderPointerMove}
          onPointerUp={stopPreviewHeaderDrag}
        >
          <div className="flex min-w-0 flex-1 items-center">
            <h2 className="capubbs-title-wrap text-sm font-bold leading-snug text-[#385772] dark:text-white">
              {previewTitle || `帖子 ${target.threadId}`}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label="全屏打开预览帖子"
              title="全屏打开"
              onClick={onOpenFullScreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <Maximize2 size={15} />
            </button>
            <button
              type="button"
              aria-label="关闭帖子预览"
              title="关闭"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        <div ref={paneScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          <ThreadRoute
            locationOverride={target.location}
            onNavigatePath={handlePreviewPathNavigate}
            onThreadLinkNavigate={handlePreviewThreadLinkNavigate}
            onThreadTitleChange={handlePreviewTitleChange}
            threadId={target.threadId}
            variant="preview"
          />
        </div>
      </section>
    </aside>
  );
}

function ThreadFloorDirectory({
  activeFloorNumber,
  entries,
  onNavigate,
}: {
  activeFloorNumber: number | null;
  entries: ThreadFloorDirectoryEntry[];
  onNavigate: (floorNumber: number) => void;
}) {
  const [scrollActiveFloorNumber, setScrollActiveFloorNumber] = useState<number | null>(activeFloorNumber);
  const activeEntryFloorNumber = scrollActiveFloorNumber ?? activeFloorNumber;
  const floorNumbersKey = entries.map((entry) => entry.floor).join('|');

  useEffect(() => {
    if (activeFloorNumber !== null) {
      setScrollActiveFloorNumber(activeFloorNumber);
    }
  }, [activeFloorNumber]);

  useEffect(() => {
    if (entries.length === 0 || typeof window === 'undefined') {
      return;
    }

    const firstFloorElement = getVisibleHashTargetElement(`floor-${entries[0].floor}`);
    const scrollContainer = firstFloorElement ? getNearestScrollContainer(firstFloorElement) : null;
    const scrollTarget: HTMLElement | Window = scrollContainer ?? window;
    let animationFrameId: number | null = null;

    const updateActiveFloor = () => {
      animationFrameId = null;

      const floorTargets = entries
        .map((entry) => ({
          element: getVisibleHashTargetElement(`floor-${entry.floor}`),
          floor: entry.floor,
        }))
        .filter((target): target is { element: HTMLElement; floor: number } => target.element !== null);

      if (floorTargets.length === 0) {
        return;
      }

      const containerRect = scrollContainer?.getBoundingClientRect();
      const guideY = containerRect ? containerRect.top + containerRect.height / 2 : window.innerHeight / 2;
      let nextActiveFloor = floorTargets[0].floor;
      let closestDistance = Number.POSITIVE_INFINITY;

      floorTargets.forEach(({ element, floor }) => {
        const rect = element.getBoundingClientRect();
        const distance = rect.top <= guideY && rect.bottom >= guideY
          ? 0
          : Math.min(Math.abs(rect.top - guideY), Math.abs(rect.bottom - guideY));

        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveFloor = floor;
        }
      });

      setScrollActiveFloorNumber((current) => (current === nextActiveFloor ? current : nextActiveFloor));
    };

    const requestActiveFloorUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateActiveFloor);
    };

    requestActiveFloorUpdate();
    scrollTarget.addEventListener('scroll', requestActiveFloorUpdate, { passive: true });
    window.addEventListener('resize', requestActiveFloorUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      scrollTarget.removeEventListener('scroll', requestActiveFloorUpdate);
      window.removeEventListener('resize', requestActiveFloorUpdate);
    };
  }, [entries, floorNumbersKey]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="楼层目录"
      className="fixed right-[max(0.75rem,calc((100vw-1480px)/2+0.75rem))] top-1/2 z-20 hidden w-12 -translate-y-1/2 overflow-visible xl:block"
    >
      <ol className="relative flex max-h-[calc(100vh-6rem)] flex-col items-center gap-1.5 overflow-visible px-1 py-3">
        {entries.length > 1 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-7 left-1/2 top-7 w-px -translate-x-1/2 bg-[#385772]/25 dark:bg-white/20"
          />
        ) : null}

        {entries.map((entry) => {
          const isActive = activeEntryFloorNumber === entry.floor;

          return (
            <li key={entry.floor} className="relative z-10 flex h-8 w-8 items-center justify-center">
              <button
                type="button"
                aria-current={isActive ? 'location' : undefined}
                aria-label={`跳转到第 ${entry.floor} 楼：${entry.excerpt}`}
                title={`#${entry.floor} ${entry.excerpt}`}
                onClick={() => onNavigate(entry.floor)}
                className="group relative flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f3ea] dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
              >
                <span
                  className={joinClassNames(
                    'block rounded-full border-2 shadow-sm transition-colors',
                    isActive
                      ? 'h-3 w-3 border-emerald-800 bg-emerald-800 dark:border-emerald-200 dark:bg-emerald-200'
                      : 'h-2.5 w-2.5 border-[#385772] bg-white dark:border-white/70 dark:bg-zinc-950',
                  )}
                />
                <span className="pointer-events-none absolute right-full top-1/2 z-20 mr-3 w-64 -translate-y-1/2 rounded-lg border border-zinc-200 bg-white/95 p-3 text-left text-zinc-700 opacity-0 shadow-panel backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:border-white/10 dark:bg-zinc-950/95 dark:text-zinc-200">
                  <span className="block text-xs font-bold text-[#385772] dark:text-white">
                    #{entry.floor} · {entry.author}
                  </span>
                  <span className="mt-1 line-clamp-3 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {entry.excerpt}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getThreadFloorDirectoryEntries(floors: ThreadFloor[]): ThreadFloorDirectoryEntry[] {
  return floors
    .map((floor) => ({
      author: floor.author.name,
      excerpt: getThreadFloorDirectoryExcerpt(floor),
      floor: floor.floor,
    }))
    .sort((left, right) => left.floor - right.floor);
}

function getThreadFloorDirectoryExcerpt(floor: ThreadFloor) {
  const plainContent = normalizeFloorDirectoryText(floor.content.join(' '));

  if (plainContent) {
    return truncateFloorDirectoryText(plainContent);
  }

  const htmlContent = normalizeFloorDirectoryText(getPlainTextFromHtml(floor.htmlContent ?? ''));

  return truncateFloorDirectoryText(htmlContent || '无文字内容');
}

function getPlainTextFromHtml(html: string) {
  const trimmedHtml = html.trim();

  if (!trimmedHtml) {
    return '';
  }

  if (typeof document === 'undefined') {
    return trimmedHtml.replace(/<[^>]+>/g, ' ');
  }

  const template = document.createElement('template');
  template.innerHTML = trimmedHtml;

  return template.content.textContent ?? '';
}

function normalizeFloorDirectoryText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function truncateFloorDirectoryText(text: string) {
  const maxLength = 84;

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function ThreadHeader({
  bookmarked,
  bookmarks,
  canUseAuthenticatedActions,
  isBookmarkPending,
  onBookmarkChange,
  replyCount,
  thread,
}: {
  bookmarked: boolean;
  bookmarks: number;
  canUseAuthenticatedActions: boolean;
  isBookmarkPending: boolean;
  onBookmarkChange: (isBookmarked: boolean) => void;
  replyCount: number;
  thread: ThreadDetail;
}) {
  const headerGradientClass = getActivityGradientClass(thread.title);
  const isActivityThread = isActivitySignupThread(thread);
  const hasBadges = thread.globalPinned || thread.pinned || thread.digest || isActivityThread;

  return (
    <section className={joinClassNames('overflow-hidden rounded-lg bg-gradient-to-r p-[1px] shadow-panel', headerGradientClass)}>
      <div
        className={joinClassNames(
          'relative overflow-hidden rounded-[7px] p-4 sm:p-5',
          !isActivityThread && 'card-surface',
        )}
      >
        {isActivityThread ? (
          <>
            <img
              src={defaultActivityCover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.9)_44%,rgba(255,255,255,0.3)_100%)] dark:bg-[linear-gradient(90deg,rgba(9,9,11,0.96)_0%,rgba(9,9,11,0.84)_46%,rgba(9,9,11,0.34)_100%)]" />
            <div
              className={joinClassNames(
                'pointer-events-none absolute inset-0 bg-gradient-to-r opacity-[0.16] mix-blend-multiply dark:opacity-[0.3] dark:mix-blend-screen',
                headerGradientClass,
              )}
            />
          </>
        ) : null}

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto sm:flex-1">
            <Link
              to={thread.boardHref}
              aria-label={`返回${thread.board}版面`}
              title={`返回${thread.board}版面`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/30 bg-white/[0.32] text-[#385772] shadow-sm backdrop-blur-[2px] transition hover:bg-white/[0.46] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] dark:hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="capubbs-title-wrap text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">
                {hasBadges ? (
                  <span className="mr-2 inline-flex items-center gap-1.5 align-middle">
                    {thread.pinned ? <ThreadBadge label="置顶" tone="amber" /> : null}
                    {thread.globalPinned ? <ThreadBadge label="全局置顶" tone="amber" /> : null}
                    {thread.digest ? <ThreadBadge label="精华" tone="emerald" /> : null}
                    {isActivityThread ? <ThreadBadge label="活动" tone="sky" /> : null}
                  </span>
                ) : null}
                <span className="capubbs-title-wrap">{thread.title}</span>
                {thread.locked ? (
                  <Lock
                    aria-label="已锁定"
                    className="ml-2 inline-block align-middle text-zinc-500 dark:text-zinc-300"
                    size={22}
                  />
                ) : null}
              </h1>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/30 bg-white/[0.32] px-3 py-2 text-sm text-[#875A41] shadow-sm backdrop-blur-[2px] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
              <Metric icon={<MessageCircle size={16} />} label={replyCount} />
              <Metric icon={<Eye size={16} />} label={thread.views} />
              {canUseAuthenticatedActions ? (
                <ToggleMetric
                  icon={<Bookmark size={16} />}
                  label={bookmarks}
                  activeLabel="取消收藏"
                  inactiveLabel="收藏"
                  isActive={bookmarked}
                  isBusy={isBookmarkPending}
                  onActiveChange={onBookmarkChange}
                />
              ) : null}
            </div>
            {thread.canManageActivitySignup ? (
              <Link
                to={getThreadActivityAdminPath(thread.id)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/[0.36] px-3 text-sm font-bold text-[#385772] shadow-sm backdrop-blur-[2px] transition hover:bg-white/[0.5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
              >
                <Settings size={16} />
                报名后台
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ThreadPaginationBar({
  onPageChange,
  pagination,
}: {
  onPageChange: (page: number) => void;
  pagination: NonNullable<ThreadDetail['pagination']>;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white/55 p-3 shadow-panel backdrop-blur-[2px] dark:border-zinc-800 dark:bg-white/[0.04]">
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
}

function LoginRequiredPanel({ description, title }: { description: string; title: string }) {
  const location = useLocation();

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#385772] dark:text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <Link
          to={getLoginPathWithReturnTo(location)}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
        >
          <LogIn size={16} />
          登录
        </Link>
      </div>
    </section>
  );
}

function ReplyRestrictedPanel({ description, title }: { description: string; title: string }) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-[#385772] dark:text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </section>
  );
}

function ActivitySignupForm({
  currentUser,
  onRequestCancel,
  onSubmit,
  ownerKey,
  signatureProfileName,
  signup,
  thread,
}: {
  currentUser: ThreadAuthor;
  onRequestCancel: (floor: ThreadFloor) => void;
  onSubmit: (payload: ActivitySignupSubmitPayload) => Promise<void>;
  ownerKey: string | null;
  signatureProfileName: string | null;
  signup: { floor: ThreadFloor; isCanceled: boolean } | null;
  thread: ThreadDetail;
}) {
  const questions = thread.signupQuestions ?? emptySignupQuestions;
  const [draft, setDraft] = useState<ActivitySignupDraft>(() =>
    getActivitySignupDraftFromFloor(signup?.floor, questions) ?? getEmptyActivitySignupDraft(questions, currentUser.id || currentUser.name),
  );
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureIndex, setSignatureIndex] = useState(() => signup?.floor.signatureIndex ?? 0);
  const { options: signatureOptions, status: signatureStatus } = useLegacySignatureOptions(signatureProfileName);
  const selectedSignatureOption = getSignatureOptionByIndex(signatureOptions, signatureIndex);
  const signupMode = !signup ? 'new' : signup.isCanceled ? 'canceled' : 'active';
  const submitLabel = signupMode === 'active' ? '修改报名' : signupMode === 'canceled' ? '重新报名' : '提交报名';
  const canSubmit = questions.length > 0
    ? questions.every((question) => !question.required || hasActivitySignupValue(draft.values[question.id]))
    : draft.meetPoint.trim().length > 0 && draft.bikeCondition.trim().length > 0;

  useEffect(() => {
    setDraft(getActivitySignupDraftFromFloor(signup?.floor, questions) ?? getEmptyActivitySignupDraft(questions, currentUser.id || currentUser.name));
    setSignatureIndex(signup?.floor.signatureIndex ?? 0);
    setSubmittedMessage('');
  }, [currentUser.id, currentUser.name, questions, signup?.floor.id, signup?.floor.content.join('\n'), signup?.floor.signatureIndex, signup?.isCanceled]);

  const updateDraft = (field: keyof ActivitySignupDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setSubmittedMessage('');
  };
  const updateQuestionValue = (questionId: string, value: ActivitySignupValue) => {
    setDraft((current) => ({
      ...current,
      values: {
        ...current.values,
        [questionId]: value,
      },
    }));
    setSubmittedMessage('');
  };
  const updateMultiChoiceValue = (questionId: string, optionId: string, checked: boolean) => {
    setDraft((current) => {
      const selectedValues = Array.isArray(current.values[questionId]) ? current.values[questionId] : [];
      const nextValues = checked
        ? [...selectedValues, optionId]
        : selectedValues.filter((selectedOptionId) => selectedOptionId !== optionId);

      return {
        ...current,
        values: {
          ...current.values,
          [questionId]: nextValues,
        },
      };
    });
    setSubmittedMessage('');
  };
  const updateSignatureIndex = (nextSignatureIndex: number) => {
    setSignatureIndex(nextSignatureIndex);
    setSubmittedMessage('');
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmittedMessage('正在同步报名...');

    try {
      await onSubmit({
        draft,
        signatureHtml: signatureIndex > 0 ? selectedSignatureOption?.html ?? '' : '',
        signatureIndex,
      });
      setSubmittedMessage(
        signupMode === 'active'
          ? '报名已修改，并已同步更新对应楼层。'
          : signupMode === 'canceled'
            ? '报名已恢复，并已同步更新对应楼层。'
            : '报名已提交，并已按表单格式生成楼层回复。',
      );
    } catch (error) {
      setSubmittedMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-3 dark:border-white/10">
        <h2 className="text-base font-bold text-[#385772] dark:text-white">报名表单</h2>
        <span className="text-xs font-semibold text-[#875A41] dark:text-white/70">报名《{thread.title}》</span>
      </div>
      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        {questions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {questions.map((question) => (
              <ActivitySignupQuestionField
                key={question.id}
                draft={draft}
                question={question}
                onMultiChoiceChange={updateMultiChoiceValue}
                onValueChange={updateQuestionValue}
              />
            ))}
          </div>
        ) : (
          <LegacyActivitySignupFields draft={draft} onUpdateDraft={updateDraft} />
        )}

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-zinc-200/80 pt-3 dark:border-white/10">
          <div className="min-w-[15rem] flex-1">
            <ActivitySignupSignaturePicker
              id="activity-signup-signature"
              disabled={isSubmitting}
              options={signatureOptions}
              status={signatureStatus}
              value={signatureIndex}
              onChange={updateSignatureIndex}
            />
            <span className="mt-2 block min-h-5 text-xs font-semibold text-emerald-800 dark:text-emerald-100">{submittedMessage}</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
            >
              <Send size={16} />
              {isSubmitting ? '同步中...' : submitLabel}
            </button>
            {signup && !signup.isCanceled ? (
              <button
                type="button"
                onClick={() => onRequestCancel(signup.floor)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100 dark:hover:bg-rose-300/20 dark:focus-visible:ring-rose-200"
              >
                <Ban size={16} />
                取消报名
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}

function ActivitySignupSignaturePicker({
  disabled = false,
  id,
  onChange,
  options,
  status,
  value,
}: {
  disabled?: boolean;
  id: string;
  onChange: (value: number) => void;
  options: LegacySignatureOption[];
  status: SignatureLoadStatus;
  value: number;
}) {
  const normalizedOptions = options.length > 0 ? options : [];
  const selectedIndex = normalizeSignatureIndex(value) || normalizedOptions[0]?.index || 1;
  const selectedOption = getSignatureOptionByIndex(normalizedOptions, selectedIndex);
  const isSignatureEnabled = normalizeSignatureIndex(value) > 0;
  const statusLabel = getActivitySignupSignatureStatusLabel(status);

  return (
    <div className="max-w-xl rounded-md border border-zinc-200 bg-white/45 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 items-center gap-2 text-sm font-bold text-[#385772] dark:text-white">
          <input
            type="checkbox"
            checked={isSignatureEnabled}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked ? selectedIndex : 0)}
            className="h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-zinc-900 dark:focus:ring-emerald-200"
          />
          <FileText size={15} className="text-emerald-700/80 dark:text-emerald-100/80" />
          签名档
        </label>

        {isSignatureEnabled ? (
          <>
            <label className="sr-only" htmlFor={id}>
              选择签名档
            </label>
            <select
              id={id}
              value={selectedIndex}
              disabled={disabled}
              onChange={(event) => onChange(Number.parseInt(event.currentTarget.value, 10))}
              className="h-8 min-w-[8.5rem] rounded-md border border-zinc-200 bg-white px-2 text-sm font-bold text-[#385772] outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            >
              {normalizedOptions.map((signatureOption) => (
                <option key={signatureOption.index} value={signatureOption.index}>
                  签名档 {signatureOption.index}{signatureOption.isEmpty ? '（空）' : ''}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {statusLabel ? (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300">
            {statusLabel}
          </span>
        ) : null}
      </div>

      {isSignatureEnabled ? (
        <p className="mt-1 truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {selectedOption && !selectedOption.isEmpty ? selectedOption.excerpt : '当前签名档为空'}
        </p>
      ) : null}
    </div>
  );
}

function getActivitySignupSignatureStatusLabel(status: SignatureLoadStatus) {
  if (status === 'loading') {
    return '读取中';
  }

  if (status === 'error') {
    return '读取失败';
  }

  return '';
}

function ActivitySignupQuestionField({
  draft,
  onMultiChoiceChange,
  onValueChange,
  question,
}: {
  draft: ActivitySignupDraft;
  onMultiChoiceChange: (questionId: string, optionId: string, checked: boolean) => void;
  onValueChange: (questionId: string, value: ActivitySignupValue) => void;
  question: ThreadActivitySignupQuestion;
}) {
  const value = draft.values[question.id];
  const label = (
    <>
      {question.label}
      {question.required ? <span className="ml-1 text-rose-600 dark:text-rose-200">*</span> : null}
    </>
  );

  if (question.type === 'choice') {
    const isCompactChoiceLayout = getActivitySignupChoiceCompactLayout(question);
    const hasLongChoiceOptions = hasLongActivitySignupChoiceOptions(question);

    return (
      <fieldset className={joinClassNames('min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400', hasLongChoiceOptions && 'sm:col-span-2')}>
        <legend>{label}</legend>
        <div className={getActivitySignupChoiceGroupClassName(isCompactChoiceLayout)}>
          {(question.options ?? []).map((option) => (
            <label
              key={option.id}
              className={joinClassNames(
                'flex min-h-10 w-fit max-w-full cursor-pointer items-center rounded-md border px-3 text-left text-sm font-semibold leading-snug transition',
                isCompactChoiceLayout && 'justify-center',
                value === option.id
                  ? 'border-[#385772]/30 bg-[#385772] text-white dark:border-emerald-100/20 dark:bg-emerald-200 dark:text-zinc-950'
                  : 'border-zinc-200 bg-white text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800',
              )}
            >
              <input
                type="radio"
                name={`activity-signup-${question.id}`}
                value={option.id}
                checked={value === option.id}
                onChange={(event) => onValueChange(question.id, event.target.value)}
                className="sr-only"
                required={question.required}
              />
              <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'multiChoice') {
    const selectedValues = Array.isArray(value) ? value : [];
    const isCompactChoiceLayout = getActivitySignupChoiceCompactLayout(question);
    const hasLongChoiceOptions = hasLongActivitySignupChoiceOptions(question);

    return (
      <fieldset className={joinClassNames('min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400', hasLongChoiceOptions && 'sm:col-span-2')}>
        <legend>{label}</legend>
        <div className={getActivitySignupChoiceGroupClassName(isCompactChoiceLayout)}>
          {(question.options ?? []).map((option) => {
            const checked = selectedValues.includes(option.id);

            return (
              <label
                key={option.id}
                className={joinClassNames(
                  'flex min-h-10 w-fit max-w-full cursor-pointer items-center rounded-md border px-3 text-left text-sm font-semibold leading-snug transition',
                  isCompactChoiceLayout && 'justify-center',
                  checked
                    ? 'border-[#385772]/30 bg-[#385772] text-white dark:border-emerald-100/20 dark:bg-emerald-200 dark:text-zinc-950'
                    : 'border-zinc-200 bg-white text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800',
                )}
              >
                <input
                  type="checkbox"
                  value={option.id}
                  checked={checked}
                  onChange={(event) => onMultiChoiceChange(question.id, option.id, event.target.checked)}
                  className="sr-only"
                />
                <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="block min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
      {label}
      <input
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onValueChange(question.id, event.target.value)}
        required={question.required}
        className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
      />
    </label>
  );
}

function getActivitySignupChoiceCompactLayout(question: ThreadActivitySignupQuestion) {
  const optionCount = question.options?.length ?? 0;

  return optionCount >= 2 && optionCount <= 3 && !hasLongActivitySignupChoiceOptions(question);
}

function getActivitySignupChoiceGroupClassName(isCompactChoiceLayout: boolean) {
  return joinClassNames(
    'mt-2 flex flex-wrap gap-2',
    isCompactChoiceLayout ? 'items-center' : 'items-start',
  );
}

function hasLongActivitySignupChoiceOptions(question: ThreadActivitySignupQuestion) {
  return (question.options ?? []).some((option) => Array.from(option.label.trim()).length > 8);
}

function LegacyActivitySignupFields({
  draft,
  onUpdateDraft,
}: {
  draft: ActivitySignupDraft;
  onUpdateDraft: (field: keyof ActivitySignupDraft, value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {activitySignupGroups.map((group) => (
          <label
            key={group}
            className={joinClassNames(
              'flex h-10 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition',
              draft.group === group
                ? 'border-[#385772]/30 bg-[#385772] text-white dark:border-emerald-100/20 dark:bg-emerald-200 dark:text-zinc-950'
                : 'border-zinc-200 bg-white text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800',
            )}
          >
            <input
              type="radio"
              name="activity-signup-group"
              value={group}
              checked={draft.group === group}
              onChange={(event) => onUpdateDraft('group', event.target.value)}
              className="sr-only"
            />
            {group}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          集合点
          <input
            value={draft.meetPoint}
            onChange={(event) => onUpdateDraft('meetPoint', event.target.value)}
            placeholder="例如 东门停车区"
            className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
        </label>
        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          车辆状态
          <input
            value={draft.bikeCondition}
            onChange={(event) => onUpdateDraft('bikeCondition', event.target.value)}
            placeholder="例如 已检查刹车和胎压"
            className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          保障需求
          <input
            value={draft.supportNeed}
            onChange={(event) => onUpdateDraft('supportNeed', event.target.value)}
            placeholder="例如 需要队尾照应"
            className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
        </label>
        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          备注
          <input
            value={draft.note}
            onChange={(event) => onUpdateDraft('note', event.target.value)}
            placeholder="例如 可带打气筒"
            className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
        </label>
      </div>
    </>
  );
}

function ThreadFloorCard({
  activeNestedReplyTarget,
  canReplyToThread,
  canUseAuthenticatedActions,
  currentAccountId,
  currentUser,
  deletedNestedReplyIds,
  floor,
  isActivitySignupCanceled = false,
  isActivityThread,
  isMainPost = false,
  navigationContextPath,
  previewLayout = false,
  onOpenNestedReply,
  onQuoteFloor,
  onRequestDelete,
  onRequestNestedReplyDelete,
  onRequestNestedReplyReply,
  onSubmitNestedReply,
  onThreadLinkNavigate,
  thread,
}: {
  activeNestedReplyTarget?: NestedReplyComposerTarget;
  canReplyToThread: boolean;
  canUseAuthenticatedActions: boolean;
  currentAccountId: number | null;
  currentUser: ThreadAuthor;
  deletedNestedReplyIds?: Record<string, boolean>;
  floor: ThreadFloor;
  isActivitySignupCanceled?: boolean;
  isActivityThread?: boolean;
  isMainPost?: boolean;
  navigationContextPath?: string;
  previewLayout?: boolean;
  onOpenNestedReply?: () => void;
  onQuoteFloor?: (floor: ThreadFloor, selectedText: string | null) => void;
  onRequestDelete?: () => void;
  onRequestNestedReplyDelete?: (reply: ThreadNestedReply) => void;
  onRequestNestedReplyReply?: (reply: ThreadNestedReply) => void;
  onSubmitNestedReply?: (content: string) => void;
  onThreadLinkNavigate?: ThreadLinkNavigateHandler;
  thread: ThreadDetail;
}) {
  const selectedFloorTextRef = useRef<string | null>(null);
  const handleSelectedFloorTextChange = useCallback((selectedText: string | null) => {
    selectedFloorTextRef.current = selectedText;
  }, []);

  return (
    <section
      id={`floor-${floor.floor}`}
      className={joinClassNames(
        'card-surface scroll-mt-6 overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800',
        isMainPost && 'border-l-4 border-l-emerald-300 dark:border-l-emerald-200',
      )}
    >
      <div className={joinClassNames('grid min-w-0 grid-cols-1', !previewLayout && 'sm:grid-cols-[8.5rem_minmax(0,1fr)]')}>
        <AuthorRail author={floor.author} isMainPost={isMainPost} previewLayout={previewLayout} />

        <div
          className={joinClassNames(
            'flex min-h-full min-w-0 flex-col border-t border-zinc-200/80 p-4 dark:border-white/10',
            !previewLayout && 'sm:border-l sm:border-t-0 sm:p-5',
          )}
        >
          <div>
            <FloorMeta floor={floor} />

            <ThreadFloorContentFrame
              currentAccountId={currentAccountId}
              floor={floor}
              isActivitySignupCanceled={isActivitySignupCanceled}
              navigationContextPath={navigationContextPath}
              onSelectedTextChange={handleSelectedFloorTextChange}
              onThreadLinkNavigate={onThreadLinkNavigate}
            />

            {floor.attachments && floor.attachments.length > 0 ? (
              <AttachmentList attachments={floor.attachments} />
            ) : null}
          </div>

          {hasFloorSignature(floor) ? (
            <div className="mt-5 border-t border-dashed border-zinc-300/80 pt-3 dark:border-white/15">
              <ThreadFloorSignatureFrame
                currentAccountId={currentAccountId}
                floor={floor}
                navigationContextPath={navigationContextPath}
                onThreadLinkNavigate={onThreadLinkNavigate}
              />
            </div>
          ) : null}

          {canUseAuthenticatedActions && (canReplyToThread || (!isActivityThread && thread.canModerate)) ? (
            <FloorActions
              isMainPost={isMainPost}
              canModerate={!isActivityThread && thread.canModerate}
              showQuoteAction={canReplyToThread && !isActivityThread}
              showReplyAction={canReplyToThread}
              editHref={getThreadFloorEditPath(thread.id, floor.floor)}
              onQuoteClick={() => onQuoteFloor?.(floor, selectedFloorTextRef.current)}
              onReplyClick={onOpenNestedReply}
              onRequestDelete={onRequestDelete}
            />
          ) : null}

          {floor.nestedReplies && floor.nestedReplies.length > 0 ? (
            <NestedReplyList
              canReplyToThread={canReplyToThread}
              canUseAuthenticatedActions={canUseAuthenticatedActions}
              currentUser={currentUser}
              deletedNestedReplyIds={deletedNestedReplyIds}
              replies={floor.nestedReplies}
              onRequestDelete={onRequestNestedReplyDelete}
              onRequestReply={onRequestNestedReplyReply}
            />
          ) : null}

          {activeNestedReplyTarget && canReplyToThread ? (
            <NestedReplyComposer
              target={activeNestedReplyTarget}
              onSubmit={(content) => onSubmitNestedReply?.(content)}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FloorMeta({ floor }: { floor: ThreadFloor }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#875A41] dark:text-white/70">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>发布于：{formatPostTimestamp(floor.time)}</span>
        {floor.editedAt ? (
          <>
            <span className="text-zinc-400 dark:text-white/35">·</span>
            <span>最后编辑于：{formatPostTimestamp(floor.editedAt)}</span>
          </>
        ) : null}
      </div>
      <span className="ml-auto min-w-0 max-w-full break-all text-right text-sm font-bold leading-snug text-[#385772] dark:text-white">
        #{floor.floor}
      </span>
    </div>
  );
}

function AuthorRail({
  author,
  isMainPost,
  previewLayout = false,
}: {
  author: ThreadFloor['author'];
  isMainPost: boolean;
  previewLayout?: boolean;
}) {
  const visibleStarLevel = Math.min(9, Math.max(0, Math.floor(author.starLevel ?? 0)));
  const visibleRating = author.rating.replace(/☆/g, '').trim() || (visibleStarLevel > 0 ? '★'.repeat(visibleStarLevel) : '');
  const avatarCacheKey = author.id.trim() ? `username:${author.id.trim()}` : undefined;

  return (
    <aside className={joinClassNames('flex gap-3 p-4', !previewLayout && 'sm:flex-col sm:items-center sm:gap-2 sm:p-5')}>
      <Link to={author.href} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#385772]">
        <Avatar
          alt={`${author.name} 头像`}
          cacheKey={avatarCacheKey}
          className={joinClassNames('h-14 w-14', !previewLayout && 'sm:h-16 sm:w-16')}
          src={author.avatarSrc}
        />
      </Link>
      <div className={joinClassNames('min-w-0 flex-1', !previewLayout && 'sm:w-full sm:flex-none sm:text-center')}>
        <Link
          to={author.href}
          className="block max-w-full whitespace-normal break-all rounded-sm text-sm font-bold leading-snug text-[#385772] outline-none transition hover:text-zinc-950 hover:underline focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white dark:hover:text-white"
        >
          {author.name}
        </Link>
        {visibleRating ? (
          <div className="mt-1 text-xs font-semibold text-[#875A41] dark:text-white/70">{visibleRating}</div>
        ) : null}
        <div className={joinClassNames('mt-2 flex flex-wrap gap-1', !previewLayout && 'sm:justify-center')}>
          {isMainPost ? <SmallBadge label="楼主" /> : null}
          {author.role && !isMainPost ? <SmallBadge label={author.role} /> : null}
        </div>
      </div>
    </aside>
  );
}

function hasFloorSignature(floor: ThreadFloor) {
  return Boolean(floor.signatureHtml?.trim() || floor.signature?.some((line) => line.trim()));
}

function AttachmentList({ attachments }: { attachments: ThreadAttachment[] }) {
  return (
    <div className="mt-5 rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="flex items-center gap-2 text-xs font-bold text-[#385772] dark:text-white">
        <FileText size={15} className="text-emerald-700/80 dark:text-emerald-100/80" />
        附件
      </h3>
      <div className="mt-3 grid gap-2">
        {attachments.map((attachment) => (
          <a
            key={attachment.name}
            href={attachment.href}
            className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
          >
            <span className="min-w-0 truncate font-semibold text-zinc-800 dark:text-white">{attachment.name}</span>
            <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{attachment.meta}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FloorActions({
  canModerate,
  editHref,
  isMainPost,
  onQuoteClick,
  onReplyClick,
  onRequestDelete,
  showQuoteAction = true,
  showReplyAction = true,
}: {
  canModerate?: boolean;
  editHref?: string;
  isMainPost: boolean;
  onQuoteClick?: () => void;
  onReplyClick?: () => void;
  onRequestDelete?: () => void;
  showQuoteAction?: boolean;
  showReplyAction?: boolean;
}) {
  return (
    <div className="mt-auto pt-5">
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
        {showReplyAction ? <ActionButton icon={<Reply size={15} />} label="回复" onClick={onReplyClick} /> : null}
        {showQuoteAction ? (
          <ActionButton
            icon={<MessageSquareQuote size={15} />}
            label="引用"
            onClick={onQuoteClick}
            onMouseDown={(event) => event.preventDefault()}
          />
        ) : null}
        {canModerate ? (
          <div className="ml-0 flex flex-wrap items-center gap-2 sm:ml-auto">
            <ModerationButton href={editHref} icon={<Pencil size={15} />} label="编辑" />
            {isMainPost ? (
              <ModerationButton destructive icon={<Trash2 size={15} />} label="删帖" onClick={onRequestDelete} />
            ) : (
              <ModerationButton destructive icon={<Trash2 size={15} />} label="删楼" onClick={onRequestDelete} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NestedReplyList({
  canReplyToThread,
  canUseAuthenticatedActions,
  currentUser,
  deletedNestedReplyIds,
  onRequestDelete,
  onRequestReply,
  replies,
}: {
  canReplyToThread: boolean;
  canUseAuthenticatedActions: boolean;
  currentUser: ThreadAuthor;
  deletedNestedReplyIds?: Record<string, boolean>;
  onRequestDelete?: (reply: ThreadNestedReply) => void;
  onRequestReply?: (reply: ThreadNestedReply) => void;
  replies: ThreadNestedReply[];
}) {
  const visibleReplies = replies.filter((reply) => !deletedNestedReplyIds?.[reply.id]);

  if (visibleReplies.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
        {visibleReplies.map((reply) => (
          <NestedReplyItem
            canUseAuthenticatedActions={canUseAuthenticatedActions}
            canReplyToThread={canReplyToThread}
            canDelete={isCurrentNestedReplyAuthor(reply, currentUser)}
            key={reply.id}
            reply={reply}
            onRequestDelete={onRequestDelete}
            onRequestReply={onRequestReply}
          />
        ))}
      </div>
    </div>
  );
}

function NestedReplyItem({
  canDelete,
  canReplyToThread,
  canUseAuthenticatedActions,
  onRequestDelete,
  onRequestReply,
  reply,
}: {
  canDelete: boolean;
  canReplyToThread: boolean;
  canUseAuthenticatedActions: boolean;
  onRequestDelete?: (reply: ThreadNestedReply) => void;
  onRequestReply?: (reply: ThreadNestedReply) => void;
  reply: ThreadNestedReply;
}) {
  return (
    <div id={`lzl-${reply.id}`} className="scroll-mt-6 py-2 first:pt-0 last:pb-0">
      <div className="break-words text-sm leading-[var(--capubbs-thread-card-line-height)]">
        <Link
          to={reply.authorHref}
          className="break-all rounded-sm font-bold text-[#385772] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white"
        >
          {reply.author}
        </Link>
        {reply.target && reply.targetHref ? (
          <>
            {' '}
            <span className="text-zinc-500 dark:text-zinc-400">回复</span>
            {' '}
            <Link
              to={reply.targetHref}
              className="break-all rounded-sm font-bold text-[#385772] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white"
            >
              {reply.target}
            </Link>
          </>
        ) : null}
        <span className="text-zinc-700 dark:text-zinc-200">：{reply.content}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-end gap-3 text-right text-xs font-medium text-[#875A41] dark:text-white/70">
        <span>{formatPostTimestamp(reply.time)}</span>
        {canUseAuthenticatedActions ? (
          <>
            {canReplyToThread ? (
              <ActionButton compact icon={<Reply size={13} />} label="回复" onClick={() => onRequestReply?.(reply)} />
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => onRequestDelete?.(reply)}
                className="inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-zinc-500 transition hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:text-zinc-400 dark:hover:text-rose-200"
              >
                删除
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function NestedReplyComposer({
  onSubmit,
  target,
}: {
  onSubmit: (content: string) => void;
  target: NestedReplyComposerTarget;
}) {
  const [content, setContent] = useState('');
  const canSubmit = content.trim().length > 0;
  const placeholder = target.target ? `回复 ${target.target}` : '写一条楼中楼回复';
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(content);
    setContent('');
  };

  useEffect(() => {
    setContent('');
  }, [target.target, target.targetHref]);

  return (
    <form
      className="mt-4 flex items-stretch gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2 dark:border-white/10 dark:bg-white/[0.04]"
      onSubmit={handleSubmit}
    >
      <textarea
        aria-label={placeholder}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="min-h-10 min-w-0 flex-1 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
      >
        <Send size={15} />
        发送
      </button>
    </form>
  );
}

function DeleteConfirmDialog({
  isConfirming,
  onCancel,
  onConfirm,
  pendingDeletion,
}: {
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pendingDeletion: PendingDeletion | null;
}) {
  if (!pendingDeletion) {
    return null;
  }

  const title =
    pendingDeletion.kind === 'thread'
      ? '确认删除这个帖子？'
      : pendingDeletion.kind === 'floor'
        ? `确认删除 #${pendingDeletion.target.floor} 楼？`
        : pendingDeletion.kind === 'nestedReply'
          ? '确认删除这条楼中楼？'
          : '确认取消报名？';
  const description =
    pendingDeletion.kind === 'thread'
      ? '删除后，这个帖子会从当前详情页移除。'
      : pendingDeletion.kind === 'floor'
        ? '删除后，这一楼会从当前帖子详情中移除。'
        : pendingDeletion.kind === 'nestedReply'
          ? '删除后，这条楼中楼回复会从当前楼层中移除。'
          : '取消后，报名楼层会保留，但楼层内容会标红并加上删除线。';
  const isCancelSignup = pendingDeletion.kind === 'cancelSignup';
  const confirmLabel = isCancelSignup ? '确认取消报名' : '确认删除';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 dark:bg-black/80"
      onClick={onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),26rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-100">
            {isCancelSignup ? <Ban size={17} /> : <Trash2 size={17} />}
          </span>
          <h2 id="delete-confirm-dialog-title" className="text-base font-semibold">
            {title}
          </h2>
        </header>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="inline-flex h-9 items-center rounded-md border border-rose-300 bg-rose-600 px-3 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-900 dark:bg-rose-300 dark:text-zinc-950 dark:hover:bg-rose-200 dark:focus-visible:ring-rose-200"
          >
            {isConfirming ? '处理中...' : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ThreadDeletedNotice({ thread }: { thread: ThreadDetail }) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 text-center shadow-panel dark:border-zinc-800">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-300/15 dark:text-rose-100">
        <Trash2 size={20} />
      </div>
      <h1 className="mt-3 text-xl font-bold text-[#385772] dark:text-white">帖子已删除</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        已从数据库删除《{thread.title}》。
      </p>
      <Link
        to={thread.boardHref}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        返回版面
      </Link>
    </section>
  );
}

function findCurrentUserActivitySignupFloor(
  floors: ThreadFloor[],
  currentUser: ThreadAuthor,
  questions: ThreadActivitySignupQuestion[] = [],
) {
  return [...floors].reverse().find((floor) => (
    isCurrentThreadUser(floor.author, currentUser) &&
    getActivitySignupDraftFromFloor(floor, questions) !== null
  )) ?? null;
}

function isCurrentThreadUser(author: ThreadAuthor, currentUser: ThreadAuthor) {
  return (
    author.id === currentUser.id ||
    author.name === currentUser.name ||
    author.href === currentUser.href ||
    author.href === getPublicProfilePath(currentUser.id)
  );
}

function isCurrentNestedReplyAuthor(reply: ThreadNestedReply, currentUser: ThreadAuthor) {
  const replyAuthor = reply.author.trim();
  const currentUserId = currentUser.id.trim();
  const currentUserName = currentUser.name.trim();

  return (
    (replyAuthor.length > 0 && (replyAuthor === currentUserId || replyAuthor === currentUserName)) ||
    reply.authorHref === currentUser.href ||
    reply.authorHref === getPublicProfilePath(currentUserId) ||
    reply.authorHref === getPublicProfilePath(currentUserName)
  );
}

function getCurrentThreadUser(viewer: LegacyBbsViewer): ThreadAuthor {
  if (!viewer) {
    return currentThreadUser;
  }

  return {
    id: viewer.username,
    name: viewer.username,
    href: getPublicProfilePath(viewer.username),
    rating: viewer.star > 0 ? '★'.repeat(Math.min(viewer.star, 9)) : '★★★',
    starLevel: viewer.star > 0 ? Math.min(viewer.star, 9) : 3,
  };
}

function getActivitySignupOptionValues(
  draft: ActivitySignupDraft,
  questions: ThreadActivitySignupQuestion[] = [],
) {
  if (questions.length > 0) {
    return questions.reduce<Record<string, string>>((values, question) => {
      const value = draft.values[question.id];

      values[question.id] = Array.isArray(value) ? value.join(',') : value?.trim() ?? '';

      return values;
    }, {});
  }

  return {
    报名组别: draft.group,
    集合点: draft.meetPoint,
    车辆状态: draft.bikeCondition,
    保障需求: draft.supportNeed,
    备注: draft.note,
  };
}

function parseThreadTarget(threadId: string | null) {
  const match = threadId?.match(/^(\d+)-(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    bid: Number.parseInt(match[1], 10),
    tid: Number.parseInt(match[2], 10),
  };
}

function parseThreadHashTarget(hash: string, search: string) {
  const targetId = hash ? safeDecodeURIComponent(hash.slice(1)) : '';
  const floorFromHash = getFloorNumberFromTargetId(targetId);
  const floorFromSearch = getFloorNumberFromSearch(search);
  const floorNumber = floorFromHash ?? floorFromSearch;

  return {
    fallbackFloorNumber: floorFromSearch ?? floorFromHash,
    floorNumber,
    targetId,
  };
}

function getThreadPageFromSearch(search: string, targetFloorNumber: number | null) {
  const searchParams = new URLSearchParams(search);
  const explicitPage = normalizePositiveInteger(searchParams.get('page') ?? searchParams.get('p'));

  if (explicitPage) {
    return explicitPage;
  }

  if (!targetFloorNumber) {
    return 1;
  }

  return Math.max(1, Math.ceil(targetFloorNumber / LEGACY_THREAD_CONTENT_PAGE_SIZE));
}

function getThreadPagePath(pathname: string, search: string, page: number) {
  const nextPage = Math.max(1, Math.floor(page));
  const searchParams = new URLSearchParams(search);

  searchParams.delete('floor');
  searchParams.delete('p');
  if (nextPage > 1) {
    searchParams.set('page', String(nextPage));
  } else {
    searchParams.delete('page');
  }

  const query = searchParams.toString();

  return `${pathname}${query ? `?${query}` : ''}`;
}

function getFloorNumberFromTargetId(targetId: string) {
  const match = targetId.match(/^floor-(\d+)$/);

  return match ? normalizePositiveInteger(match[1]) : null;
}

function getFloorNumberFromSearch(search: string) {
  const value = new URLSearchParams(search).get('floor');

  return value ? normalizePositiveInteger(value) : null;
}

function normalizePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) && number > 0 ? number : null;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getVisibleHashTargetElement(targetId: string) {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('[id]')).filter(
    (element) => element.id === targetId,
  );

  return candidates.find(isVisibleHashTargetElement) ?? candidates[0] ?? null;
}

function isVisibleHashTargetElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function scrollHashTargetIntoView(element: HTMLElement) {
  const scrollContainer = getNearestScrollContainer(element);
  if (!scrollContainer) {
    element.scrollIntoView({ block: 'start' });
    return;
  }

  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const targetOffset = getScrollContainerTopOffset(scrollContainer);
  const targetTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - targetOffset;

  scrollContainer.scrollTop = Math.max(0, targetTop);
}

function getScrollContainerTopOffset(scrollContainer: HTMLElement) {
  return Number.parseFloat(window.getComputedStyle(scrollContainer).paddingTop) || 0;
}

function getNearestScrollContainer(element: HTMLElement) {
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

let threadPreviewTargetSequence = 0;

function createThreadPreviewTarget(path: string): ThreadPreviewTarget {
  const url = new URL(path, 'https://capubbs.local');
  const normalizedPath = `${url.pathname}${url.search}${url.hash}`;
  const threadId = getThreadIdFromPath(url.pathname) ?? '';
  threadPreviewTargetSequence += 1;

  return {
    key: `thread-preview-${threadPreviewTargetSequence}`,
    location: {
      hash: url.hash,
      key: `thread-preview-location-${threadPreviewTargetSequence}`,
      pathname: url.pathname,
      search: url.search,
    },
    path: normalizedPath,
    threadId,
  };
}

function canOpenThreadSidePreview() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;
}

function clampFloatingPreviewPanePosition(
  position: FloatingPreviewPanePosition,
  width: number,
  height: number,
): FloatingPreviewPanePosition {
  if (typeof window === 'undefined') {
    return position;
  }

  const maxX = Math.max(FLOATING_PREVIEW_PANE_MARGIN, window.innerWidth - width - FLOATING_PREVIEW_PANE_MARGIN);
  const maxY = Math.max(FLOATING_PREVIEW_PANE_MARGIN, window.innerHeight - height - FLOATING_PREVIEW_PANE_MARGIN);

  return {
    x: Math.min(maxX, Math.max(FLOATING_PREVIEW_PANE_MARGIN, position.x)),
    y: Math.min(maxY, Math.max(FLOATING_PREVIEW_PANE_MARGIN, position.y)),
  };
}

function isFloatingPreviewInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, [data-no-drag]'));
}

function makeLocalTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

function ReplyComposer({
  onSubmit,
  ownerKey,
  quoteRequest,
  signatureProfileName,
  thread,
}: {
  onSubmit: (payload: ReplyFloorSubmitPayload) => Promise<LegacyBbsWritePostResponse>;
  ownerKey: string | null;
  quoteRequest: FloorQuoteRequest | null;
  signatureProfileName: string | null;
  thread: ThreadDetail;
}) {
  const location = useLocation();
  const composerRef = useRef<HTMLElement>(null);
  const [editorFocusRequest, setEditorFocusRequest] = useState(0);
  const [replyDraft, setReplyDraft] = useState<RichTextEditorValue>({
    content: '',
    mode: 'rich',
  });
  const [attachments, setAttachments] = useState<ReplyAttachmentDraft[]>([]);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [signatureIndex, setSignatureIndex] = useState(0);
  const { options: signatureOptions, status: signatureStatus } = useLegacySignatureOptions(signatureProfileName);
  const draftId = new URLSearchParams(location.search).get('draft');
  const hasReplyContent = hasEditorContent(replyDraft);
  const hasDraftContent = hasReplyContent || attachments.length > 0;
  const canPublishReply = hasReplyContent && !isPublishing;

  useEffect(() => {
    const storedDraft = readStoredReplyDraft(draftId, ownerKey);

    if (!storedDraft || storedDraft.threadId !== thread.id) {
      return;
    }

    setReplyDraft(storedDraft.editor);
    setAttachments(storedDraft.attachments.map((attachment) => ({ ...attachment, restored: true })));
    setSignatureIndex(storedDraft.signatureIndex ?? 0);
    setSavedDraftId(storedDraft.id);
    setDraftStatus('草稿已恢复');
    setEditorFocusRequest((request) => request + 1);
  }, [draftId, ownerKey, thread.id]);

  useEffect(() => {
    if (!quoteRequest) {
      return;
    }

    setReplyDraft((currentDraft) => appendFloorQuoteToEditorValue(currentDraft, quoteRequest));
    setDraftStatus('');
    setEditorFocusRequest((request) => request + 1);

    const frame = window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [quoteRequest]);

  const addAttachments = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const nextAttachments = files.map<ReplyAttachmentDraft>((file) => ({
      id: createReplyAttachmentId(file),
      lastModified: file.lastModified,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));

    setAttachments((currentAttachments) => [...currentAttachments, ...nextAttachments]);
    setDraftStatus('');
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentId),
    );
    setDraftStatus('');
  };

  const updateReplyDraft = (nextDraft: RichTextEditorValue) => {
    setReplyDraft(nextDraft);
    setDraftStatus('');
  };

  const saveCurrentDraft = () => {
    if (!hasDraftContent) {
      return;
    }

    const storedDraft = saveStoredReplyDraft(
      {
        id: savedDraftId ?? draftId ?? undefined,
        attachments: attachments.map(({ restored: _restored, ...attachment }) => attachment),
        board: thread.board,
        boardHref: thread.boardHref,
        editor: getRichTextEditorStorageValue(replyDraft),
        excerpt: getReplyDraftExcerpt(replyDraft, attachments),
        signatureIndex,
        threadId: thread.id,
        threadTitle: thread.title,
      },
      ownerKey,
    );

    if (!storedDraft) {
      return;
    }

    setSavedDraftId(storedDraft.id);
    setDraftStatus('已存入草稿箱');
  };
  const publishReply = async () => {
    if (!canPublishReply) {
      return;
    }

    setIsPublishing(true);
    setDraftStatus('正在发布...');

    try {
      const savedPost = await onSubmit({
        sig: signatureIndex,
        text: getEditorStorageHtml(getRichTextEditorStorageValue(replyDraft)),
      });
      setReplyDraft({
        content: '',
        mode: 'rich',
      });
      setAttachments([]);
      setSignatureIndex(0);
      setSavedDraftId(null);
      setDraftStatus(savedPost.pid > 0 ? `已发布到 #${savedPost.pid}` : '回复已发布');
    } catch (error) {
      setDraftStatus(getErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section ref={composerRef} className="card-surface scroll-mt-6 rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#385772] dark:text-white">写回复</h2>
        <span className="text-xs font-semibold text-[#875A41] dark:text-white/70">Re: {thread.title}</span>
      </div>
      <div className="mt-3">
        <RichTextEditor
          ariaLabel={`Re: ${thread.title}`}
          focusRequest={editorFocusRequest}
          value={replyDraft}
          onChange={updateReplyDraft}
        />
      </div>
      <div className="mt-3">
        <SignatureSelector
          id="thread-reply-signature"
          options={signatureOptions}
          status={signatureStatus}
          value={signatureIndex}
          onChange={setSignatureIndex}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsAttachmentDialogOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
        >
          <Paperclip size={16} />
          添加附件
          {attachments.length > 0 ? (
            <span className="rounded-full bg-[#385772] px-1.5 py-0.5 text-[0.68rem] leading-none text-white dark:bg-emerald-200 dark:text-zinc-950">
              {attachments.length}
            </span>
          ) : null}
        </button>
        {draftStatus ? <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-100">{draftStatus}</span> : null}
        <div className="ml-auto flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={!hasDraftContent || isPublishing}
            onClick={saveCurrentDraft}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-4 text-sm font-bold text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <Save size={16} />
            存入草稿
          </button>
          <button
            type="button"
            disabled={!canPublishReply}
            onClick={publishReply}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
          >
            <Send size={16} />
            {isPublishing ? '发布中...' : '发布回复'}
          </button>
        </div>
      </div>
      {isAttachmentDialogOpen ? (
        <AttachmentUploadDialog
          attachments={attachments}
          onAddFiles={addAttachments}
          onClose={() => setIsAttachmentDialogOpen(false)}
          onRemoveAttachment={removeAttachment}
        />
      ) : null}
    </section>
  );
}

function AttachmentUploadDialog({
  attachments,
  onAddFiles,
  onClose,
  onRemoveAttachment,
}: {
  attachments: ReplyAttachmentDraft[];
  onAddFiles: (files: File[]) => void;
  onClose: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAddFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attachment-upload-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 dark:bg-black/80"
      onClick={onClose}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),34rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[rgb(164_193_172_/_0.34)] text-emerald-800 dark:bg-white/[0.1] dark:text-emerald-100">
              <UploadCloud size={17} />
            </span>
            <h2 id="attachment-upload-dialog-title" className="truncate text-base font-semibold">
              文件上传
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭文件上传"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-3 px-4 py-4">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#385772]/35 bg-[rgb(164_193_172_/_0.16)] px-4 py-5 text-center text-sm font-semibold text-[#385772] transition hover:bg-[rgb(164_193_172_/_0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <UploadCloud size={24} />
            选择文件
          </button>
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#385772] dark:text-white">{attachment.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(attachment.size)}
                      {attachment.restored ? ' · 已恢复' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`移除 ${attachment.name}`}
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <footer className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
          >
            完成
          </button>
        </footer>
      </section>
    </div>
  );
}

function createReplyAttachmentId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getReplyDraftExcerpt(value: RichTextEditorValue, attachments: ReplyAttachmentDraft[]) {
  const text = getEditorPlainText(value);

  if (text) {
    return text.length > 72 ? `${text.slice(0, 72)}...` : text;
  }

  return attachments.length > 0 ? `${attachments.length} 个附件` : '';
}

function getEditorPlainText(value: RichTextEditorValue) {
  if (value.mode === 'markdown') {
    return value.content
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/[*_`>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const container = document.createElement('div');
  container.innerHTML = value.content;

  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function getEditorStorageHtml(value: RichTextEditorValue) {
  if (value.mode === 'html' || value.mode === 'rich') {
    return normalizeNewForumQuotesForLegacyStorage(value.content);
  }

  return getMarkdownEditorStorageHtml(value.content);
}

function getMarkdownEditorStorageHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let markdownLines: string[] = [];
  let quoteLines: string[] = [];

  const flushMarkdownLines = () => {
    const html = getBasicMarkdownStorageHtml(markdownLines.join('\n'));

    if (html) {
      blocks.push(html);
    }

    markdownLines = [];
  };

  const flushQuoteLines = () => {
    if (quoteLines.length === 0) {
      return;
    }

    const quoteStorage = parseMarkdownFloorQuoteStorage(quoteLines, markdownFloorQuoteMetaPattern);

    if (quoteStorage) {
      flushMarkdownLines();
      blocks.push(quoteStorage);
    } else {
      markdownLines.push(...quoteLines.map((line) => `> ${line}`));
    }

    quoteLines = [];
  };

  lines.forEach((line) => {
    const quoteMatch = line.match(/^\s*>\s?(.*)$/);

    if (quoteMatch) {
      quoteLines.push(quoteMatch[1]);
      return;
    }

    flushQuoteLines();
    markdownLines.push(line);
  });

  flushQuoteLines();
  flushMarkdownLines();

  return blocks.join('');
}

function getBasicMarkdownStorageHtml(markdown: string) {
  const text = markdown
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^[>\-*#]+\s*/gm, '')
    .replace(/[*_`]/g, '');

  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function appendFloorQuoteToEditorValue(value: RichTextEditorValue, quote: FloorQuoteRequest): RichTextEditorValue {
  const quoteContent =
    value.mode === 'markdown'
      ? buildMarkdownFloorQuote(quote)
      : buildHtmlFloorQuote(quote);
  const separator = value.content.trim() ? (value.mode === 'markdown' ? '\n\n' : '\n') : '';

  return {
    ...value,
    content: `${value.content}${separator}${quoteContent}`,
  };
}

function buildMarkdownFloorQuote(quote: FloorQuoteRequest) {
  const quoteLines = splitQuoteParagraphs(quote.text)
    .flatMap((paragraph, index) => (index === 0 ? [paragraph] : ['', paragraph]))
    .map((line) => `> ${line}`);

  return [
    ...quoteLines,
    '> ',
    `> 引用自 [${escapeMarkdownLinkText(quote.author)}](${quote.authorHref}) [>>](${quote.href})`,
  ].join('\n');
}

function buildHtmlFloorQuote(quote: FloorQuoteRequest) {
  const quoteParagraphs = splitQuoteParagraphs(quote.text)
    .map((paragraph) => `<p class="capubbs-floor-quote-content">${escapeHtml(paragraph)}</p>`)
    .join('');

  return [
    '<blockquote class="capubbs-floor-quote">',
    quoteParagraphs,
    `<p class="capubbs-floor-quote-meta"><span>引用自 <a href="${escapeAttribute(quote.authorHref)}">${escapeHtml(quote.author)}</a></span><a class="capubbs-floor-quote-jump" href="${escapeAttribute(quote.href)}">&gt;&gt;</a></p>`,
    '</blockquote>',
    '<p><br></p>',
  ].join('');
}

function splitQuoteParagraphs(text: string) {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [''];
}

function hasEditorContent(value: RichTextEditorValue) {
  if (value.mode !== 'rich') {
    return value.content.trim().length > 0;
  }

  const container = document.createElement('div');
  container.innerHTML = value.content;

  return (container.textContent ?? '').trim().length > 0 || container.querySelector('img') !== null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function escapeMarkdownLinkText(text: string) {
  return text.replace(/([\\[\]])/g, '\\$1');
}

function ActionButton({
  compact = false,
  icon,
  label,
  onClick,
  onMouseDown,
}: {
  compact?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={joinClassNames(
        'inline-flex items-center gap-1.5 rounded-md font-semibold text-[#385772] transition hover:bg-emerald-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white dark:hover:bg-white/[0.08]',
        compact ? 'px-1 py-0.5 text-xs' : 'h-9 px-2.5 text-sm',
      )}
    >
      <span className="text-emerald-700/80 dark:text-emerald-100/80">{icon}</span>
      {label}
    </button>
  );
}

function ModerationButton({
  destructive = false,
  href,
  icon,
  label,
  onClick,
}: {
  destructive?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const className = joinClassNames(
    'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2',
    destructive
      ? 'border-rose-200 bg-rose-50/80 text-rose-700 hover:border-rose-300 hover:bg-rose-100 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100 dark:hover:bg-rose-300/20 dark:focus-visible:ring-rose-200'
      : 'border-zinc-200 bg-white/60 text-zinc-600 hover:border-[#875A41]/30 hover:bg-zinc-100 hover:text-[#875A41] focus-visible:ring-[#875A41] dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white',
  );

  if (href) {
    return (
      <Link to={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
    >
      {icon}
      {label}
    </button>
  );
}

function ThreadBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'amber' | 'emerald' | 'sky';
}) {
  return (
    <span
      className={joinClassNames(
        'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-bold',
        tone === 'amber' && 'border-amber-300/40 bg-amber-100/80 text-amber-900 dark:border-amber-100/15 dark:bg-amber-300/15 dark:text-amber-100',
        tone === 'emerald' && 'border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-100/15 dark:bg-emerald-300/15 dark:text-emerald-100',
        tone === 'sky' && 'border-sky-300/50 bg-sky-50 text-sky-800 dark:border-sky-100/15 dark:bg-sky-300/15 dark:text-sky-100',
      )}
    >
      {label}
    </span>
  );
}

function SmallBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-emerald-700/20 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-800 dark:border-white/10 dark:text-emerald-100">
      {label}
    </span>
  );
}

function ThreadDetailSkeleton({
  showComposer = true,
  showHeader = true,
}: {
  showComposer?: boolean;
  showHeader?: boolean;
}) {
  return (
    <article className="space-y-4" aria-busy="true">
      {showHeader ? (
        <section className="overflow-hidden rounded-lg bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300 p-[1px] shadow-panel">
          <div className="card-surface rounded-[7px] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto sm:flex-1">
                <SkeletonLine className="h-10 w-10 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <SkeletonLine className="h-8 w-4/5 max-w-[36rem] sm:h-9" />
                  <div className="flex flex-wrap gap-2">
                    <SkeletonLine className="h-5 w-16" />
                    <SkeletonLine className="h-5 w-20" />
                    <SkeletonLine className="h-5 w-24" />
                  </div>
                </div>
              </div>
              <SkeletonLine className="h-10 w-full rounded-lg sm:w-44" />
            </div>
          </div>
        </section>
      ) : null}

      <ThreadFloorCardSkeleton isMainPost />
      {Array.from({ length: 4 }, (_, index) => (
        <ThreadFloorCardSkeleton key={index} />
      ))}

      {showComposer ? (
        <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine className="h-5 w-20" />
          <SkeletonLine className="h-4 w-36" />
        </div>
        <SkeletonLine className="mt-3 h-32 w-full rounded-lg" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SkeletonLine className="h-10 w-28 rounded-lg" />
          <SkeletonLine className="ml-auto h-10 w-24 rounded-lg" />
          <SkeletonLine className="h-10 w-28 rounded-lg" />
        </div>
        </section>
      ) : null}
    </article>
  );
}

function ThreadFloorCardSkeleton({ isMainPost = false }: { isMainPost?: boolean }) {
  return (
    <section
      className={joinClassNames(
        'card-surface overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800',
        isMainPost && 'border-l-4 border-l-emerald-300 dark:border-l-emerald-200',
      )}
    >
      <div className="grid min-w-0 grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <aside className="flex gap-3 p-4 sm:flex-col sm:items-center sm:gap-2 sm:p-5">
          <SkeletonLine className="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1 space-y-2 sm:w-full sm:flex-none sm:text-center">
            <SkeletonLine className="h-5 w-28 max-w-full sm:mx-auto" />
            <SkeletonLine className="h-4 w-20 sm:mx-auto" />
            <div className="flex flex-wrap gap-1 sm:justify-center">
              <SkeletonLine className="h-5 w-10 rounded-full" />
              {isMainPost ? <SkeletonLine className="h-5 w-10 rounded-full" /> : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0 border-t border-zinc-200/80 p-4 dark:border-white/10 sm:border-l sm:border-t-0 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-5 w-10" />
          </div>
          <div className="space-y-3">
            <SkeletonLine className="h-5 w-full" />
            <SkeletonLine className="h-5 w-11/12" />
            <SkeletonLine className="h-5 w-4/5" />
            {isMainPost ? (
              <>
                <SkeletonLine className="h-5 w-10/12" />
                <SkeletonLine className="h-5 w-7/12" />
              </>
            ) : null}
          </div>
          <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <SkeletonLine className="h-9 w-16 rounded-md" />
              <SkeletonLine className="h-9 w-16 rounded-md" />
              {isMainPost ? <SkeletonLine className="h-9 w-20 rounded-md sm:ml-auto" /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={joinClassNames(
        'animate-pulse rounded-md bg-zinc-200/75 dark:bg-white/[0.09]',
        className,
      )}
    />
  );
}

function ThreadNotFound({ threadId }: { threadId: string | null }) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
      <h1 className="text-xl font-bold text-[#385772] dark:text-white">没有找到帖子</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {threadId ? `当前地址中的「${threadId}」还没有配置帖子详情。` : '当前地址缺少帖子编号。'}
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        返回首页
      </Link>
    </section>
  );
}

function isLoginRequiredThreadError(error: string | null) {
  return Boolean(error && /(?:请|需要|后)登录|登录后/.test(error));
}
