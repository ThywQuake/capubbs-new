import type { LegacyBbsViewer } from '../api/legacyBbsClient';

export function getViewerStorageOwnerKey(viewer: LegacyBbsViewer) {
  if (!viewer) {
    return null;
  }

  if (typeof viewer.id === 'number') {
    return `id:${viewer.id}`;
  }

  const username = viewer.username.trim();

  return username ? `username:${username}` : null;
}
