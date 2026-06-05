import { GripVertical, Pin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findBoardThreadById } from '../../data/boardDetails';
import { joinClassNames } from '../../utils/classNames';
import {
  markGlobalPinnedThreadVisited,
  readGlobalPinnedThreadIds,
  readVisitedGlobalPinnedThreadHrefs,
  reorderGlobalPinnedThreadIds,
  saveGlobalPinnedThreadIds,
  subscribeGlobalPinnedThreadIds,
  subscribeVisitedGlobalPinnedThreadHrefs,
} from '../../utils/globalPinnedThreads';
import { getThreadPathFromHref } from '../../utils/threadRoutes';

type PinnedThreadItem = {
  href: string;
  id: string;
  title: string;
};

type PinnedThreadsProps = {
  canManage?: boolean;
  threads?: PinnedThreadItem[];
};

export function PinnedThreads({ canManage = true, threads }: PinnedThreadsProps) {
  const [threadIds, setThreadIds] = useState(readGlobalPinnedThreadIds);
  const [visitedThreadHrefs, setVisitedThreadHrefs] = useState(readVisitedGlobalPinnedThreadHrefs);
  const [isManaging, setIsManaging] = useState(false);
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const hasExternalThreads = threads !== undefined;
  const canManageLocalPins = canManage && !hasExternalThreads;
  const isLocalManaging = canManageLocalPins && isManaging;
  const pinnedThreads = useMemo(() => threads ?? getPinnedThreadItems(threadIds), [threads, threadIds]);

  useEffect(() => {
    if (!canManageLocalPins) {
      setIsManaging(false);
      setDraggingThreadId(null);
    }
  }, [canManageLocalPins]);

  useEffect(
    () =>
      subscribeGlobalPinnedThreadIds(() => {
        setThreadIds(readGlobalPinnedThreadIds());
      }),
    [],
  );

  useEffect(
    () =>
      subscribeVisitedGlobalPinnedThreadHrefs(() => {
        setVisitedThreadHrefs(readVisitedGlobalPinnedThreadHrefs());
      }),
    [],
  );

  const updateThreadIds = (nextThreadIds: string[]) => {
    setThreadIds(saveGlobalPinnedThreadIds(nextThreadIds));
  };

  const handlePinnedDragOver = (targetThreadId: string) => {
    const fromIndex = threadIds.findIndex((threadId) => threadId === draggingThreadId);
    const targetIndex = threadIds.findIndex((threadId) => threadId === targetThreadId);

    if (fromIndex >= 0 && targetIndex >= 0 && targetThreadId !== draggingThreadId) {
      updateThreadIds(reorderGlobalPinnedThreadIds(threadIds, fromIndex, targetIndex));
    }
  };

  const handlePinnedDrop = () => {
    setDraggingThreadId(null);
  };

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
          <Pin size={15} className="text-emerald-700/80 dark:text-emerald-200/80" />
          <span>全局置顶</span>
        </h2>
        {canManageLocalPins ? (
          <button
            type="button"
            aria-pressed={isManaging}
            onClick={() => {
              setIsManaging((value) => !value);
              setDraggingThreadId(null);
            }}
            className={joinClassNames(
              'inline-flex h-8 shrink-0 items-center rounded-md border px-2.5 text-xs font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
              isManaging
                ? 'border-[#875A41]/25 bg-[#875A41] text-white hover:bg-[#714931] dark:border-amber-100/15 dark:bg-amber-200 dark:text-zinc-950 dark:hover:bg-amber-100'
                : 'border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]',
            )}
          >
            {isManaging ? '完成' : '管理'}
          </button>
        ) : null}
      </div>
      {isLocalManaging ? (
        <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">拖动左侧把手调整展示顺序。</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {pinnedThreads.map((thread) => {
          const threadPath = getThreadPathFromHref(thread.href);
          const isUnvisited = !visitedThreadHrefs.has(threadPath);

          return (
            <li
              key={thread.id}
              data-global-pinned-thread-card="true"
              onDragOver={(event) => {
                if (!isLocalManaging) {
                  return;
                }

                event.preventDefault();
                handlePinnedDragOver(thread.id);
              }}
              onDrop={handlePinnedDrop}
              className={joinClassNames(
                'card-option flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-zinc-600 transition dark:text-zinc-300',
                isLocalManaging && 'border border-zinc-200 bg-white/45 dark:border-white/10 dark:bg-white/[0.04]',
                draggingThreadId === thread.id && 'border-[#385772]/50 bg-[#385772]/5 opacity-75 dark:border-emerald-100/40 dark:bg-emerald-200/10',
              )}
            >
              {isLocalManaging ? (
                <button
                  type="button"
                  draggable
                  aria-label={`拖动「${thread.title}」调整顺序`}
                  title="拖动调整顺序"
                  onDragStart={(event) => {
                    const card = event.currentTarget.closest('[data-global-pinned-thread-card="true"]');

                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', thread.id);
                    if (card instanceof HTMLElement) {
                      event.dataTransfer.setDragImage(card, 16, 16);
                    }
                    setDraggingThreadId(thread.id);
                  }}
                  onDragEnd={() => setDraggingThreadId(null)}
                  className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition active:cursor-grabbing hover:bg-zinc-100 hover:text-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-white"
                >
                  <GripVertical size={16} />
                </button>
              ) : (
                <GlobalPinnedThreadMarker isNew={isUnvisited} />
              )}
              <Link
                to={threadPath}
                onClick={() => {
                  setVisitedThreadHrefs(markGlobalPinnedThreadVisited(threadPath));
                }}
                className="capubbs-title-wrap min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
              >
                {thread.title}
              </Link>
            </li>
          );
        })}
        {pinnedThreads.length === 0 ? (
          <li className="rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-white/15 dark:text-zinc-400">
            暂无全局置顶帖子
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function GlobalPinnedThreadMarker({ isNew }: { isNew: boolean }) {
  if (isNew) {
    return (
      <span className="-ml-1 inline-flex w-5 shrink-0 items-center justify-center">
        <span className="text-xs font-bold leading-none text-red-600 dark:text-red-400">[新]</span>
      </span>
    );
  }

  return (
    <span className="-ml-1 inline-flex w-5 shrink-0 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
    </span>
  );
}

function getPinnedThreadItems(threadIds: string[]) {
  return threadIds.reduce<PinnedThreadItem[]>((items, threadId) => {
    const result = findBoardThreadById(threadId);

    if (!result) {
      return items;
    }

    items.push({
      href: getThreadPathFromHref(result.thread.href),
      id: threadId,
      title: result.thread.title,
    });

    return items;
  }, []);
}
