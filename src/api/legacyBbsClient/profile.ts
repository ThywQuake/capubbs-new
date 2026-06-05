import { legacyForumBoards } from '../../data/forumBoards';
import { LegacyBbsError } from './errors';
import { getLegacyFavoriteCount } from './favorites';
import { getBoardForBid, isSameLegacyUsername, mapLegacyViewer } from './mappers';
import {
  callCachedOrLegacyCurrentUser,
  callOptionalLegacyCurrentUser,
  clearCachedLegacyCurrentUserRows,
} from './currentUser';
import { callLegacyAsk, callOptionalLegacyAsk } from './transport';
import { clearCachedLegacyXmlUserProfileRow, fetchLegacyXmlUserProfileRow } from './legacyXmlProfile';
import type {
  LegacyBbsBoardSummary,
  LegacyBbsPasswordUpdateResponse,
  LegacyBbsPublicProfileResponse,
  LegacyBbsUserCenterProfile,
  LegacyBbsUserCenterProfileStats,
  LegacyBbsUserCenterRecord,
  LegacyBbsUserCenterResponse,
  LegacyRequestBody,
  LegacyRow,
} from './types';
import {
  formatLegacyTimestamp,
  isAbortError,
  normalizeLegacyIcon,
  optionalNumber,
  stringValue,
  stripLegacyHtml,
  toNullableNumber,
  toNumber,
} from './utils';
import { writeLegacyTokenCookie } from './authSession';

export async function fetchLegacyUserCenter(signal?: AbortSignal): Promise<LegacyBbsUserCenterResponse> {
  return fetchLegacyUserCenterData(signal);
}

export async function fetchLegacyUserCenterProfile(signal?: AbortSignal): Promise<LegacyBbsUserCenterResponse> {
  const profileRow = await fetchCurrentLegacyUserProfileRow(signal);

  return mapLegacyUserCenterResponse({
    boards: legacyForumBoards,
    favoriteRows: [],
    postRows: [],
    profileRow,
    profileStats: null,
    replyRows: [],
  });
}

export async function fetchLegacyUserCenterData(signal?: AbortSignal): Promise<LegacyBbsUserCenterResponse> {
  const profileRow = await fetchCurrentLegacyUserProfileRow(signal);
  const boards = legacyForumBoards;
  const username = stringValue(profileRow.username).trim();
  const [postRows, replyRows, favoriteRows] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'recentpost', limit: 'all', view: username }, signal),
    callOptionalLegacyAsk({ ask: 'recentreply', limit: 'all', view: username }, signal),
    callOptionalLegacyAsk({ ask: 'favorite_list', limit: 'all' }, signal),
  ]);
  const userCenterRows = getLegacyUserCenterRows({ favoriteRows, postRows, replyRows });

  return mapLegacyUserCenterResponse({
    boards,
    favoriteRows: userCenterRows.favoriteRows,
    postRows: userCenterRows.postRows,
    profileRow,
    profileStats: userCenterRows.profileStats,
    replyRows: userCenterRows.replyRows,
  });
}

export type LegacyBbsUserCenterRecordTab = 'activities' | 'bookmarks' | 'posts' | 'replies';

export async function fetchLegacyUserCenterRecordTab(
  recordTab: LegacyBbsUserCenterRecordTab,
  signal?: AbortSignal,
): Promise<LegacyBbsUserCenterResponse['records']> {
  const profileRow = await fetchCurrentLegacyUserProfileRow(signal);
  const username = stringValue(profileRow.username).trim();
  const emptyRows: LegacyRow[] = [];

  if (recordTab === 'activities') {
    return mapLegacyUserCenterRecords({
      boards: legacyForumBoards,
      favoriteRows: emptyRows,
      postRows: emptyRows,
      profileRow,
      replyRows: emptyRows,
    });
  }

  const [postRows, replyRows, favoriteRows] = await Promise.all([
    recordTab === 'posts'
      ? callOptionalLegacyAsk({ ask: 'recentpost', limit: 'all', view: username }, signal)
      : Promise.resolve(emptyRows),
    recordTab === 'replies'
      ? callOptionalLegacyAsk({ ask: 'recentreply', limit: 'all', view: username }, signal)
      : Promise.resolve(emptyRows),
    recordTab === 'bookmarks'
      ? callOptionalLegacyAsk({ ask: 'favorite_list', limit: 'all' }, signal)
      : Promise.resolve(emptyRows),
  ]);

  return mapLegacyUserCenterRecords({
    boards: legacyForumBoards,
    favoriteRows,
    postRows,
    profileRow,
    replyRows,
  });
}

