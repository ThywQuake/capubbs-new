import type { LegacyBbsThreadItem } from './legacyBbsClient';

export const HOME_FEED_CANDIDATE_BATCH_SIZE = 100;
export const HOME_FEED_MAX_ITEMS = 150;

const HOT_FEED_WINDOW_DAYS = 14;
const HOT_FEED_WINDOW_MS = HOT_FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000;

type ScoredThread = {
  score: number;
  thread: LegacyBbsThreadItem;
  updatedAtMs: number;
};

export function rankHomeHotThreads(threads: LegacyBbsThreadItem[], now = Date.now()) {
  const scoredThreads = uniqueHomeThreads(threads).map((thread) => scoreHomeHotThread(thread, now));
  const freshThreads = scoredThreads.filter((item) => now - item.updatedAtMs <= HOT_FEED_WINDOW_MS);
  const rankedThreads = freshThreads.length > 0 ? freshThreads : scoredThreads;

  return rankedThreads
    .sort((left, right) => right.score - left.score || right.updatedAtMs - left.updatedAtMs || right.thread.tid - left.thread.tid)
    .map((item) => item.thread)
    .slice(0, HOME_FEED_MAX_ITEMS);
}

export function sortHomeLatestReplies(threads: LegacyBbsThreadItem[]) {
  return uniqueHomeThreads(threads)
    .filter((thread) => thread.replyer.trim().length > 0)
    .sort((left, right) => compareThreadTime(right.updatedAt, left.updatedAt) || right.tid - left.tid)
    .slice(0, HOME_FEED_MAX_ITEMS);
}

export function sortHomeLatestTopics(threads: LegacyBbsThreadItem[]) {
  return uniqueHomeThreads(threads)
    .sort((left, right) => compareThreadTime(right.postDate, left.postDate) || right.tid - left.tid)
    .slice(0, HOME_FEED_MAX_ITEMS);
}

export function uniqueHomeThreads(threads: LegacyBbsThreadItem[]) {
  const seenThreadIds = new Set<string>();
  const uniqueThreads: LegacyBbsThreadItem[] = [];

  threads.forEach((thread) => {
    const id = `${thread.bid}-${thread.tid}`;

    if (seenThreadIds.has(id)) {
      return;
    }

    seenThreadIds.add(id);
    uniqueThreads.push(thread);
  });

  return uniqueThreads;
}

function scoreHomeHotThread(thread: LegacyBbsThreadItem, now: number): ScoredThread {
  const updatedAtMs = parseThreadTime(thread.updatedAt) ?? parseThreadTime(thread.postDate) ?? now;
  const ageHours = Math.max(1, (now - updatedAtMs) / (60 * 60 * 1000));
  const digestBonus = thread.digest ? 8 : 0;
  const activityBonus = thread.isActivity ? 2 : 0;
  const engagement = thread.replies * 5 + Math.log1p(thread.views) * 2 + thread.favorites * 2 + digestBonus + activityBonus;

  return {
    score: engagement / Math.pow(ageHours + 2, 1.15),
    thread,
    updatedAtMs,
  };
}

function compareThreadTime(rightValue: string | null, leftValue: string | null) {
  const rightTime = parseThreadTime(rightValue) ?? 0;
  const leftTime = parseThreadTime(leftValue) ?? 0;

  return rightTime - leftTime;
}

function parseThreadTime(value: string | null) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value.replace(' ', 'T'));

  return Number.isFinite(time) ? time : null;
}
