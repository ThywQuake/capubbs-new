import { Clock3, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ActivityBanner } from '../../types/forum';
import defaultActivityCover from '../../assets/activity/activity.avif';
import defaultActivityDarkCover from '../../assets/activity/activity-dark.avif';
import { useCachedImages } from '../../hooks/useCachedImages';
import { getActivityGradientClass } from '../../utils/activityGradients';
import { joinClassNames } from '../../utils/classNames';
import { getThreadPathFromHref } from '../../utils/threadRoutes';

const MAX_LOCAL_STORAGE_COVER_LENGTH = 2_000_000;

type ActivityCarouselProps = {
  activities: ActivityBanner[];
  activeIndex: number;
  onChange: (index: number) => void;
};

export function ActivityCarousel({ activities, activeIndex, onChange }: ActivityCarouselProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const cachedCoverImages = useCachedImages({
    maxLocalStorageLength: MAX_LOCAL_STORAGE_COVER_LENGTH,
    namespace: 'activity-cover',
    sources: getUniqueActivityCoverSources(activities),
  });
  const [previewCover, setPreviewCover] = useState<{ src: string; title: string } | null>(null);
  const hasCarouselControls = activities.length > 1;
  const safeActiveIndex =
    activities.length > 0 ? ((activeIndex % activities.length) + activities.length) % activities.length : 0;
  const activeActivity = activities[safeActiveIndex];

  useEffect(() => {
    if (!hasCarouselControls || previewCover) {
      return;
    }

    const timer = window.setInterval(() => {
      onChange((safeActiveIndex + 1) % activities.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [activities.length, hasCarouselControls, onChange, previewCover, safeActiveIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  if (!activeActivity) {
    return <ActivityPlaceholderCard />;
  }

  const goToPrevious = () => {
    onChange((safeActiveIndex - 1 + activities.length) % activities.length);
  };

  const goToNext = () => {
    onChange((safeActiveIndex + 1) % activities.length);
  };

  return (
    <>
      <section
        className={joinClassNames(
          'overflow-hidden rounded-lg bg-gradient-to-r p-[1px] shadow-panel',
          getActivityGradientClass(activeActivity.title),
        )}
      >
        <div className="relative overflow-hidden rounded-[7px]">
          <div
            className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
          >
            {activities.map((activity) => {
              const coverSource = getActivityCoverSource(activity);
              const coverImage = cachedCoverImages[coverSource] ?? coverSource;
              const countdownText = formatDeadlineCountdown(activity.deadline, nowMs);
              const activityPath = getThreadPathFromHref(activity.href);

              return (
                <article
                  id={activity.href.startsWith('#') ? activity.href.slice(1) : undefined}
                  key={activity.title}
                  className="relative min-h-[144px] min-w-full overflow-hidden md:min-h-[110px]"
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src={coverImage}
                      alt=""
                      className="h-full w-full object-cover object-center transition duration-300 hover:scale-[1.02]"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`查看 ${activity.title} 封面`}
                    onClick={() => setPreviewCover({ src: coverImage, title: activity.title })}
                    className="absolute inset-0 hidden cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/60 md:block dark:focus-visible:ring-white/70"
                  />
                  <Link
                    to={activityPath}
                    aria-label={`打开 ${activity.title}`}
                    className="absolute inset-0 z-10 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/60 dark:focus-visible:ring-white/70"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.2)_100%)] dark:bg-[linear-gradient(90deg,rgba(0,0,0,1)_0%,rgba(0,0,0,0.2)_100%)]" />
                  <div className="pointer-events-none relative z-10 grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-14 py-3 text-zinc-950 md:px-16 dark:text-white">
                    <div className="activity-copy min-w-0 max-w-[34rem]">
                      <Link
                        to={activityPath}
                        className="pointer-events-auto inline-flex rounded-sm outline-none transition hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-zinc-950 dark:hover:text-teal-200 dark:focus-visible:ring-white"
                      >
                        <h1 className="text-xl font-semibold tracking-normal text-inherit md:text-2xl">
                          {activity.title}
                        </h1>
                      </Link>
                      <div className="activity-meta mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-700 dark:text-white/80">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={15} className="shrink-0 text-emerald-700/80 dark:text-emerald-200/80" />
                          <span>{countdownText}</span>
                        </span>
                        <span className="activity-meta-separator text-zinc-400 dark:text-white/35">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={15} className="shrink-0 text-emerald-700/80 dark:text-emerald-200/80" />
                          <span>{activity.joined}</span>
                        </span>
                      </div>
                    </div>
                    <Link
                      to={activityPath}
                      className="pointer-events-auto inline-flex h-9 shrink-0 items-center justify-center gap-2 self-center rounded-md border border-white/30 bg-white/28 px-4 text-sm font-semibold text-zinc-950 backdrop-blur-md transition hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-white/12 dark:bg-black/28 dark:text-white dark:hover:bg-black/40 dark:focus-visible:ring-white"
                    >
                      报名
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {hasCarouselControls ? (
            <>
              <button
                type="button"
                aria-label="上一活动"
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-zinc-950/70 transition hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="下一活动"
                onClick={goToNext}
                className="absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-zinc-950/70 transition hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}

          {hasCarouselControls ? (
            <div className="absolute bottom-2.5 right-14 z-20 flex items-center gap-2 md:right-16">
              {activities.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`切换到 ${item.title}`}
                  aria-pressed={index === safeActiveIndex}
                  onClick={() => onChange(index)}
                  className={joinClassNames(
                    'h-2.5 rounded-full transition',
                    index === safeActiveIndex
                      ? 'w-8 bg-zinc-950 dark:bg-white'
                      : 'w-2.5 bg-zinc-950/25 hover:bg-zinc-950/45 dark:bg-white/30 dark:hover:bg-white/50',
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <ActivityCoverPreview previewCover={previewCover} onClose={() => setPreviewCover(null)} />
    </>
  );
}

function ActivityPlaceholderCard() {
  return (
    <section className="overflow-hidden rounded-lg p-[1px] shadow-panel">
      <div className="relative overflow-hidden rounded-[7px]">
        <div className="relative min-h-[144px] min-w-full overflow-hidden md:min-h-[110px]">
          <div className="absolute inset-0 overflow-hidden">
            <img src={defaultActivityCover} alt="" className="h-full w-full object-cover object-top dark:hidden" />
            <img src={defaultActivityDarkCover} alt="" className="hidden h-full w-full object-cover object-top dark:block" />
          </div>
        </div>
      </div>
    </section>
  );
}

type ActivityCoverPreviewProps = {
  previewCover: { src: string; title: string } | null;
  onClose: () => void;
};

function ActivityCoverPreview({ previewCover, onClose }: ActivityCoverPreviewProps) {
  useEffect(() => {
    if (!previewCover) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, previewCover]);

  if (!previewCover || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${previewCover.title} 封面`}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <img
        src={previewCover.src}
        alt={`${previewCover.title} 封面`}
        onClick={(event) => event.stopPropagation()}
        className="block max-h-[92vh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
      />
    </div>,
    document.body,
  );
}

function formatDeadlineCountdown(deadline: string, nowMs: number) {
  if (deadline.trim() === '-' || deadline.trim().length === 0) {
    return '报名信息见帖内';
  }

  const target = parseDeadline(deadline, nowMs);
  const remainingMs = Math.max(0, target.getTime() - nowMs);
  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}天${hours}小时${minutes}分钟`;
  }

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }

  return `${minutes}分钟`;
}

function parseDeadline(deadline: string, nowMs: number) {
  const match = deadline.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  const currentYear = new Date(nowMs).getFullYear();

  if (!match) {
    return new Date(nowMs);
  }

  const [, month, day, hour, minute] = match;
  return new Date(
    currentYear,
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    0,
    0,
  );
}

function getActivityCoverSource(activity: ActivityBanner) {
  return activity.coverImage ?? defaultActivityCover;
}

function getUniqueActivityCoverSources(activities: ActivityBanner[]) {
  return Array.from(new Set(activities.map(getActivityCoverSource)));
}
