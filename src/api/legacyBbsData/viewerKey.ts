import type { LegacyBbsViewer } from '../legacyBbsClient';

export function getLegacyViewerRequestKey(viewer: LegacyBbsViewer) {
  const username = viewer?.username.trim().toLowerCase();

  if (username) {
    return `username:${username}`;
  }

  return typeof viewer?.id === 'number' ? `id:${viewer.id}` : '';
}
