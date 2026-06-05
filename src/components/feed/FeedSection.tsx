import type { FeedTab, HotThread, ReplyItem, TopicItem } from '../../types/forum';
import type { ListPageSize } from '../../types/listDisplay';
import { ListDisplayToolbar } from '../common/ListDisplayToolbar';
import { FeedTabs } from './FeedTabs';
import { HotThreadCard } from './HotThreadCard';
import { ReplyCard } from './ReplyCard';
import { TopicCard } from './TopicCard';

type FeedSectionProps = {
  activeTab: FeedTab;
  compact: boolean;
  compactLocked?: boolean;
  hotThreads: HotThread[];
  latestReplies: ReplyItem[];
  latestTopics: TopicItem[];
  onChangeTab: (tab: FeedTab) => void;
  onChangeCompact: (compact: boolean) => void;
  onChangePageSize: (pageSize: ListPageSize) => void;
  onLoadMore: () => void;
  pageSize: ListPageSize;
  repeatItems?: boolean;
  visibleCount: number;
};

export function FeedSection({
  activeTab,
  compact,
  compactLocked = false,
  hotThreads,
  latestReplies,
  latestTopics,
  onChangeTab,
  onChangeCompact,
  onChangePageSize,
  onLoadMore,
  pageSize,
  repeatItems = true,
  visibleCount,
}: FeedSectionProps) {
  const visibleHotThreads = getVisibleItems(hotThreads, visibleCount, repeatItems);
  const visibleReplies = getVisibleItems(latestReplies, visibleCount, repeatItems);
  const visibleTopics = getVisibleItems(latestTopics, visibleCount, repeatItems);
  const activeItemCount =
    activeTab === 'hot' ? hotThreads.length : activeTab === 'replies' ? latestReplies.length : latestTopics.length;
  const canLoadMore = repeatItems || visibleCount < activeItemCount;

  return (
    <section className="min-w-0 space-y-4">
      <FeedTabs activeTab={activeTab} onChange={onChangeTab} />
      <ListDisplayToolbar
        compact={compact}
        compactLocked={compactLocked}
        pageSize={pageSize}
        onCompactChange={onChangeCompact}
        onPageSizeChange={onChangePageSize}
      />
      <div className="space-y-3">
        {activeTab === 'hot'
          ? visibleHotThreads.map((thread, index) => (
              <HotThreadCard key={`${thread.href}-${index}`} compact={compact} thread={thread} />
            ))
          : null}
        {activeTab === 'replies'
          ? visibleReplies.map((reply, index) => (
              <ReplyCard key={`${reply.href}-${reply.id}-${index}`} compact={compact} reply={reply} />
            ))
          : null}
        {activeTab === 'topics'
          ? visibleTopics.map((topic, index) => (
              <TopicCard key={`${topic.href}-${topic.id}-${index}`} compact={compact} topic={topic} />
            ))
          : null}
      </div>
      {canLoadMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-white/25 bg-white/[0.38] text-sm font-semibold text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
        >
          加载更多
        </button>
      ) : null}
    </section>
  );
}

function getVisibleItems<T>(items: T[], count: number, repeatItems: boolean) {
  return repeatItems ? repeatStaticItems(items, count) : items.slice(0, count);
}

function repeatStaticItems<T>(items: T[], count: number) {
  if (items.length === 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => items[index % items.length]);
}
