import { useEffect, useMemo, useRef, useState } from 'react';
import { cacheImageSource, getUniqueImageSources, readCachedImage, readInitialCachedImages } from '../utils/imageCache';

type UseCachedImagesOptions = {
  maxLocalStorageLength?: number;
  namespace: string;
  sources: string[];
};

export function useCachedImages({ maxLocalStorageLength, namespace, sources }: UseCachedImagesOptions) {
  const [cachedImages, setCachedImages] = useState<Record<string, string>>(() =>
    readInitialCachedImages(sources, namespace),
  );
  const cachingSourcesRef = useRef(new Set<string>());
  const stableSourcesKey = useMemo(() => getUniqueImageSources(sources).join('\n'), [sources]);
  const stableSources = useMemo(() => (stableSourcesKey ? stableSourcesKey.split('\n') : []), [stableSourcesKey]);

  useEffect(() => {
    let cancelled = false;

    stableSources.forEach((source) => {
      const cachedImage = readCachedImage(namespace, source);

      if (cachedImage) {
        setCachedImages((current) => (current[source] === cachedImage ? current : { ...current, [source]: cachedImage }));
        return;
      }

      if (source.startsWith('data:') || source.startsWith('blob:') || cachingSourcesRef.current.has(source)) {
        return;
      }

      cachingSourcesRef.current.add(source);
      void cacheImageSource(namespace, source, maxLocalStorageLength)
        .then((dataUrl) => {
          if (!cancelled && dataUrl) {
            setCachedImages((current) => ({
              ...current,
              [source]: dataUrl,
            }));
          }
        })
        .finally(() => {
          cachingSourcesRef.current.delete(source);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [maxLocalStorageLength, namespace, stableSources, stableSourcesKey]);

  return cachedImages;
}
