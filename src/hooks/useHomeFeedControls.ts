import { useState } from 'react';
import type { FeedTab } from '../types/forum';
import type { ListPageSize } from '../types/listDisplay';
import { DEFAULT_LIST_PAGE_SIZE } from '../types/listDisplay';

const FEED_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export function useHomeFeedControls() {
  const [activeTab, setActiveTab] = useState<FeedTab>('replies');
  const [homeFeedPageSize, setHomeFeedPageSize] = useState<ListPageSize>(FEED_PAGE_SIZE);
  const [feedItemCounts, setFeedItemCounts] = useState<Record<FeedTab, number>>({
    hot: FEED_PAGE_SIZE,
    replies: FEED_PAGE_SIZE,
    topics: FEED_PAGE_SIZE,
  });

  const resetFeedItems = () =>
    setFeedItemCounts({
      hot: homeFeedPageSize,
      replies: homeFeedPageSize,
      topics: homeFeedPageSize,
    });

  const loadMoreFeedItems = () => {
    setFeedItemCounts((counts) => ({
      ...counts,
      [activeTab]: counts[activeTab] + homeFeedPageSize,
    }));
  };

  const changeHomeFeedPageSize = (pageSize: ListPageSize) => {
    setHomeFeedPageSize(pageSize);
    setFeedItemCounts({
      hot: pageSize,
      replies: pageSize,
      topics: pageSize,
    });
  };

  return {
    activeTab,
    changeHomeFeedPageSize,
    feedItemCounts,
    homeFeedPageSize,
    loadMoreFeedItems,
    resetFeedItems,
    setActiveTab,
  };
}
