const BOARD_ROUTE_PREFIX = '/boards/';

export function getBoardPath(board: string) {
  return `${BOARD_ROUTE_PREFIX}${encodeURIComponent(board)}`;
}

export function getBoardNewThreadPath(board: string) {
  return `${getBoardPath(board)}/new`;
}

export function getBoardNameFromPath(pathname: string) {
  if (!pathname.startsWith(BOARD_ROUTE_PREFIX)) {
    return null;
  }

  const encodedBoardName = pathname.slice(BOARD_ROUTE_PREFIX.length).split('/')[0];

  if (!encodedBoardName) {
    return null;
  }

  try {
    return decodeURIComponent(encodedBoardName);
  } catch {
    return null;
  }
}

export function getBoardNewThreadNameFromPath(pathname: string) {
  const boardName = getBoardNameFromPath(pathname);

  if (!boardName) {
    return null;
  }

  const suffix = getBoardSuffixFromPath(pathname);

  return suffix === '/new' || suffix === '/new/' ? boardName : null;
}

function getBoardSuffixFromPath(pathname: string) {
  const encodedBoardName = pathname.slice(BOARD_ROUTE_PREFIX.length).split('/')[0];
  const suffixStart = BOARD_ROUTE_PREFIX.length + encodedBoardName.length;

  return pathname.slice(suffixStart).split(/[?#]/)[0];
}