export async function fetchLegacyPublicProfile(
  profileName: string,
  signal?: AbortSignal,
): Promise<LegacyBbsPublicProfileResponse> {
  const username = profileName.trim();

  if (!username) {
    throw new LegacyBbsError('用户不存在', 404, 404);
  }

  const [profileRow, viewerRows] = await Promise.all([
    fetchLegacyXmlUserProfileRow(username, signal),
    callOptionalLegacyCurrentUser(signal),
  ]);
  const boards = legacyForumBoards;

  if (!profileRow || !stringValue(profileRow.username).trim()) {
    throw new LegacyBbsError('用户不存在', 404, 404);
  }

  const profileUsername = stringValue(profileRow.username).trim();
  const currentViewer = mapLegacyViewer(viewerRows[0]);
  const isOwnProfile = Boolean(currentViewer && isSameLegacyUsername(currentViewer.username, profileUsername));
  const [postRows, replyRows, favoriteRows] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'recentpost', limit: 'all', view: profileUsername }, signal),
    callOptionalLegacyAsk({ ask: 'recentreply', limit: 'all', view: profileUsername }, signal),
    isOwnProfile ? callOptionalLegacyAsk({ ask: 'favorite_list', limit: 'all' }, signal) : Promise.resolve([]),
  ]);
  const profileRows = getLegacyUserCenterRows({ favoriteRows, postRows, replyRows });

  return mapLegacyPublicProfileResponse({
    boards,
    favoriteRows: profileRows.favoriteRows,
    isOwnProfile,
    postRows: profileRows.postRows,
    profileRow,
    profileStats: profileRows.profileStats,
    replyRows: profileRows.replyRows,
  });
}

