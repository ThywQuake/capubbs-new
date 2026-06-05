import type { LegacyBbsViewer } from '../api/legacyBbsClient';

const SPECIAL_ACTIVITY_MANAGERS = new Set(['组织部', '好蛋']);

export function getViewerRights(viewer: LegacyBbsViewer) {
  return viewer?.rights ?? -1;
}

export function isGuestViewer(viewer: LegacyBbsViewer) {
  return getViewerRights(viewer) < 0;
}

export function canMoveBoardThreads(viewer: LegacyBbsViewer) {
  return getViewerRights(viewer) >= 3;
}

export function canResetOtherUserPassword(viewer: LegacyBbsViewer) {
  return getViewerRights(viewer) >= 10;
}

export function canManageCalendarEvents(viewer: LegacyBbsViewer) {
  return getViewerRights(viewer) >= 10 || isSpecialActivityManager(viewer);
}

export function canManageArchiveFiles(viewer: LegacyBbsViewer) {
  return getViewerRights(viewer) >= 10 || isSpecialActivityManager(viewer);
}

export function canManagePunishmentRecords(viewer: LegacyBbsViewer) {
  return isSpecialActivityManager(viewer);
}

function isSpecialActivityManager(viewer: LegacyBbsViewer) {
  return SPECIAL_ACTIVITY_MANAGERS.has(viewer?.username.trim() ?? '');
}
