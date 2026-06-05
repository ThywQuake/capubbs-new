import { Bookmark, Eye, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLegacyUserStarRating } from '../../hooks/useLegacyUserStarRating';
import type { HotThread } from '../../types/forum';
import { getBoardPath } from '../../utils/boardRoutes';
import { formatPostTimestamp } from '../../utils/formatPostTimestamp';
import { getThreadPathFromHref } from '../../utils/threadRoutes';
import { getPublicProfilePath } from '../../utils/userRoutes';
import {
  compactFeedCardClassName,
  compactFeedMetaClassName,
  compactFeedMetaSeparatorClassName,
  compactFeedProfileLinkClassName,
  compactFeedTimeClassName,
  compactFeedTitleClassName,
} from './compactFeedCardStyles';
import { Metric, ToggleMetric } from './Metric';

type HotThreadCardProps = {
  compact?: boolean;
  thread: HotThread;
};

export function HotThreadCard({ compact = false, thread }: HotThreadCardProps) {
  const navigate = useNavigate();
  const threadPath = getThreadPathFromHref(thread.href);
  const openThread = () => {
    navigate(threadPath);
  };

  if (compact) {
    return (
      <article
        role="link"
        tabIndex={0}
        onClick={openThread}
        onKeyDown={(event) => {
          if ((event.target as HTMLElement).closest('a,button')) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openThread();
          }
        }}
        className={compactFeedCardClassName}
      >
        <h2 className={compactFeedTitleClassName}>
          <Link
            to={threadPath}
            onClick={(event) => event.stopPropagation()}
            className="capubbs-title-wrap rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#385772]"
          >
            {thread.title}
          </Link>
        </h2>
        <p className={compactFeedMetaClassName}>
          <Link
            to={thread.authorHref}
            onClick={(event) => event.stopPropagation()}
            className={compactFeedProfileLinkClassName}
          >
            {thread.author}
          </Link>
          <span className={compactFeedMetaSeparatorClassName}>/</span>
          <Link
            to={getPublicProfilePath(thread.lastReplyBy)}
            onClick={(event) => event.stopPropagation()}
            className={compactFeedProfileLinkClassName}
          >
            {thread.lastReplyBy}
          </Link>
          <span className={compactFeedMetaSeparatorClassName}>·</span>
          <span className={compactFeedTimeClassName}>{formatPostTimestamp(thread.lastReplyAt)}</span>
        </p>
      </article>
    );
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openThread}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest('a,button')) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openThread();
        }
      }}
      className="card-surface cursor-pointer rounded-lg border border-zinc-200 p-4 shadow-panel outline-none transition duration-200 hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-white/[0.96] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800 dark:hover:border-emerald-200/25 dark:hover:bg-zinc-900/[0.96]"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="capubbs-title-wrap min-w-0 text-lg font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
          <Link
            to={threadPath}
            onClick={(event) => event.stopPropagation()}
            className="capubbs-title-wrap rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#385772]"
          >
            {thread.title}
          </Link>
        </h2>
        <Link
          to={getBoardPath(thread.board)}
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 outline-none transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 dark:bg-emerald-950 dark:text-white dark:hover:bg-emerald-900"
        >
          {thread.board}
        </Link>
      </div>
      <HotThreadAuthorMeta thread={thread} />
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#875A41] dark:text-white">
        <Metric icon={<MessageCircle size={16} />} label={thread.replies} />
        <Metric icon={<Eye size={16} />} label={thread.views} />
        <ToggleMetric
          icon={<Bookmark size={16} />}
          label={thread.bookmarks}
          activeLabel="取消收藏"
          inactiveLabel="收藏"
        />
        <Link
          to={threadPath}
          onClick={(event) => event.stopPropagation()}
          className="ml-auto rounded-sm font-semibold text-teal-700 outline-none hover:text-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white"
        >
          &gt;&gt;
        </Link>
      </div>
    </article>
  );
}

function HotThreadAuthorMeta({ thread }: { thread: HotThread }) {
  const authorRating = useLegacyUserStarRating({
    fallbackRating: thread.authorRating ?? '',
    username: thread.author,
  });
  const filledRating = authorRating.replace(/☆/g, '').trim();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
      <Link
        to={thread.authorHref}
        onClick={(event) => event.stopPropagation()}
        className="rounded-sm font-medium outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#875A41]"
      >
        {thread.author}
      </Link>
      {filledRating ? <span className="text-xs text-amber-500 dark:text-white">{filledRating}</span> : null}
      <span>· {formatPostTimestamp(thread.time)}</span>
    </div>
  );
}
