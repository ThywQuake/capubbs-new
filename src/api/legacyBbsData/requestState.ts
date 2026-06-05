export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'API 请求失败';
}
