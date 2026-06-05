import type { ActivityBanner, CalendarEvent, HotThread, ReplyItem, TopicItem } from '../../types/forum';

export type LegacyBbsPinnedThreadItem = {
  href: string;
  id: string;
  title: string;
};

export type LegacyBbsThreadPreview = {
  board: string;
  id: string;
  title: string;
};

export type LegacyBbsHomeData = {
  activities: ActivityBanner[];
  calendarEvents: CalendarEvent[];
  hotThreads: HotThread[];
  latestReplies: ReplyItem[];
  latestTopics: TopicItem[];
  pinnedThreads: LegacyBbsPinnedThreadItem[];
  threadPreviews: LegacyBbsThreadPreview[];
};

export type LegacyBbsHomeFeedsData = Pick<
  LegacyBbsHomeData,
  'hotThreads' | 'latestReplies' | 'latestTopics' | 'threadPreviews'
>;
