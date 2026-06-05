import {
  ChevronDown,
  ChevronUp,
  Eye,
  Globe2,
  Settings,
  Lock,
  MessageCircle,
  MoveRight,
  PenLine,
  Pin,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLegacyBbs, useLegacyBbsBoardDetail } from '../api/LegacyBbsDataContext';
import {
  legacyBbsPost,
  type LegacyBbsThreadModerationResponse,
  type LegacyBbsThreadMoveResponse,
} from '../api/legacyBbsClient';
import { ListDisplayToolbar } from '../components/common/ListDisplayToolbar';
import { Metric } from '../components/feed/Metric';
import { PaginationControls } from '../components/user/PaginationControls';
import { getLegacyForumBoardByBid, getLegacyForumBoardByName, legacyForumBoards } from '../data/forumBoards';
import { useCachedImages } from '../hooks/useCachedImages';
import type {
  BoardDetail,
  BoardSort,
  BoardThread,
  BoardThreadKind,
} from '../types/forum';
import type { ListPageSize } from '../types/listDisplay';
import { DEFAULT_LIST_PAGE_SIZE } from '../types/listDisplay';
import { getActivityGradientClass } from '../utils/activityGradients';
import { canViewerPostToBoard, getBoardStarRequirementMessage } from '../utils/boardStarRequirement';
import { joinClassNames } from '../utils/classNames';
import { formatPostTimestamp } from '../utils/formatPostTimestamp';
import { getThreadPathFromHref } from '../utils/threadRoutes';
import { getPublicProfilePath } from '../utils/userRoutes';
import { isGuestViewer } from '../utils/viewerPermissions';

type BoardRouteProps = {
  alwaysShowCompactMode: boolean;
  boardName: string | null;
  listCompactMode: boolean;
  topBarCollapsed: boolean;
  onListCompactModeChange: (compact: boolean) => void;
};

type ThreadModerationKey = 'deleted' | 'digest' | 'globalPinned' | 'locked' | 'pinned';

type ThreadModerationState = Partial<Record<ThreadModerationKey, boolean>>;

type ManagedBoardThread = BoardThread & {
  deleted?: boolean;
};

type LegacyBoardOption = (typeof legacyForumBoards)[number];

type MoveThreadConfirmation = {
  targetBoard: LegacyBoardOption;
  thread: ManagedBoardThread;
};

const sortOptions: Array<{ key: BoardSort; label: string }> = [
  { key: 'lastReply', label: '最新回复' },
  { key: 'latest', label: '最新发布' },
];
const BOARD_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;
const MAX_BOARD_COVER_STORAGE_LENGTH = 2_000_000;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

