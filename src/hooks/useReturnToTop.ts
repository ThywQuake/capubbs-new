import { useEffect, useRef } from 'react';

const RETURN_TO_TOP_DURATION_MS = 520;

export function useReturnToTop() {
  const mobileColumnRef = useRef<HTMLElement | null>(null);
  const middleColumnRef = useRef<HTMLElement | null>(null);
  const rightColumnRef = useRef<HTMLElement | null>(null);
  const returnAnimationRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (returnAnimationRef.current !== null) {
        window.cancelAnimationFrame(returnAnimationRef.current);
      }
    },
    [],
  );

  const scrollAllColumnsToTop = () => {
    const mobileColumn = mobileColumnRef.current;
    const middleColumn = middleColumnRef.current;
    const rightColumn = rightColumnRef.current;
    const mobileStart = mobileColumn?.scrollTop ?? 0;
    const middleStart = middleColumn?.scrollTop ?? 0;
    const rightStart = rightColumn?.scrollTop ?? 0;
    const windowStart = window.scrollY;

    if (returnAnimationRef.current !== null) {
      window.cancelAnimationFrame(returnAnimationRef.current);
      returnAnimationRef.current = null;
    }

    if (mobileStart === 0 && middleStart === 0 && rightStart === 0 && windowStart === 0) {
      return;
    }

    const startTime = window.performance.now();

    const animateReturn = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / RETURN_TO_TOP_DURATION_MS);
      const remaining = 1 - easeOutCubic(progress);

      if (mobileColumn) {
        mobileColumn.scrollTop = mobileStart * remaining;
      }
      if (middleColumn) {
        middleColumn.scrollTop = middleStart * remaining;
      }
      if (rightColumn) {
        rightColumn.scrollTop = rightStart * remaining;
      }
      if (windowStart > 0) {
        window.scrollTo(0, windowStart * remaining);
      }

      if (progress < 1) {
        returnAnimationRef.current = window.requestAnimationFrame(animateReturn);
        return;
      }

      if (mobileColumn) {
        mobileColumn.scrollTop = 0;
      }
      if (middleColumn) {
        middleColumn.scrollTop = 0;
      }
      if (rightColumn) {
        rightColumn.scrollTop = 0;
      }
      if (windowStart > 0) {
        window.scrollTo(0, 0);
      }
      returnAnimationRef.current = null;
    };

    returnAnimationRef.current = window.requestAnimationFrame(animateReturn);
  };

  return {
    mobileColumnRef,
    middleColumnRef,
    rightColumnRef,
    scrollAllColumnsToTop,
  };
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}
