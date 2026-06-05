import { useEffect, useRef, useState, type UIEvent } from 'react';

const THREAD_TOPBAR_TITLE_MIN_SCROLL_TOP = 64;
const THREAD_TOPBAR_TITLE_SHOW_DISTANCE = 28;
const THREAD_TOPBAR_TITLE_HIDE_DISTANCE = 18;

type ThreadTopBarScrollState = {
  direction: -1 | 0 | 1;
  element: HTMLElement | null;
  scrollTop: number;
  travel: number;
};

type UseThreadTopBarTitleOptions = {
  activeThreadId: string | null;
  isThreadReadingRoute: boolean;
  isTopBarCollapsed: boolean;
  showThreadTitleInTopBar: boolean;
};

export function useThreadTopBarTitle({
  activeThreadId,
  isThreadReadingRoute,
  isTopBarCollapsed,
  showThreadTitleInTopBar,
}: UseThreadTopBarTitleOptions) {
  const [isThreadTitleInTopBar, setIsThreadTitleInTopBar] = useState(false);
  const threadTopBarScrollRef = useRef<ThreadTopBarScrollState>({
    direction: 0,
    element: null,
    scrollTop: 0,
    travel: 0,
  });

  const resetThreadTopBarTitle = () => {
    threadTopBarScrollRef.current = {
      direction: 0,
      element: null,
      scrollTop: 0,
      travel: 0,
    };
    setIsThreadTitleInTopBar(false);
  };

  const handleThreadContentScroll = (event: UIEvent<HTMLElement>) => {
    if (!isThreadReadingRoute || !showThreadTitleInTopBar) {
      setIsThreadTitleInTopBar(false);
      return;
    }

    const element = event.currentTarget;
    const scrollTop = element.scrollTop;
    const previousState = threadTopBarScrollRef.current;
    const isSameElement = previousState.element === element;
    const previousScrollTop = isSameElement ? previousState.scrollTop : 0;
    const previousDirection = isSameElement ? previousState.direction : 0;
    const previousTravel = isSameElement ? previousState.travel : 0;
    const delta = scrollTop - previousScrollTop;

    if (Math.abs(delta) < 1) {
      return;
    }

    const direction = delta > 0 ? 1 : -1;
    const travel = previousDirection === direction ? previousTravel + Math.abs(delta) : Math.abs(delta);
    threadTopBarScrollRef.current = {
      direction,
      element,
      scrollTop,
      travel,
    };

    if (scrollTop <= THREAD_TOPBAR_TITLE_MIN_SCROLL_TOP / 2) {
      setIsThreadTitleInTopBar(false);
      return;
    }

    if (isTopBarCollapsed) {
      return;
    }

    if (
      direction > 0 &&
      scrollTop >= THREAD_TOPBAR_TITLE_MIN_SCROLL_TOP &&
      travel >= THREAD_TOPBAR_TITLE_SHOW_DISTANCE
    ) {
      setIsThreadTitleInTopBar(true);
      return;
    }

    if (direction < 0 && travel >= THREAD_TOPBAR_TITLE_HIDE_DISTANCE) {
      setIsThreadTitleInTopBar(false);
    }
  };

  useEffect(() => {
    resetThreadTopBarTitle();
  }, [activeThreadId, isThreadReadingRoute]);

  useEffect(() => {
    if (!isThreadReadingRoute || isTopBarCollapsed || !showThreadTitleInTopBar) {
      setIsThreadTitleInTopBar(false);
    }
  }, [isThreadReadingRoute, isTopBarCollapsed, showThreadTitleInTopBar]);

  return {
    handleThreadContentScroll,
    isThreadTitleInTopBar,
  };
}
