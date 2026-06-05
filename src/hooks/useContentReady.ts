import { useEffect, useState } from 'react';

export function useContentReady() {
  const [isContentReady, setIsContentReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsContentReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return isContentReady;
}
