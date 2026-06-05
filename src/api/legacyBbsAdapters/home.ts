import type { ActivityBanner, CalendarEvent, HotThread, ReplyItem, TopicItem } from '../../types/forum';
import { getBoardPath } from '../../utils/boardRoutes';
import { getThreadFloorPath, getThreadPath } from '../../utils/threadRoutes';
import { getPublicProfilePath } from '../../utils/userRoutes';
import { formatUserStarRating } from '../../utils/userStarCache';
import type {
  LegacyBbsActivityBanner,
  LegacyBbsBootstrapResponse,
  LegacyBbsCalendarEvent,
  LegacyBbsHomeFeedsResponse,
  LegacyBbsThreadItem,
} from '../legacyBbsClient';
import {
  formatMonthDayTime,
  getBoardName,
  getLegacyThreadHref,
  getLegacyThreadId,
  getThreadBoardName,
  normalizeAssetUrl,
  padDatePart,
} from './shared';
import type { LegacyBbsHomeData, LegacyBbsHomeFeedsData, LegacyBbsThreadPreview } from './types';

export function adaptLegacyBbsHome(data: LegacyBbsBootstrapResponse): LegacyBbsHomeData {
  const feeds = adaptLegacyBbsHomeFeedItems({
    hotThreads: data.home.hotThreads,
    latestReplies: data.home.latestReplies,
    latestTopics: data.home.latestTopics,
  });
  const threadPreviews = uniqueThreadPreviews([
    ...data.home.hotThreads,
    ...data.home.latestTopics,
    ...data.home.latestReplies,
    ...data.home.globalPinnedThreads,
  ]);

  return {
    activities: data.home.activityBanners.map(adaptActivityBanner),
    calendarEvents: data.home.calendarEvents.map(adaptCalendarEvent),
    hotThreads: feeds.hotThreads,
    latestReplies: feeds.latestReplies,
    latestTopics: feeds.latestTopics,
    pinnedThreads: data.home.globalPinnedThreads.map((thread) => ({
      href: getThreadPath(getLegacyThreadId(thread)),
      id: getLegacyThreadId(thread),
      title: thread.title,
    })),
    threadPreviews,
  };
}

export function adaptLegacyBbsHomeFeeds(data: LegacyBbsHomeFeedsResponse): LegacyBbsHomeFeedsData {
  return adaptLegacyBbsHomeFeedItems({
    hotThreads: data.hotThreads.items,
    latestReplies: data.latestReplies.items,
    latestTopics: data.latestTopics.items,
  });
}

function adaptLegacyBbsHomeFeedItems({
  hotThreads,
  latestReplies,
  latestTopics,
}: {
  hotThreads: LegacyBbsThreadItem[];
  latestReplies: LegacyBbsThreadItem[];
  latestTopics: LegacyBbsThreadItem[];
}): LegacyBbsHomeFeedsData {
  const replyThreads =
    latestReplies.length > 0 ? latestReplies : hotThreads.filter((thread) => thread.replyer.trim().length > 0);
  const previewThreads = [...hotThreads, ...latestTopics, ...replyThreads];

  return {
    hotThreads: hotThreads.map(adaptHotThread),
    latestReplies: replyThreads.map(adaptReplyItem),
    latestTopics: latestTopics.map(adaptTopicItem),
    threadPreviews: uniqueThreadPreviews(previewThreads),
  };
}

function adaptActivityBanner(activity: LegacyBbsActivityBanner): ActivityBanner {
  const board = getBoardName(activity.board);

  return {
    title: activity.title,
    board,
    deadline: activity.closesAt ? formatMonthDayTime(activity.closesAt) : '-',
    joined: activity.joined,
    href: `#thread-${activity.bid}-${activity.tid}`,
    coverImage: normalizeAssetUrl(activity.coverImage),
  };
}

function adaptHotThread(thread: LegacyBbsThreadItem): HotThread {
  const board = getThreadBoardName(thread);
  const author = thread.author || '匿名用户';
  const lastReplyBy = thread.replyer || author;
  const lastReplyAt = thread.updatedAt || thread.postDate;

  return {
    title: thread.title,
    board,
    author,
    authorRating: formatUserStarRating(thread.authorStar),
    lastReplyBy,
    lastReplyAt,
    time: lastReplyAt,
    replies: thread.replies,
    views: thread.views,
    bookmarks: thread.favorites,
    href: getLegacyThreadHref(thread),
    boardHref: getBoardPath(board),
    authorHref: getPublicProfilePath(author),
  };
}

function adaptReplyItem(thread: LegacyBbsThreadItem): ReplyItem {
  const board = getThreadBoardName(thread);
  const replyer = thread.replyer || thread.author || '匿名用户';

  return {
    id: replyer,
    rating: formatUserStarRating(thread.replyerStar),
    board,
    topic: thread.title,
    time: thread.updatedAt || thread.postDate,
    href: getLatestReplyThreadHref(thread),
    boardHref: getBoardPath(board),
    authorHref: getPublicProfilePath(replyer),
  };
}

function adaptTopicItem(thread: LegacyBbsThreadItem): TopicItem {
  const board = getThreadBoardName(thread);
  const author = thread.author || '匿名用户';

  return {
    id: author,
    rating: formatUserStarRating(thread.authorStar),
    board,
    topic: thread.title,
    time: thread.postDate || thread.updatedAt || '',
    bookmarks: thread.favorites,
    href: getLegacyThreadHref(thread),
    boardHref: getBoardPath(board),
    authorHref: getPublicProfilePath(author),
  };
}

function adaptCalendarEvent(event: LegacyBbsCalendarEvent): CalendarEvent {
  return {
    date: `${event.year}-${padDatePart(event.month)}-${padDatePart(event.day)}`,
    title: event.title,
    time: event.time,
    place: event.content,
  };
}

function getLatestReplyThreadHref(thread: LegacyBbsThreadItem) {
  const latestFloorNumber = Math.max(1, thread.replies + 1);

  return getThreadFloorPath(getLegacyThreadId(thread), latestFloorNumber);
}

function uniqueThreadPreviews(threads: LegacyBbsThreadItem[]) {
  const seen = new Set<string>();
  const previews: LegacyBbsThreadPreview[] = [];

  threads.forEach((thread) => {
    const id = getLegacyThreadId(thread);

    if (seen.has(id)) {
      return;
    }

    seen.add(id);
    previews.push({
      id,
      board: getThreadBoardName(thread),
      title: thread.title,
    });
  });

  return previews;
}
