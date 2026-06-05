import { Link, useNavigate } from 'react-router-dom';
import type { TopicItem } from '../../types/forum';
import { getBoardPath } from '../../utils/boardRoutes';
import { formatPostTimestamp } from '../../utils/formatPostTimestamp';
import { getThreadPathFromHref } from '../../utils/threadRoutes';
import {
  compactFeedCardClassName,
  compactFeedMetaClassName,
  compactFeedMetaSeparatorClassName,
  compactFeedProfileLinkClassName,
  compactFeedTimeClassName,
  compactFeedTitleClassName,
} from './compactFeedCardStyles';
import { UserBlock } from './UserBlock';

type TopicCardProps = {
  compact?: boolean;
  topic: TopicItem;
};

export function TopicCard({ compact = false, topic }: TopicCardProps) {
  const navigate = useNavigate();
  const threadPath = getThreadPathFromHref(topic.href);
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
            {topic.topic}
          </Link>
        </h2>
        <p className={compactFeedMetaClassName}>
          <Link
            to={topic.authorHref}
            onClick={(event) => event.stopPropagation()}
            className={compactFeedProfileLinkClassName}
          >
            {topic.id}
          </Link>
          <span className={compactFeedMetaSeparatorClassName}>·</span>
          <span className={compactFeedTimeClassName}>{formatPostTimestamp(topic.time)}</span>
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
        <UserBlock id={topic.id} rating={topic.rating} href={topic.authorHref} />
        <Link
          to={getBoardPath(topic.board)}
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 outline-none transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 dark:bg-emerald-950 dark:text-white dark:hover:bg-emerald-900"
        >
          {topic.board}
        </Link>
      </div>
      <h2 className="capubbs-title-wrap mt-4 text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
        <Link
          to={threadPath}
          onClick={(event) => event.stopPropagation()}
          className="capubbs-title-wrap rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#385772]"
        >
          {topic.topic}
        </Link>
      </h2>
      <div className="mt-4 flex items-center gap-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <span>发布时间：{formatPostTimestamp(topic.time)}</span>
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