export function BoardRoute({
  alwaysShowCompactMode,
  boardName,
  listCompactMode,
  topBarCollapsed,
  onListCompactModeChange,
}: BoardRouteProps) {
  const legacyBbs = useLegacyBbs();
  const [searchParams] = useSearchParams();
  const [onlyDigest, setOnlyDigest] = useState(false);
  const [onlyActivity, setOnlyActivity] = useState(false);
  const [sortMode, setSortMode] = useState<BoardSort>('lastReply');
  const [currentPage, setCurrentPage] = useState(1);
  const [threadListPageSize, setThreadListPageSize] = useState<ListPageSize>(BOARD_PAGE_SIZE);
  const [isManaging, setIsManaging] = useState(false);
  const [threadModeration, setThreadModeration] = useState<Record<string, ThreadModerationState>>({});
  const [pendingModerationKeys, setPendingModerationKeys] = useState<Record<string, boolean>>({});
  const [movedThreadIds, setMovedThreadIds] = useState<Record<string, true>>({});
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [pendingGlobalPinThread, setPendingGlobalPinThread] = useState<ManagedBoardThread | null>(null);
  const [pendingMoveThread, setPendingMoveThread] = useState<ManagedBoardThread | null>(null);
  const [moveConfirmation, setMoveConfirmation] = useState<MoveThreadConfirmation | null>(null);
  const legacyBoardState = useLegacyBbsBoardDetail(boardName, {
    page: currentPage,
    pageSize: threadListPageSize,
    sort: sortMode,
    type: onlyActivity ? 'activity' : onlyDigest ? 'digest' : 'all',
  });
  const resolvedBoardId = legacyBbs.resolveBoardId(boardName);
  const knownBoardSummary = legacyBbs.getBoardSummary(boardName) ?? getLegacyForumBoardByName(boardName);
  const board = legacyBoardState.board;
  const isGuest = isGuestViewer(legacyBbs.viewer);
  const canManageBoard = !isGuest && legacyBoardState.canModerate;
  const canGlobalPin = !isGuest && legacyBoardState.canGlobalPin;
  const canMoveThread = canGlobalPin;
  const canPostThread = !isGuest && legacyBoardState.canPost && canViewerPostToBoard(legacyBbs.viewer, board?.requiredStar);
  const canFilterActivity = Boolean(
    board && (board.name === '活动交流' || board.name === '车协工作区' || board.threads.some((thread) => thread.kind === 'activity')),
  );

  useEffect(() => {
    setOnlyDigest(searchParams.get('filter') === 'digest');
    setOnlyActivity(searchParams.get('filter') === 'activity');
    setSortMode(getBoardSortFromParams(searchParams));
    setCurrentPage(getBoardPageFromParams(searchParams));
    setIsManaging(false);
    setThreadModeration({});
    setPendingModerationKeys({});
    setMovedThreadIds({});
    setModerationError(null);
    setPendingGlobalPinThread(null);
    setPendingMoveThread(null);
    setMoveConfirmation(null);
  }, [boardName, searchParams]);

  useEffect(() => {
    setCurrentPage(getBoardPageFromParams(searchParams));
  }, [onlyActivity, onlyDigest, searchParams, sortMode, threadListPageSize]);

  useEffect(() => {
    if (!canManageBoard) {
      setIsManaging(false);
    }
  }, [canManageBoard]);

  const managedThreads = useMemo(
    () =>
      board?.threads.map((thread) =>
        applyThreadModerationState(
          thread,
          threadModeration[thread.id],
        ),
      ).filter((thread) => !movedThreadIds[thread.id]) ?? [],
    [board, movedThreadIds, threadModeration],
  );
  const activeSortMode = isManaging ? 'lastReply' : sortMode;
  const activeOnlyActivity = !isManaging && canFilterActivity && onlyActivity;
  const activeOnlyDigest = !isManaging && onlyDigest;

  const filteredResult = useMemo(
    () =>
      board
        ? getVisibleThreads(managedThreads, activeSortMode, {
            includeDeleted: isManaging,
            onlyActivity: Boolean(activeOnlyActivity),
            onlyDigest: activeOnlyDigest,
          })
        : {
            matchedCount: 0,
            threads: [],
          },
    [activeOnlyActivity, activeOnlyDigest, activeSortMode, board, isManaging, managedThreads],
  );
  const totalThreadCount = board?.threadTotal ?? filteredResult.threads.length;
  const totalPages = Math.max(1, Math.ceil(totalThreadCount / threadListPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedThreads = filteredResult.threads;
  const effectiveThreadListCompact = alwaysShowCompactMode || listCompactMode;
  const displayStats = {
    displayedCount: pagedThreads.length,
    matchedCount: totalThreadCount,
  };
  const updateThreadModeration = (threadId: string, key: ThreadModerationKey, value: boolean) => {
    if (key === 'globalPinned') {
      if (value) {
        const thread = managedThreads.find((item) => item.id === threadId);

        if (thread) {
          setPendingGlobalPinThread(thread);
          return;
        }
      }
    }

    void commitThreadModerationChange(threadId, key, value);
  };
  const commitThreadModerationChange = async (threadId: string, key: ThreadModerationKey, value: boolean) => {
    const target = parseBoardThreadTarget(threadId);
    const requestKey = `${threadId}:${key}`;

    if (!target) {
      setModerationError('缺少真实主题编号，无法执行帖子管理操作。');
      return;
    }

    setModerationError(null);
    setPendingModerationKeys((current) => ({ ...current, [requestKey]: true }));

    try {
      const data = await legacyBbsPost<LegacyBbsThreadModerationResponse>(
        key === 'deleted'
          ? `/threads/${target.bid}/${target.tid}/delete`
          : `/threads/${target.bid}/${target.tid}/moderation`,
        key === 'deleted'
          ? undefined
          : {
              action: key,
              active: value,
            },
      );

      setThreadModeration((current) => ({
        ...current,
        [threadId]: {
          ...current[threadId],
          ...getThreadModerationStateFromResponse(data),
          ...(key === 'deleted' ? { deleted: true } : {}),
        },
      }));
    } catch (error) {
      setModerationError(getErrorMessage(error));
    } finally {
      setPendingModerationKeys((current) => {
        const next = { ...current };
        delete next[requestKey];
        return next;
      });
    }
  };
  const isModerationPending = (threadId: string, key: ThreadModerationKey) =>
    Boolean(pendingModerationKeys[`${threadId}:${key}`]);
  const isMovePending = (threadId: string) => Boolean(pendingModerationKeys[`${threadId}:move`]);
  const requestMoveThread = (thread: ManagedBoardThread) => {
    setModerationError(null);
    setPendingMoveThread(thread);
  };
  const requestMoveThreadConfirmation = (thread: ManagedBoardThread, targetBoard: LegacyBoardOption) => {
    setPendingMoveThread(null);
    setMoveConfirmation({
      targetBoard,
      thread,
    });
  };
  const commitMoveThread = async (thread: ManagedBoardThread, targetBoard: LegacyBoardOption) => {
    const source = parseBoardThreadTarget(thread.id);
    const requestKey = `${thread.id}:move`;

    if (!source) {
      setMovedThreadIds((current) => ({ ...current, [thread.id]: true }));
      setMoveConfirmation(null);
      return;
    }

    setModerationError(null);
    setPendingModerationKeys((current) => ({ ...current, [requestKey]: true }));

    try {
      await legacyBbsPost<LegacyBbsThreadMoveResponse>(
        `/threads/${source.bid}/${source.tid}/move`,
        { to: targetBoard.bid },
      );
      setMovedThreadIds((current) => ({ ...current, [thread.id]: true }));
      setMoveConfirmation(null);
    } catch (error) {
      setModerationError(getErrorMessage(error));
      setMoveConfirmation(null);
    } finally {
      setPendingModerationKeys((current) => {
        const next = { ...current };
        delete next[requestKey];
        return next;
      });
    }
  };

  const isWaitingForBoard =
    Boolean(boardName) &&
    !board &&
    (
      legacyBoardState.isResolvingBoard ||
      legacyBoardState.status === 'loading' ||
      (resolvedBoardId !== null && legacyBoardState.status === 'idle')
    );

  if (isWaitingForBoard) {
    return <BoardDetailSkeleton compact={alwaysShowCompactMode} topBarCollapsed={topBarCollapsed} />;
  }

  if (!board) {
    if (isGuest && knownBoardSummary) {
      return <BoardLoginRequired boardName={knownBoardSummary.name || boardName} />;
    }

    return <BoardNotFound boardName={boardName} />;
  }

  return (
    <div className="space-y-4">
      <BoardHeader
        board={board}
        canManageBoard={canManageBoard}
        canPostThread={canPostThread}
        isManaging={isManaging}
        onToggleManage={() => setIsManaging((value) => !value)}
      />

      {moderationError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-panel dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100">
          {moderationError}
        </div>
      ) : null}

      {!isManaging ? (
        <div className="lg:hidden">
          <BoardFilterPanel
            canFilterActivity={Boolean(canFilterActivity)}
            displayStats={displayStats}
            onlyActivity={onlyActivity}
            onlyDigest={onlyDigest}
            sortMode={sortMode}
            onChangeOnlyActivity={setOnlyActivity}
            onChangeOnlyDigest={setOnlyDigest}
            onChangeSortMode={setSortMode}
          />
        </div>
      ) : null}

      <div
        className={joinClassNames(
          'grid gap-4',
          isManaging ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_18rem]',
        )}
      >
        <section className="min-w-0 space-y-4">
          <ListDisplayToolbar
            compact={effectiveThreadListCompact}
            compactLocked={alwaysShowCompactMode}
            pageSize={threadListPageSize}
            onCompactChange={onListCompactModeChange}
            onPageSizeChange={setThreadListPageSize}
          />
          <section className="space-y-2">
            <div className="space-y-2">
              {pagedThreads.map((thread) => (
                <BoardThreadCard
                  key={thread.id}
                  canGlobalPin={canGlobalPin}
                  canMoveThread={canMoveThread}
                  compact={effectiveThreadListCompact}
                  isModerationPending={isModerationPending}
                  isMovePending={isMovePending}
                  isManaging={isManaging}
                  thread={thread}
                  onModerationChange={updateThreadModeration}
                  onMoveThread={requestMoveThread}
                />
              ))}
            </div>
            {pagedThreads.length === 0 ? <EmptyBoardResult /> : null}
          </section>

          {totalPages > 1 ? (
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </section>

        {!isManaging ? (
          <aside
            className="z-10 hidden self-start transition-[top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:block"
            style={{
              top: topBarCollapsed
                ? 'var(--capubbs-topbar-collapsed-sticky-offset)'
                : 'var(--capubbs-topbar-sticky-offset)',
            }}
          >
            <BoardFilterPanel
              canFilterActivity={Boolean(canFilterActivity)}
              displayStats={displayStats}
              onlyActivity={onlyActivity}
              onlyDigest={onlyDigest}
              sortMode={sortMode}
              onChangeOnlyActivity={setOnlyActivity}
              onChangeOnlyDigest={setOnlyDigest}
              onChangeSortMode={setSortMode}
            />
          </aside>
        ) : null}
      </div>
      {pendingGlobalPinThread ? (
        <GlobalPinConfirmDialog
          thread={pendingGlobalPinThread}
          onCancel={() => setPendingGlobalPinThread(null)}
          onConfirm={() => {
            void commitThreadModerationChange(pendingGlobalPinThread.id, 'globalPinned', true);
            setPendingGlobalPinThread(null);
          }}
        />
      ) : null}
      {pendingMoveThread ? (
        <MoveThreadDialog
          currentBoardBid={parseBoardThreadTarget(pendingMoveThread.id)?.bid ?? resolvedBoardId}
          thread={pendingMoveThread}
          onCancel={() => setPendingMoveThread(null)}
          onNext={(targetBoard) => requestMoveThreadConfirmation(pendingMoveThread, targetBoard)}
        />
      ) : null}
      {moveConfirmation ? (
        <MoveThreadConfirmDialog
          isPending={isMovePending(moveConfirmation.thread.id)}
          sourceBoard={getLegacyForumBoardByBid(parseBoardThreadTarget(moveConfirmation.thread.id)?.bid ?? resolvedBoardId)}
          targetBoard={moveConfirmation.targetBoard}
          thread={moveConfirmation.thread}
          onBack={() => {
            setPendingMoveThread(moveConfirmation.thread);
            setMoveConfirmation(null);
          }}
          onCancel={() => setMoveConfirmation(null)}
          onConfirm={() => {
            void commitMoveThread(moveConfirmation.thread, moveConfirmation.targetBoard);
          }}
        />
      ) : null}
    </div>
  );
}

function GlobalPinConfirmDialog({
  onCancel,
  onConfirm,
  thread,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  thread: ManagedBoardThread;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-pin-confirm-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-3 dark:bg-black/80"
      onClick={onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),28rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-[#385772] dark:bg-emerald-300/15 dark:text-emerald-100">
            <Globe2 size={17} />
          </span>
          <h2 id="global-pin-confirm-dialog-title" className="text-base font-semibold">
            确认全局置顶
          </h2>
        </header>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            确认将《{thread.title}》设为全局置顶吗？该操作会使得帖子出现在首页全局置顶块中。
          </p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-md border border-[#385772]/30 bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-emerald-100/15 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200"
          >
            确认全局置顶
          </button>
        </footer>
      </section>
    </div>
  );
}

function MoveThreadDialog({
  currentBoardBid,
  onCancel,
  onNext,
  thread,
}: {
  currentBoardBid: number | null | undefined;
  onCancel: () => void;
  onNext: (targetBoard: LegacyBoardOption) => void;
  thread: ManagedBoardThread;
}) {
  const boardOptions = useMemo(
    () => legacyForumBoards.filter((board) => !board.hidden && board.bid !== currentBoardBid),
    [currentBoardBid],
  );
  const [selectedBid, setSelectedBid] = useState(() => String(boardOptions[0]?.bid ?? ''));
  const targetBoard = boardOptions.find((board) => String(board.bid) === selectedBid) ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-thread-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-3 dark:bg-black/80"
      onClick={onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),30rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-[#385772] dark:bg-sky-300/15 dark:text-sky-100">
            <MoveRight size={17} />
          </span>
          <h2 id="move-thread-dialog-title" className="text-base font-semibold">
            移动板块
          </h2>
        </header>
        <div className="space-y-4 px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            选择《{thread.title}》要移动到的目标板块。
          </p>
          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200" htmlFor="move-thread-target-board">
            目标板块
          </label>
          <select
            id="move-thread-target-board"
            value={selectedBid}
            onChange={(event) => setSelectedBid(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-emerald-200 dark:focus:ring-emerald-200/20"
          >
            {boardOptions.map((board) => (
              <option key={board.bid} value={board.bid}>
                {board.name}
              </option>
            ))}
          </select>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!targetBoard}
            onClick={() => {
              if (targetBoard) {
                onNext(targetBoard);
              }
            }}
            className="inline-flex h-9 items-center rounded-md border border-[#385772]/30 bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-100/15 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200"
          >
            下一步
          </button>
        </footer>
      </section>
    </div>
  );
}

function MoveThreadConfirmDialog({
  isPending,
  onBack,
  onCancel,
  onConfirm,
  sourceBoard,
  targetBoard,
  thread,
}: {
  isPending: boolean;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  sourceBoard: LegacyBoardOption | null;
  targetBoard: LegacyBoardOption;
  thread: ManagedBoardThread;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-thread-confirm-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-3 dark:bg-black/80"
      onClick={isPending ? undefined : onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),30rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-[#385772] dark:bg-sky-300/15 dark:text-sky-100">
            <MoveRight size={17} />
          </span>
          <h2 id="move-thread-confirm-dialog-title" className="text-base font-semibold">
            确认移动板块
          </h2>
        </header>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            确认将《{thread.title}》从「{sourceBoard?.name ?? '当前板块'}」移动到「{targetBoard.name}」吗？移动后主题编号会改变。
          </p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            disabled={isPending}
            onClick={onBack}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            返回选择
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-md border border-[#385772]/30 bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-wait disabled:opacity-60 dark:border-emerald-100/15 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200"
          >
            确认移动
          </button>
        </footer>
      </section>
    </div>
  );
}

function BoardFilterPanel({
  canFilterActivity,
  displayStats,
  onlyActivity,
  onlyDigest,
  sortMode,
  onChangeOnlyActivity,
  onChangeOnlyDigest,
  onChangeSortMode,
}: {
  canFilterActivity: boolean;
  displayStats: {
    displayedCount: number;
    matchedCount: number;
  };
  onlyActivity: boolean;
  onlyDigest: boolean;
  sortMode: BoardSort;
  onChangeOnlyActivity: (checked: boolean) => void;
  onChangeOnlyDigest: (checked: boolean) => void;
  onChangeSortMode: (sort: BoardSort) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeFilterCount = [
    onlyDigest,
    canFilterActivity && onlyActivity,
    sortMode !== 'lastReply',
  ].filter(Boolean).length;
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#385772] dark:text-white">筛选器</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full border border-[#875A41]/20 px-2 py-0.5 text-xs font-semibold text-[#875A41] dark:border-white/10 dark:text-zinc-200">
                {activeFilterCount} 项
              </span>
            )}
          </span>
          <span className="mt-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            显示 {displayStats.displayedCount} / {displayStats.matchedCount} 个主题
          </span>
        </span>
        <ChevronIcon size={17} className="shrink-0 text-[#385772] dark:text-white" />
      </button>

      {isExpanded && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
          <div className="grid gap-2">
            <FilterCheckbox
              checked={onlyDigest}
              label="只看精华"
              onChange={onChangeOnlyDigest}
            />
            {canFilterActivity ? (
              <FilterCheckbox
                checked={onlyActivity}
                label="只看活动"
                onChange={onChangeOnlyActivity}
              />
            ) : null}
          </div>

          <label className="mt-3 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            排序
            <select
              value={sortMode}
              onChange={(event) => onChangeSortMode(event.target.value as BoardSort)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

        </div>
      )}
    </section>
  );
}

function FilterCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] dark:border-white/20"
      />
      <span>{label}</span>
    </label>
  );
}

function BoardHeader({
  board,
  canManageBoard,
  canPostThread,
  isManaging,
  onToggleManage,
}: {
  board: BoardDetail;
  canManageBoard: boolean;
  canPostThread: boolean;
  isManaging: boolean;
  onToggleManage: () => void;
}) {
  const boardGradientClass = getActivityGradientClass(board.name);
  const cachedBoardCoverImages = useCachedImages({
    maxLocalStorageLength: MAX_BOARD_COVER_STORAGE_LENGTH,
    namespace: 'board-cover',
    sources: board.coverImage ? [board.coverImage] : [],
  });
  const coverImage = board.coverImage ? (cachedBoardCoverImages[board.coverImage] ?? board.coverImage) : null;
  const stats = [
    { label: '主题', value: board.topics },
    { label: '回复', value: board.replies },
    { label: '今日新回复', value: board.today },
    { label: '当前在线', value: board.online },
  ];

  return (
    <section className={joinClassNames('overflow-hidden rounded-lg bg-gradient-to-r p-[1px] shadow-panel', boardGradientClass)}>
      <div className={joinClassNames('relative overflow-hidden rounded-[7px]', !coverImage && 'card-surface')}>
        {coverImage ? (
          <>
            <img
              src={coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.88)_42%,rgba(255,255,255,0.34)_100%)] dark:bg-[linear-gradient(90deg,rgba(9,9,11,0.96)_0%,rgba(9,9,11,0.82)_45%,rgba(9,9,11,0.34)_100%)]" />
            <div className={joinClassNames('pointer-events-none absolute inset-0 bg-gradient-to-r opacity-[0.18] mix-blend-multiply dark:opacity-[0.28] dark:mix-blend-screen', boardGradientClass)} />
          </>
        ) : null}
        <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:min-h-[150px] lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="min-w-0 text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">
              {board.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[#875A41] dark:text-white">
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} />
                版主：
              </span>
              <ModeratorLinks moderators={board.moderators} />
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 lg:w-auto lg:items-end">
            <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 lg:w-auto">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[3.55rem] rounded-md border border-white/35 bg-white/[0.34] px-1.5 py-1 text-center text-[#385772] shadow-sm backdrop-blur-[2px] sm:px-2 dark:border-white/15 dark:bg-white/[0.08] dark:text-white"
                >
                  <div className="whitespace-nowrap text-[0.68rem] font-bold leading-4 sm:text-xs">{stat.value}</div>
                  <div className="whitespace-nowrap text-[0.52rem] font-semibold leading-3 sm:text-[0.56rem]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            {canManageBoard || canPostThread ? (
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                {canManageBoard ? (
                  <button
                    type="button"
                    aria-pressed={isManaging}
                    aria-label={isManaging ? '退出管理状态' : '管理版面'}
                    title={isManaging ? '退出管理状态' : '管理版面'}
                    onClick={onToggleManage}
                    className={joinClassNames(
                      'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto lg:min-w-32 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950',
                      isManaging
                        ? 'border-[#875A41]/25 bg-[#875A41] text-white hover:bg-[#714931] dark:border-amber-100/15 dark:bg-amber-200 dark:text-zinc-950 dark:hover:bg-amber-100'
                        : 'border-white/45 bg-white/[0.42] text-[#385772] hover:bg-white/[0.58] dark:border-white/15 dark:bg-white/[0.1] dark:text-white dark:hover:bg-white/[0.16]',
                    )}
                  >
                    <Settings size={18} />
                    <span>{isManaging ? '退出管理状态' : '管理版面'}</span>
                  </button>
                ) : null}
                {canPostThread ? (
                  <Link
                    to={board.postHref}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto lg:min-w-28 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
                  >
                    <PenLine size={17} />
                    发帖
                  </Link>
                ) : null}
              </div>
            ) : null}
            {!canPostThread && board.requiredStar && board.requiredStar > 0 ? (
              <p className="max-w-full text-right text-xs font-semibold text-[#875A41] dark:text-white/70">
                {getBoardStarRequirementMessage(board.requiredStar)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeratorLinks({ moderators }: { moderators: string[] }) {
  if (moderators.length === 0) {
    return <span className="font-semibold text-zinc-500 dark:text-white/55">暂无版务</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {moderators.map((moderator, index) => (
        <span key={moderator} className="inline-flex items-center gap-x-2">
          {index > 0 ? <span className="text-zinc-400 dark:text-white/35">·</span> : null}
          <Link
            to={getModeratorProfilePath(moderator)}
            className="rounded-sm font-semibold outline-none transition hover:text-zinc-950 hover:underline focus-visible:ring-2 focus-visible:ring-[#875A41] dark:hover:text-white"
          >
            {moderator}
          </Link>
        </span>
      ))}
    </span>
  );
}

function getModeratorProfilePath(moderator: string) {
  return getPublicProfilePath(moderator);
}

function BoardThreadCard({
  canGlobalPin,
  canMoveThread,
  compact,
  isModerationPending,
  isMovePending,
  isManaging,
  onModerationChange,
  onMoveThread,
  thread,
}: {
  canGlobalPin: boolean;
  canMoveThread: boolean;
  compact?: boolean;
  isModerationPending: (threadId: string, key: ThreadModerationKey) => boolean;
  isMovePending: (threadId: string) => boolean;
  isManaging: boolean;
  onModerationChange: (threadId: string, key: ThreadModerationKey, value: boolean) => void;
  onMoveThread: (thread: ManagedBoardThread) => void;
  thread: ManagedBoardThread;
}) {
  const navigate = useNavigate();
  const isDigestThread = thread.digest || thread.kind === 'digest';
  const isActivityThread = thread.kind === 'activity';
  const hasBadges = thread.deleted || thread.globalPinned || thread.pinned || isDigestThread || isActivityThread;
  const threadPath = getThreadPathFromHref(thread.href);
  const showPrimaryManagementActions = isManaging && (canGlobalPin || canMoveThread);

  const handleCardNavigation = () => {
    if (thread.deleted) {
      return;
    }

    navigate(threadPath);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardNavigation();
    }
  };

  if (compact) {
    return (
      <article
        role="link"
        tabIndex={0}
        onClick={handleCardNavigation}
        onKeyDown={handleCardKeyDown}
        className={joinClassNames(
          'card-surface group rounded-lg border border-zinc-200 p-4 shadow-panel outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800',
          thread.deleted
            ? 'cursor-default opacity-60'
            : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-white/[0.96] hover:shadow-lg dark:hover:border-emerald-200/25 dark:hover:bg-zinc-900/[0.96]',
        )}
      >
        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <h2 className="capubbs-title-wrap flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white sm:text-lg">
            {hasBadges ? (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {thread.deleted ? <ThreadBadge label="已删除" tone="rose" /> : null}
                {thread.globalPinned ? <ThreadBadge label="全局置顶" tone="amber" /> : null}
                {thread.pinned ? <ThreadBadge label="置顶" tone="amber" /> : null}
                {isDigestThread ? <ThreadBadge label="精华" tone="emerald" /> : null}
                {isActivityThread ? <ThreadBadge label="活动" tone="sky" /> : null}
              </span>
            ) : null}
            {thread.deleted ? (
              <span className="capubbs-title-wrap min-w-0 rounded-sm text-zinc-500 line-through dark:text-zinc-400">
                {thread.title}
              </span>
            ) : (
              <Link
                to={threadPath}
                onClick={(event) => event.stopPropagation()}
                className="capubbs-title-wrap min-w-0 rounded-sm transition group-hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
              >
                {thread.title}
              </Link>
            )}
            {thread.locked ? (
              <Lock
                aria-label="已锁定"
                className="shrink-0 text-zinc-500 dark:text-zinc-300"
                size={16}
              />
            ) : null}
          </h2>
          {showPrimaryManagementActions ? (
            <ThreadPrimaryManagementActions
              canGlobalPin={canGlobalPin}
              canMoveThread={canMoveThread}
              isGlobalPinPending={isModerationPending(thread.id, 'globalPinned')}
              isMovePending={isMovePending(thread.id)}
              thread={thread}
              onGlobalPinChange={onModerationChange}
              onMoveThread={onMoveThread}
            />
          ) : null}
          <p className="text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white/75">
            <span>{thread.author}/{thread.lastReplyBy}</span>
            <span> · {formatPostTimestamp(thread.lastReplyAt)}</span>
          </p>
          {isManaging ? (
            <div className="justify-self-start sm:justify-self-end">
              <ThreadModerationActions
                isModerationPending={isModerationPending}
                thread={thread}
                onChange={onModerationChange}
              />
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardNavigation}
      onKeyDown={handleCardKeyDown}
      className={joinClassNames(
        'card-surface group rounded-lg border border-zinc-200 p-4 shadow-panel outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800',
        thread.deleted
          ? 'cursor-default opacity-60'
          : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-white/[0.96] hover:shadow-lg dark:hover:border-emerald-200/25 dark:hover:bg-zinc-900/[0.96]',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <h2 className="capubbs-title-wrap flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white sm:text-lg">
            {hasBadges ? (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {thread.deleted ? <ThreadBadge label="已删除" tone="rose" /> : null}
                {thread.globalPinned ? <ThreadBadge label="全局置顶" tone="amber" /> : null}
                {thread.pinned ? <ThreadBadge label="置顶" tone="amber" /> : null}
                {isDigestThread ? <ThreadBadge label="精华" tone="emerald" /> : null}
                {isActivityThread ? <ThreadBadge label="活动" tone="sky" /> : null}
              </span>
            ) : null}
            {thread.deleted ? (
              <span className="capubbs-title-wrap min-w-0 rounded-sm text-zinc-500 line-through dark:text-zinc-400">
                {thread.title}
              </span>
            ) : (
              <Link
                to={threadPath}
                onClick={(event) => event.stopPropagation()}
                className="capubbs-title-wrap min-w-0 rounded-sm transition group-hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
              >
                {thread.title}
              </Link>
            )}
            {thread.locked ? (
              <Lock
                aria-label="已锁定"
                className="shrink-0 text-zinc-500 dark:text-zinc-300"
                size={16}
              />
            ) : null}
          </h2>
        </div>
        {showPrimaryManagementActions ? (
          <ThreadPrimaryManagementActions
            canGlobalPin={canGlobalPin}
            canMoveThread={canMoveThread}
            isGlobalPinPending={isModerationPending(thread.id, 'globalPinned')}
            isMovePending={isMovePending(thread.id)}
            thread={thread}
            onGlobalPinChange={onModerationChange}
            onMoveThread={onMoveThread}
          />
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white sm:grid-cols-2">
        <div>
          <Link
            to={thread.authorHref}
            onClick={(event) => event.stopPropagation()}
            className="rounded-sm font-medium outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#875A41]"
          >
            {thread.author}
          </Link>
          <span> · {formatPostTimestamp(thread.createdAt)}</span>
        </div>
        <div className="text-zinc-950 sm:text-right dark:text-white">
          最后回复：
          <Link
            to={getPublicProfilePath(thread.lastReplyBy)}
            onClick={(event) => event.stopPropagation()}
            className="rounded-sm font-medium outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#875A41]"
          >
            {thread.lastReplyBy}
          </Link>
          <span> · {formatPostTimestamp(thread.lastReplyAt)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
          <Metric icon={<MessageCircle size={16} />} label={thread.replies} />
          <Metric icon={<Eye size={16} />} label={thread.views} />
        </div>
        {isManaging ? (
          <ThreadModerationActions
            isModerationPending={isModerationPending}
            thread={thread}
            onChange={onModerationChange}
          />
        ) : null}
      </div>
    </article>
  );
}

function ThreadPrimaryManagementActions({
  canGlobalPin,
  canMoveThread,
  isGlobalPinPending,
  isMovePending,
  onGlobalPinChange,
  onMoveThread,
  thread,
}: {
  canGlobalPin: boolean;
  canMoveThread: boolean;
  isGlobalPinPending: boolean;
  isMovePending: boolean;
  onGlobalPinChange: (threadId: string, key: ThreadModerationKey, value: boolean) => void;
  onMoveThread: (thread: ManagedBoardThread) => void;
  thread: ManagedBoardThread;
}) {
  return (
    <div className="inline-flex shrink-0 flex-wrap items-center justify-start gap-2 justify-self-start sm:justify-end sm:justify-self-end">
      {canGlobalPin ? (
        <GlobalPinActionButton
          isPending={isGlobalPinPending}
          thread={thread}
          onChange={onGlobalPinChange}
        />
      ) : null}
      {canMoveThread ? (
        <MoveThreadActionButton
          isPending={isMovePending}
          thread={thread}
          onMoveThread={onMoveThread}
        />
      ) : null}
    </div>
  );
}

function GlobalPinActionButton({
  isPending,
  onChange,
  thread,
}: {
  isPending: boolean;
  onChange: (threadId: string, key: ThreadModerationKey, value: boolean) => void;
  thread: ManagedBoardThread;
}) {
  const isActive = Boolean(thread.globalPinned);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange(thread.id, 'globalPinned', !isActive);
      }}
      className={joinClassNames(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-wait disabled:opacity-60',
        isActive
          ? 'border-[#385772]/20 bg-[#385772] text-white hover:bg-[#28465f] dark:border-emerald-100/15 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100'
          : 'border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]',
      )}
    >
      <Globe2 size={14} />
      {isActive ? '取消全局置顶' : '全局置顶'}
    </button>
  );
}

function MoveThreadActionButton({
  isPending,
  onMoveThread,
  thread,
}: {
  isPending: boolean;
  onMoveThread: (thread: ManagedBoardThread) => void;
  thread: ManagedBoardThread;
}) {
  return (
    <button
      type="button"
      disabled={isPending || thread.deleted}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMoveThread(thread);
      }}
      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white/70 px-2.5 text-xs font-bold text-[#385772] transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
    >
      <MoveRight size={14} />
      移动板块
    </button>
  );
}

function ThreadModerationActions({
  isModerationPending,
  onChange,
  thread,
}: {
  isModerationPending: (threadId: string, key: ThreadModerationKey) => boolean;
  onChange: (threadId: string, key: ThreadModerationKey, value: boolean) => void;
  thread: ManagedBoardThread;
}) {
  const actions: Array<{
    active: boolean;
    activeLabel: string;
    icon: ReactNode;
    inactiveLabel: string;
    key: Exclude<ThreadModerationKey, 'globalPinned'>;
    tone: 'danger' | 'default';
  }> = [
    {
      active: Boolean(thread.pinned),
      activeLabel: '取消置顶',
      icon: <Pin size={14} />,
      inactiveLabel: '置顶',
      key: 'pinned',
      tone: 'default',
    },
    {
      active: Boolean(thread.digest || thread.kind === 'digest'),
      activeLabel: '取消加精',
      icon: <Sparkles size={14} />,
      inactiveLabel: '加精',
      key: 'digest',
      tone: 'default',
    },
    {
      active: Boolean(thread.locked),
      activeLabel: '取消锁定',
      icon: <Lock size={14} />,
      inactiveLabel: '锁定',
      key: 'locked',
      tone: 'default',
    },
    {
      active: Boolean(thread.deleted),
      activeLabel: '已删除',
      icon: <Trash2 size={14} />,
      inactiveLabel: '删除',
      key: 'deleted',
      tone: 'danger',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={isModerationPending(thread.id, action.key) || (action.key === 'deleted' && action.active)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange(thread.id, action.key, !action.active);
          }}
          className={joinClassNames(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-wait disabled:opacity-60',
            action.active
              ? action.tone === 'danger'
                ? 'border-rose-300/45 bg-rose-100 text-rose-800 hover:bg-rose-200 dark:border-rose-100/15 dark:bg-rose-300/15 dark:text-rose-100 dark:hover:bg-rose-300/25'
                : 'border-[#385772]/20 bg-[#385772] text-white hover:bg-[#28465f] dark:border-emerald-100/15 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100'
              : action.tone === 'danger'
                ? 'border-rose-200 bg-white/70 text-rose-700 hover:bg-rose-50 dark:border-rose-100/15 dark:bg-white/[0.06] dark:text-rose-100 dark:hover:bg-rose-300/10'
                : 'border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]',
          )}
        >
          {action.icon}
          {action.active ? action.activeLabel : action.inactiveLabel}
        </button>
      ))}
    </div>
  );
}

function ThreadBadge({
  icon,
  label,
  tone,
}: {
  icon?: ReactNode;
  label: string;
  tone: 'amber' | 'emerald' | 'rose' | 'sky' | 'zinc';
}) {
  return (
    <span
      className={joinClassNames(
        'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-bold',
        tone === 'amber' && 'border-amber-300/40 bg-amber-100/80 text-amber-900 dark:border-amber-100/15 dark:bg-amber-300/15 dark:text-amber-100',
        tone === 'emerald' && 'border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-100/15 dark:bg-emerald-300/15 dark:text-emerald-100',
        tone === 'rose' && 'border-rose-300/50 bg-rose-50 text-rose-800 dark:border-rose-100/15 dark:bg-rose-300/15 dark:text-rose-100',
        tone === 'sky' && 'border-sky-300/50 bg-sky-50 text-sky-800 dark:border-sky-100/15 dark:bg-sky-300/15 dark:text-sky-100',
        tone === 'zinc' && 'border-zinc-300/50 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/[0.08] dark:text-zinc-200',
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function EmptyBoardResult() {
  return (
    <section className="card-surface rounded-lg border border-dashed border-zinc-300 p-8 text-center shadow-panel dark:border-white/15">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
        <Sparkles size={20} />
      </div>
      <h2 className="mt-3 text-base font-semibold text-[#385772] dark:text-white">没有匹配的主题</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">换一个筛选条件再看。</p>
    </section>
  );
}

function BoardDetailSkeleton({
  compact,
  topBarCollapsed,
}: {
  compact: boolean;
  topBarCollapsed: boolean;
}) {
  return (
    <div className="space-y-4" aria-busy="true">
      <section className="overflow-hidden rounded-lg bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300 p-[1px] shadow-panel">
        <div className="card-surface rounded-[7px] p-4 sm:p-5 lg:min-h-[150px]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-3">
              <SkeletonLine className="h-8 w-40 sm:h-9 sm:w-56" />
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonLine className="h-5 w-16" />
                <SkeletonLine className="h-5 w-20" />
                <SkeletonLine className="h-5 w-24" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
              <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 lg:w-auto">
                {Array.from({ length: 4 }, (_, index) => (
                  <SkeletonLine key={index} className="h-10 min-w-[3.55rem] rounded-md sm:h-11" />
                ))}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <SkeletonLine className="h-11 w-full rounded-lg sm:w-32" />
                <SkeletonLine className="h-11 w-full rounded-lg sm:w-28" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-4">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <SkeletonLine className="h-9 w-32 rounded-lg" />
            <SkeletonLine className="h-9 w-36 rounded-lg" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: BOARD_PAGE_SIZE }, (_, index) => (
              <BoardThreadCardSkeleton key={index} compact={compact} />
            ))}
          </div>
          <SkeletonLine className="h-11 w-full rounded-lg" />
        </section>

        <aside
          className="z-10 hidden self-start transition-[top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:block"
          style={{
            top: topBarCollapsed
              ? 'var(--capubbs-topbar-collapsed-sticky-offset)'
              : 'var(--capubbs-topbar-sticky-offset)',
          }}
        >
          <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <SkeletonLine className="h-5 w-20" />
                <SkeletonLine className="h-4 w-28" />
              </div>
              <SkeletonLine className="h-5 w-5 rounded-md" />
            </div>
            <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-white/10">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonLine key={index} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BoardThreadCardSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <section className="card-surface flex h-[4.5rem] flex-col justify-center overflow-hidden rounded-lg border border-zinc-200 p-3 shadow-panel dark:border-zinc-800">
        <SkeletonLine className="h-5 w-3/4" />
        <SkeletonLine className="mt-1.5 h-5 w-2/5" />
      </section>
    );
  }

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonLine className="h-5 w-56 max-w-[60vw]" />
          <SkeletonLine className="h-4 w-32" />
        </div>
        <SkeletonLine className="h-7 w-20 shrink-0" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SkeletonLine className="h-5 w-44" />
        <SkeletonLine className="h-5 w-52 sm:ml-auto" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <SkeletonLine className="h-5 w-16" />
        <SkeletonLine className="h-5 w-16" />
        <SkeletonLine className="h-5 w-20" />
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

function BoardNotFound({ boardName }: { boardName: string | null }) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
      <h1 className="text-xl font-bold text-[#385772] dark:text-white">没有找到版面</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {boardName ? `当前地址中的「${boardName}」还没有配置版面信息。` : '当前地址缺少版面名称。'}
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

function BoardLoginRequired({ boardName }: { boardName: string | null }) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const loginPath = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
      <h1 className="text-xl font-bold text-[#385772] dark:text-white">请登录后查看</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {boardName ? `「${boardName}」需要登录后才能访问。` : '当前版面需要登录后才能访问。'}
      </p>
      <Link
        to={loginPath}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        去登录
      </Link>
    </section>
  );
}

function applyThreadModerationState(
  thread: BoardThread,
  moderationState: ThreadModerationState | undefined,
): ManagedBoardThread {
  if (!moderationState) {
    return thread;
  }

  return {
    ...thread,
    deleted: moderationState.deleted ?? false,
    digest: moderationState.digest ?? thread.digest,
    globalPinned: moderationState.globalPinned ?? thread.globalPinned,
    locked: moderationState.locked ?? thread.locked,
    pinned: moderationState.pinned ?? thread.pinned,
  };
}

function getThreadModerationStateFromResponse(data: LegacyBbsThreadModerationResponse): ThreadModerationState {
  return {
    digest: data.digest,
    globalPinned: data.globalPinned,
    locked: data.locked,
    pinned: data.top,
  };
}

function parseBoardThreadTarget(threadId: string) {
  const match = threadId.match(/^(\d+)-(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    bid: Number.parseInt(match[1], 10),
    tid: Number.parseInt(match[2], 10),
  };
}

function getBoardPageFromParams(searchParams: URLSearchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getBoardSortFromParams(searchParams: URLSearchParams): BoardSort {
  const sort = searchParams.get('sort');

  return sort === 'latest' ? sort : 'lastReply';
}

function getVisibleThreads(
  threads: ManagedBoardThread[],
  sortMode: BoardSort,
  filters: {
    includeDeleted: boolean;
    onlyActivity: boolean;
    onlyDigest: boolean;
  },
) {
  const filteredThreads = threads.filter((thread) => {
    const matchesDigest = !filters.onlyDigest || thread.digest || thread.kind === 'digest';
    const matchesActivity = !filters.onlyActivity || thread.kind === 'activity';
    const matchesDeletedState = filters.includeDeleted || !thread.deleted;

    return matchesDigest && matchesActivity && matchesDeletedState;
  });
  const sortedThreads = sortBoardThreads(filteredThreads, sortMode);

  return {
    threads: sortedThreads,
    matchedCount: filteredThreads.length,
  };
}

function sortBoardThreads(threads: ManagedBoardThread[], sortMode: BoardSort) {
  return [...threads].sort((left, right) => {
    if (left.globalPinned !== right.globalPinned) {
      return left.globalPinned ? -1 : 1;
    }

    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    const leftTime = Date.parse(sortMode === 'latest' ? left.createdAt : left.lastReplyAt);
    const rightTime = Date.parse(sortMode === 'latest' ? right.createdAt : right.lastReplyAt);

    return rightTime - leftTime;
  });
}

function getKindLabel(kind: BoardThreadKind) {
  if (kind === 'activity') {
    return '活动';
  }

  if (kind === 'digest') {
    return '精华';
  }

  return '讨论';
}
