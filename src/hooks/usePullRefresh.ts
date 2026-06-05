import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
  type TouchEvent,
  type WheelEvent,
} from 'react';

const DEFAULT_PULL_REFRESH_THRESHOLD = 72;
const DEFAULT_MAX_PULL_REFRESH_DISTANCE = 96;
const DEFAULT_PULL_REFRESH_DAMPING = 0.55;
const REFRESH_DURATION_MS = 700;
const PULL_REFRESH_COOLDOWN_MS = 1000;

export const PULL_REFRESH_REBOUND_MS = 180;

export type PullRefreshState = {
  distance: number;
  isRefreshing: boolean;
  isReturning: boolean;
};

export type PullRefreshHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  onTouchCancel: () => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
};

type PullRefreshTriggerDistanceMode = 'display' | 'gesture';

type UsePullRefreshOptions = {
  maxDistance?: number;
  onRefresh: () => void;
  pullDamping?: number;
  scrollContainerRef: RefObject<HTMLElement | null>;
  threshold?: number;
  triggerDistanceMode?: PullRefreshTriggerDistanceMode;
};

export function usePullRefresh({
  maxDistance = DEFAULT_MAX_PULL_REFRESH_DISTANCE,
  onRefresh,
  pullDamping = DEFAULT_PULL_REFRESH_DAMPING,
  scrollContainerRef,
  threshold = DEFAULT_PULL_REFRESH_THRESHOLD,
  triggerDistanceMode = 'display',
}: UsePullRefreshOptions) {
  const [pullRefresh, setPullRefresh] = useState<PullRefreshState>({
    distance: 0,
    isRefreshing: false,
    isReturning: false,
  });
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullGestureDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const pullResetTimerRef = useRef<number | null>(null);
  const pullCooldownTimerRef = useRef<number | null>(null);
  const isPullCooldownRef = useRef(false);

  useEffect(
    () => () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      if (pullResetTimerRef.current !== null) {
        window.clearTimeout(pullResetTimerRef.current);
      }
      if (pullCooldownTimerRef.current !== null) {
        window.clearTimeout(pullCooldownTimerRef.current);
      }
    },
    [],
  );

  const resetPull = () => {
    if (isRefreshingRef.current) {
      return;
    }

    pullStartYRef.current = null;
    const shouldRebound = pullDistanceRef.current > 0;
    pullDistanceRef.current = 0;
    pullGestureDistanceRef.current = 0;
    setPullRefresh({ distance: 0, isRefreshing: false, isReturning: shouldRebound });
  };

  const updatePullDistance = (distance: number) => {
    const nextDistance = Math.min(maxDistance, Math.max(0, distance));

    pullDistanceRef.current = nextDistance;
    setPullRefresh({ distance: nextDistance, isRefreshing: false, isReturning: false });
  };

  const triggerRefresh = () => {
    if (isRefreshingRef.current) {
      return;
    }

    if (pullResetTimerRef.current !== null) {
      window.clearTimeout(pullResetTimerRef.current);
      pullResetTimerRef.current = null;
    }

    isRefreshingRef.current = true;
    isPullCooldownRef.current = false;
    pullStartYRef.current = null;
    pullGestureDistanceRef.current = 0;
    pullDistanceRef.current = threshold;
    setPullRefresh({ distance: threshold, isRefreshing: true, isReturning: false });
    onRefresh();

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      isRefreshingRef.current = false;
      isPullCooldownRef.current = true;
      pullDistanceRef.current = 0;
      pullGestureDistanceRef.current = 0;
      setPullRefresh({ distance: 0, isRefreshing: false, isReturning: true });
      refreshTimerRef.current = null;

      if (pullCooldownTimerRef.current !== null) {
        window.clearTimeout(pullCooldownTimerRef.current);
      }

      pullCooldownTimerRef.current = window.setTimeout(() => {
        isPullCooldownRef.current = false;
        pullCooldownTimerRef.current = null;
      }, PULL_REFRESH_COOLDOWN_MS);
    }, REFRESH_DURATION_MS);
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      isRefreshingRef.current ||
      isPullCooldownRef.current ||
      scrollContainerRef.current?.scrollTop !== 0
    ) {
      pullStartYRef.current = null;
      pullGestureDistanceRef.current = 0;
      return;
    }

    pullStartYRef.current = event.clientY;
    pullGestureDistanceRef.current = 0;
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      pullStartYRef.current === null ||
      isRefreshingRef.current ||
      isPullCooldownRef.current ||
      !scrollContainerRef.current
    ) {
      return;
    }

    if (scrollContainerRef.current.scrollTop > 0) {
      resetPull();
      return;
    }

    const rawDistance = event.clientY - pullStartYRef.current;

    if (rawDistance <= 0) {
      resetPull();
      return;
    }

    pullGestureDistanceRef.current = rawDistance;

    if (rawDistance > 4) {
      event.preventDefault();
    }

    updatePullDistance(Math.round(rawDistance * pullDamping));
  };

  const shouldTriggerRefresh = (finalGestureDistance = pullGestureDistanceRef.current) => {
    const triggerDistance =
      triggerDistanceMode === 'gesture' ? finalGestureDistance : pullDistanceRef.current;

    return triggerDistance >= threshold;
  };

  const handlePointerEnd = (event?: PointerEvent<HTMLElement>) => {
    if (isRefreshingRef.current) {
      return;
    }

    const finalGestureDistance =
      event && pullStartYRef.current !== null
        ? Math.max(0, event.clientY - pullStartYRef.current)
        : pullGestureDistanceRef.current;

    pullGestureDistanceRef.current = finalGestureDistance;

    if (shouldTriggerRefresh(finalGestureDistance)) {
      triggerRefresh();
      return;
    }

    resetPull();
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (
      event.touches.length !== 1 ||
      isRefreshingRef.current ||
      isPullCooldownRef.current ||
      scrollContainerRef.current?.scrollTop !== 0
    ) {
      pullStartYRef.current = null;
      pullGestureDistanceRef.current = 0;
      return;
    }

    pullStartYRef.current = event.touches[0].clientY;
    pullGestureDistanceRef.current = 0;
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (
      pullStartYRef.current === null ||
      event.touches.length !== 1 ||
      isRefreshingRef.current ||
      isPullCooldownRef.current ||
      !scrollContainerRef.current
    ) {
      return;
    }

    if (scrollContainerRef.current.scrollTop > 0) {
      resetPull();
      return;
    }

    const rawDistance = event.touches[0].clientY - pullStartYRef.current;

    if (rawDistance <= 0) {
      resetPull();
      return;
    }

    pullGestureDistanceRef.current = rawDistance;

    if (rawDistance > 4) {
      event.preventDefault();
    }

    updatePullDistance(Math.round(rawDistance * pullDamping));
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (isRefreshingRef.current) {
      return;
    }

    const finalTouch = event.changedTouches[0];
    const finalGestureDistance =
      finalTouch && pullStartYRef.current !== null
        ? Math.max(0, finalTouch.clientY - pullStartYRef.current)
        : pullGestureDistanceRef.current;

    pullGestureDistanceRef.current = finalGestureDistance;

    if (shouldTriggerRefresh(finalGestureDistance)) {
      triggerRefresh();
      return;
    }

    resetPull();
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (
      isRefreshingRef.current ||
      isPullCooldownRef.current ||
      scrollContainerRef.current?.scrollTop !== 0 ||
      event.deltaY >= 0
    ) {
      return;
    }

    event.preventDefault();
    const nextDistance = pullDistanceRef.current + Math.abs(event.deltaY) * 0.2;
    updatePullDistance(nextDistance);

    if (nextDistance >= threshold) {
      triggerRefresh();
      return;
    }

    if (pullResetTimerRef.current !== null) {
      window.clearTimeout(pullResetTimerRef.current);
    }

    pullResetTimerRef.current = window.setTimeout(() => {
      pullResetTimerRef.current = null;
      resetPull();
    }, 180);
  };

  const refreshIndicatorText = pullRefresh.isRefreshing
    ? '刷新中'
    : pullRefresh.distance >= threshold
      ? '松开刷新'
      : '下拉刷新';

  return {
    pullRefresh,
    pullRefreshHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: resetPull,
      onPointerLeave: handlePointerEnd,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: resetPull,
      onWheel: handleWheel,
    } satisfies PullRefreshHandlers,
    refreshIndicatorText,
  };
}