export async function updateLegacyUserCenterProfile(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsUserCenterResponse> {
  const profileRow = await fetchCurrentLegacyUserRow(signal);

  await callLegacyAsk(getLegacyEditUserParams(profileRow, {
    avatar: params.avatar,
    details: isRecord(params.details) ? params.details : undefined,
  }), signal);
  clearCachedLegacyCurrentUserRows();
  clearCachedLegacyXmlUserProfileRow(stringValue(profileRow.username));

  return fetchLegacyUserCenterProfile(signal);
}

export async function updateLegacyUserCenterSignatures(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsUserCenterResponse> {
  const profileRow = await fetchCurrentLegacyUserRow(signal);
  const signatures = Array.isArray(params.signatures)
    ? params.signatures.map((signature) => stringValue(signature))
    : undefined;

  await callLegacyAsk(getLegacyEditUserParams(profileRow, { signatures }), signal);
  clearCachedLegacyCurrentUserRows();
  clearCachedLegacyXmlUserProfileRow(stringValue(profileRow.username));

  return fetchLegacyUserCenterProfile(signal);
}

export async function updateLegacyUserCenterPassword(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsPasswordUpdateResponse> {
  const oldPasswordHash = stringValue(params.oldPasswordHash).trim();
  const newPasswordHash = stringValue(params.newPasswordHash).trim();

  if (!oldPasswordHash || !newPasswordHash) {
    throw new LegacyBbsError('请填写原密码和新密码', 400, 400);
  }

  const rows = await callLegacyAsk({
    ask: 'changepsd',
    new: newPasswordHash,
    old: oldPasswordHash,
  }, signal);
  const token = stringValue(rows[0]?.msg).trim();

  if (token) {
    writeLegacyTokenCookie(token);
  }

  return {
    message: token ? '密码已更新' : stringValue(rows[0]?.msg || '密码已更新'),
    token,
  };
}

export async function fetchCurrentLegacyUserRow(signal?: AbortSignal): Promise<LegacyRow> {
  const rows = await callCachedOrLegacyCurrentUser(signal);
  const row = rows[0];

  if (!row || !stringValue(row.username).trim()) {
    throw new LegacyBbsError('尚未登录', 401, -2);
  }

  return row;
}

async function fetchCurrentLegacyUserProfileRow(signal?: AbortSignal): Promise<LegacyRow> {
  const currentUserRow = await fetchCurrentLegacyUserRow(signal);
  const username = stringValue(currentUserRow.username).trim();
  const profileRow = await fetchOptionalLegacyProfileRow(username, signal);

  return mergeLegacyUserCenterProfileRow(currentUserRow, profileRow);
}

async function fetchOptionalLegacyProfileRow(username: string, signal?: AbortSignal): Promise<LegacyRow> {
  try {
    return await fetchLegacyXmlUserProfileRow(username, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return {};
  }
}

function mergeLegacyUserCenterProfileRow(row: LegacyRow, profileRow: LegacyRow): LegacyRow {
  const mergedRow: LegacyRow = {
    ...profileRow,
    ...row,
  };

  Object.entries(profileRow).forEach(([key, value]) => {
    if (!hasMeaningfulLegacyProfileValue(mergedRow[key]) && hasMeaningfulLegacyProfileValue(value)) {
      mergedRow[key] = value;
    }
  });

  return mergedRow;
}

function mapLegacyUserCenterResponse({
  boards,
  favoriteRows,
  postRows,
  profileRow,
  profileStats,
  replyRows,
}: {
  boards: LegacyBbsBoardSummary[];
  favoriteRows: LegacyRow[];
  postRows: LegacyRow[];
  profileRow: LegacyRow;
  profileStats: Partial<LegacyBbsUserCenterProfileStats> | null;
  replyRows: LegacyRow[];
}): LegacyBbsUserCenterResponse {
  const records = mapLegacyUserCenterRecords({
    boards,
    favoriteRows,
    postRows,
    profileRow,
    replyRows,
  });

  return {
    profile: mapLegacyUserCenterProfile(profileRow, records.bookmarks.length, profileStats),
    records,
    viewer: mapLegacyViewer(profileRow),
  };
}

function mapLegacyUserCenterRecords({
  boards,
  favoriteRows,
  postRows,
  profileRow,
  replyRows,
}: {
  boards: LegacyBbsBoardSummary[];
  favoriteRows: LegacyRow[];
  postRows: LegacyRow[];
  profileRow: LegacyRow;
  replyRows: LegacyRow[];
}): LegacyBbsUserCenterResponse['records'] {
  const favoriteRecords = favoriteRows
    .filter(isLegacyUserCenterThreadRow)
    .map((row) => mapLegacyUserCenterRecord(row, boards, { kind: 'bookmark' }));

  return {
    activities: [],
    bookmarks: favoriteRecords,
    posts: postRows
      .filter(isLegacyUserCenterThreadRow)
      .filter((row) => toNumber(row.pid, 1) === 1)
      .map((row) =>
        mapLegacyUserCenterRecord(row, boards, {
          fallbackAuthor: stringValue(profileRow.username),
          kind: 'post',
        }),
      ),
    replies: replyRows
      .filter(isLegacyUserCenterThreadRow)
      .filter((row) => toNumber(row.pid) > 1)
      .map((row) =>
        mapLegacyUserCenterRecord(row, boards, {
          fallbackAuthor: stringValue(profileRow.username),
          kind: 'reply',
        }),
      ),
    signatures: mapLegacyUserCenterSignatures(profileRow),
  };
}

function mapLegacyPublicProfileResponse({
  boards,
  favoriteRows,
  isOwnProfile,
  postRows,
  profileRow,
  profileStats,
  replyRows,
}: {
  boards: LegacyBbsBoardSummary[];
  favoriteRows: LegacyRow[];
  isOwnProfile: boolean;
  postRows: LegacyRow[];
  profileRow: LegacyRow;
  profileStats: Partial<LegacyBbsUserCenterProfileStats> | null;
  replyRows: LegacyRow[];
}): LegacyBbsPublicProfileResponse {
  const favoriteRecords = favoriteRows
    .filter(isLegacyUserCenterThreadRow)
    .map((row) => mapLegacyUserCenterRecord(row, boards, { kind: 'bookmark' }));

  return {
    isOwnProfile,
    profile: mapLegacyUserCenterProfile(profileRow, isOwnProfile ? favoriteRecords.length : null, profileStats),
    records: {
      activities: [],
      bookmarks: favoriteRecords,
      posts: postRows
        .filter(isLegacyUserCenterThreadRow)
        .filter((row) => toNumber(row.pid, 1) === 1)
        .map((row) =>
          mapLegacyUserCenterRecord(row, boards, {
            fallbackAuthor: stringValue(profileRow.username),
            kind: 'post',
          }),
        ),
      replies: replyRows
        .filter(isLegacyUserCenterThreadRow)
        .filter((row) => toNumber(row.pid) > 1)
        .map((row) =>
          mapLegacyUserCenterRecord(row, boards, {
            fallbackAuthor: stringValue(profileRow.username),
            kind: 'reply',
          }),
        ),
    },
  };
}

function mapLegacyUserCenterProfile(
  profileRow: LegacyRow,
  bookmarkCount: number | null,
  profileStats: Partial<LegacyBbsUserCenterProfileStats> | null = null,
): LegacyBbsUserCenterProfile {
  return {
    avatar: normalizeLegacyIcon(stringValue(profileRow.icon)),
    details: {
      email: stringValue(profileRow.mail || profileRow.email),
      hobby: stringValue(profileRow.hobby),
      location: stringValue(profileRow.place || profileRow.location),
      qq: stringValue(profileRow.qq),
    },
    intro: stringValue(profileRow.intro),
    lastSeenAt: formatLegacyTimestamp(profileRow.lastdate),
    rights: toNumber(profileRow.rights),
    registeredAt: formatLegacyTimestamp(profileRow.regdate),
    signatures: [
      stringValue(profileRow.sig1),
      stringValue(profileRow.sig2),
      stringValue(profileRow.sig3),
    ],
    star: toNumber(profileRow.star),
    stats: {
      activities: toNullableNumber(profileStats?.activities),
      bookmarks: toNullableNumber(profileStats?.bookmarks, bookmarkCount),
      checkins: toNumber(profileStats?.checkins, toNumber(profileRow.sign)),
      digests: toNullableNumber(
        profileStats?.digests,
        toNullableNumber(profileRow.extr ?? profileRow.digest ?? profileRow.digests ?? profileRow.elite ?? profileRow.excellent),
      ),
      posts: toNumber(profileStats?.posts, toNumber(profileRow.post)),
      replies: toNumber(profileStats?.replies, toNumber(profileRow.reply)),
      water: toNumber(profileStats?.water, toNumber(profileRow.water)),
    },
    username: stringValue(profileRow.username),
  };
}

function mapLegacyUserCenterRecord(
  row: LegacyRow,
  boards: LegacyBbsBoardSummary[],
  options: {
    fallbackAuthor?: string;
    kind: 'bookmark' | 'post' | 'reply';
  },
): LegacyBbsUserCenterRecord {
  const bid = toNumber(row.bid);
  const tid = toNumber(row.tid);
  const pid = optionalNumber(row.pid) ?? null;
  const board = getBoardForBid(boards, bid);
  const time = formatLegacyTimestamp(
    options.kind === 'bookmark'
      ? row.fav_timestamp ?? row.timestamp ?? row.postdate
      : row.timestamp ?? row.replytime ?? row.updatetime ?? row.postdate,
  );

  return {
    author: stringValue(row.author || options.fallbackAuthor),
    bid,
    board: {
      bid: board.bid,
      name: board.name,
      title: board.title,
    },
    deleted: stringValue(row.deleted) === '1',
    excerpt: '',
    favorites: getLegacyFavoriteCount(row),
    href: getLegacyThreadAppPath(bid, tid, options.kind === 'reply' ? pid : null),
    pid,
    replies: optionalNumber(row.reply) ?? null,
    tid,
    time,
    title: stringValue(row.title || `主题 ${tid}`),
    views: optionalNumber(row.click) ?? null,
  };
}

function mapLegacyUserCenterSignatures(profileRow: LegacyRow): LegacyBbsUserCenterRecord[] {
  const updatedAt = formatLegacyTimestamp(profileRow.lastdate || profileRow.regdate);

  return [stringValue(profileRow.sig1), stringValue(profileRow.sig2), stringValue(profileRow.sig3)].map(
    (signature, index) => ({
      author: stringValue(profileRow.username),
      bid: 0,
      board: {
        bid: 0,
        name: '签名档',
        title: '签名档',
      },
      content: signature,
      excerpt: stripLegacyHtml(signature),
      favorites: null,
      href: `#signature-${index + 1}`,
      pid: null,
      replies: null,
      signatureIndex: index + 1,
      tid: 0,
      time: updatedAt,
      title: `签名档${index + 1}`,
      views: null,
    }),
  );
}

function getLegacyEditUserParams(
  profileRow: LegacyRow,
  overrides: {
    avatar?: unknown;
    details?: Record<string, unknown>;
    signatures?: string[];
  },
): LegacyRequestBody {
  const details = overrides.details ?? {};
  const signatures = overrides.signatures ?? [
    stringValue(profileRow.sig1),
    stringValue(profileRow.sig2),
    stringValue(profileRow.sig3),
  ];

  return {
    ask: 'edituser',
    hobby: stringValue(details.hobby ?? profileRow.hobby),
    icon: stringValue(overrides.avatar ?? profileRow.icon),
    intro: stringValue(details.intro ?? profileRow.intro),
    mail: stringValue(details.email ?? profileRow.mail),
    place: stringValue(details.location ?? profileRow.place),
    qq: stringValue(details.qq ?? profileRow.qq),
    sex: stringValue(profileRow.sex),
    sig1: stringValue(signatures[0] ?? profileRow.sig1),
    sig2: stringValue(signatures[1] ?? profileRow.sig2),
    sig3: stringValue(signatures[2] ?? profileRow.sig3),
  };
}

function isLegacyUserCenterThreadRow(row: LegacyRow) {
  return toNumber(row.bid) > 0 && toNumber(row.tid) > 0 && stringValue(row.title).trim().length > 0;
}

function getLegacyUserCenterRows({
  favoriteRows,
  postRows,
  replyRows,
}: {
  favoriteRows: LegacyRow[];
  postRows: LegacyRow[];
  replyRows: LegacyRow[];
}) {
  const normalizedFavoriteRows = favoriteRows.filter(isLegacyUserCenterThreadRow);
  const normalizedPostRows = postRows
    .filter(isLegacyUserCenterThreadRow)
    .filter((row) => toNumber(row.pid, 1) === 1);
  const normalizedReplyRows = replyRows
    .filter(isLegacyUserCenterThreadRow)
    .filter((row) => toNumber(row.pid) > 1);

  return {
    favoriteRows: normalizedFavoriteRows,
    postRows: normalizedPostRows,
    profileStats: {
      bookmarks: normalizedFavoriteRows.length,
      posts: normalizedPostRows.length,
      replies: normalizedReplyRows.length,
    },
    replyRows: normalizedReplyRows,
  };
}

function getLegacyThreadAppPath(bid: number, tid: number, pid: number | null) {
  const basePath = `/threads/${bid}-${tid}`;

  return pid && pid > 1 ? `${basePath}#floor-${pid}` : basePath;
}

function hasMeaningfulLegacyProfileValue(value: unknown) {
  return stringValue(value).trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
