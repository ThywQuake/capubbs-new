import type { LegacyBbsViewer } from '../api/legacyBbsClient/types';

type BoardStarViewer = {
  rights?: unknown;
  star?: unknown;
  username?: unknown;
} | null | undefined;

export function normalizeBoardRequiredStar(value: unknown) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function getBoardStarRequirementMessage(requiredStar: unknown) {
  const normalizedRequiredStar = normalizeBoardRequiredStar(requiredStar);

  return normalizedRequiredStar > 0 ? `在本版发帖或回复至少需要 ${normalizedRequiredStar} 星。` : '';
}

export function getViewerStarLevel(viewer: BoardStarViewer) {
  return normalizeViewerNumber(viewer?.star, -1);
}

export function canViewerPostToBoard(viewer: LegacyBbsViewer, requiredStar: unknown) {
  return canBoardStarViewerPost(viewer, requiredStar);
}

export function canBoardStarViewerPost(viewer: BoardStarViewer, requiredStar: unknown) {
  const normalizedRequiredStar = normalizeBoardRequiredStar(requiredStar);
  const username = stringifyViewerValue(viewer?.username).trim();

  if (!username) {
    return false;
  }

  if (normalizedRequiredStar <= 0) {
    return true;
  }

  return normalizeViewerNumber(viewer?.rights, -1) > 1 || getViewerStarLevel(viewer) >= normalizedRequiredStar;
}

function normalizeViewerNumber(value: unknown, fallback: number) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
}

function stringifyViewerValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}
