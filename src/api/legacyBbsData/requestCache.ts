const cachedResponses = new Map<string, unknown>();
const pendingResponses = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

export function readCachedLegacyBbsResponse<T>(key: string) {
  return (cachedResponses.get(key) as T | undefined) ?? null;
}

export function writeCachedLegacyBbsResponse<T>(key: string, value: T) {
  cachedResponses.set(key, value);
}

export function clearCachedLegacyBbsResponse(key: string) {
  cachedResponses.delete(key);
  pendingResponses.delete(key);
}

export function clearAllCachedLegacyBbsResponses() {
  cacheGeneration += 1;
  cachedResponses.clear();
  pendingResponses.clear();
}

export function fetchCachedLegacyBbsResponse<T>(key: string, fetcher: () => Promise<T>) {
  const cachedResponse = readCachedLegacyBbsResponse<T>(key);

  if (cachedResponse) {
    return Promise.resolve(cachedResponse);
  }

  return fetchFreshLegacyBbsResponse(key, fetcher);
}

export function fetchFreshLegacyBbsResponse<T>(key: string, fetcher: () => Promise<T>) {
  const pendingResponse = pendingResponses.get(key) as Promise<T> | undefined;

  if (pendingResponse) {
    return pendingResponse;
  }

  const requestGeneration = cacheGeneration;
  const nextResponse = fetcher()
    .then((value) => {
      if (requestGeneration === cacheGeneration) {
        writeCachedLegacyBbsResponse(key, value);
      }

      return value;
    })
    .finally(() => {
      if (pendingResponses.get(key) === nextResponse) {
        pendingResponses.delete(key);
      }
    });

  pendingResponses.set(key, nextResponse);
  return nextResponse;
}
