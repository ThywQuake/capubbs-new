import { getBbsNewApiUrl } from '../bbsNewApiRoutes';
import { legacyForumBoards } from '../../data/forumBoards';
import { canBoardStarViewerPost, getBoardStarRequirementMessage } from '../../utils/boardStarRequirement';
import { translateLegacySignatureHtml as renderLegacySignatureHtml } from '../../utils/legacySignature';
import { LegacyBbsError } from './errors';
import { getLegacyFavoriteCheck, getLegacyFavoriteCount } from './favorites';
import { mapLegacyBoardViewerState } from './boards';
import { callOptionalLegacyCurrentUser } from './currentUser';
import { syncLegacyTokenCookie } from './authSession';
import {
  getBoardForBid,
  isSameLegacyUsername,
  mapLegacyFloor,
  mapLegacyNestedReply,
  mapLegacyThreadItem,
  mapLegacyWritePostResponse,
} from './mappers';
import { callLegacyAsk, callOptionalLegacyAsk } from './transport';
import type {
  LegacyBbsActivitySignupAction,
  LegacyBbsActivitySignupResponse,
  LegacyBbsFloor,
  LegacyBbsNestedReply,
  LegacyBbsThreadFloorsResponse,
  LegacyBbsThreadFloorPreviewResponse,
  LegacyBbsThreadInteractionStateResponse,
  LegacyBbsThreadModerationAction,
  LegacyBbsThreadModerationResponse,
  LegacyBbsThreadMoveResponse,
  LegacyBbsThreadResponse,
  LegacyBbsUnifiedThreadAction,
  LegacyBbsWritePostResponse,
  LegacyRequestBody,
  LegacyRow,
} from './types';
import { isRecord, stringValue, stripLegacyHtml, toNumber } from './utils';

type LegacyActivityCreateOption = {
  cases?: Array<{
    case_name: string;
    comment: string;
  }>;
  comment: string;
  option_name: string;
  required: 0 | 1;
  type_id: 1 | 3 | 6;
};

type LegacyActivitySignupPayload = LegacyRow & {
  code?: unknown;
  msg?: unknown;
  message?: unknown;
};

export async function fetchLegacyThread(
  bid: number,
  tid: number,
  params: LegacyRequestBody = {},
  signal?: AbortSignal,
): Promise<LegacyBbsThreadResponse> {
  return fetchLegacyThreadDetailQuery(bid, tid, params, signal);
}

export async function fetchLegacyThreadInteractionState(
  bid: number,
  tid: number,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadInteractionStateResponse> {
  const [threadRows, rightsRows, viewerRows, favoriteCheckRows, favoriteCountRows] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'tidinfo', bid, tid }, signal),
    callOptionalLegacyAsk({ ask: 'rights', bid }, signal),
    callOptionalLegacyCurrentUser(signal),
    callOptionalLegacyAsk({ ask: 'favorite_check', bid, tid }, signal),
    callOptionalLegacyAsk({ ask: 'favorite_count', bid, tid }, signal),
  ]);
  const boardRows = await callOptionalLegacyAsk({ ask: 'bbsinfo', bid }, { includeToken: false, signal });
  const cachedBoard = getBoardForBid(legacyForumBoards, bid);
  const board = {
    ...cachedBoard,
    requiredStar: toNumber(boardRows[0]?.need, cachedBoard.requiredStar),
  };
  const boardViewerState = mapLegacyBoardViewerState(rightsRows[0], viewerRows[0], board);
  const thread = threadRows[0] ? mapLegacyThreadItem(threadRows[0], getBoardForBid(legacyForumBoards, bid)) : null;
  const canModerate = boardViewerState.canModerate;

  return {
    bid,
    bookmarks: getLegacyFavoriteCount(favoriteCountRows[0]) ?? thread?.favorites ?? 0,
    tid,
    viewerState: {
      bookmarked: getLegacyFavoriteCheck(favoriteCheckRows[0], false),
      canEdit: canModerate,
      canGlobalPin: boardViewerState.canGlobalPin,
      canModerate,
      canReply: !thread?.locked && boardViewerState.canPost,
    },
  };
}

export async function fetchLegacyThreadFloors(
  bid: number,
  tid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadFloorsResponse> {
  return (await fetchLegacyThreadDetailQuery(bid, tid, params, signal)).floorsPage;
}

export async function fetchLegacyThreadFloorPreview(
  bid: number,
  tid: number,
  pid: number,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadFloorPreviewResponse> {
  const [threadRows, floor] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'tidinfo', bid, tid }, signal),
    fetchLegacyFloor(bid, tid, pid, signal),
  ]);
  const thread = threadRows[0]
    ? mapLegacyThreadItem(threadRows[0], getBoardForBid(legacyForumBoards, bid))
    : null;

  return {
    bid,
    floor,
    threadTitle: thread?.title || floor.title || `帖子 ${bid}-${tid}`,
    tid,
  };
}

async function fetchLegacyThreadDetailQuery(
  bid: number,
  tid: number,
  params: LegacyRequestBody = {},
  signal?: AbortSignal,
): Promise<LegacyBbsThreadResponse> {
  const authorOnly = isLegacyAuthorOnlyRequest(params);
  const requestedPage = getLegacyThreadRequestPage(params);
  const rows = await callLegacyAsk({
    ask: 'thread_detail',
    bid,
    tid,
    page: requestedPage,
    render: 'raw',
    ...(authorOnly ? { authorOnly: 1 } : {}),
  }, signal);
  const response = rows[0];

  if (!isLegacyThreadDetailResponse(response)) {
    throw new LegacyBbsError('帖子详情接口返回格式无效', 500, 500);
  }

  return hydrateLegacyThreadResponse(response, signal);
}

function isLegacyThreadDetailResponse(value: LegacyRow | undefined): value is LegacyRow & LegacyBbsThreadResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Partial<LegacyBbsThreadResponse>;

  return Boolean(
    response.thread &&
      response.mainPost &&
      response.floorsPage &&
      Array.isArray(response.floorsPage.items) &&
      response.viewerState,
  );
}

function getLegacyThreadRequestPage(params: LegacyRequestBody) {
  return Math.max(1, Math.floor(toNumber(params.page ?? params.p, 1)));
}

function isLegacyAuthorOnlyRequest(params: LegacyRequestBody) {
  const value = params.authorOnly ?? params.see_lz;

  return value === true || value === 1 || value === '1' || value === 'true';
}

async function hydrateLegacyThreadResponse(
  response: LegacyBbsThreadResponse,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadResponse> {
  const normalizedMainPost = normalizeLegacyThreadDetailFloor(response.mainPost);
  const normalizedItems = response.floorsPage.items.map(normalizeLegacyThreadDetailFloor);
  const hydratedFloors = await hydrateLegacyFloorsSignatures(
    [normalizedMainPost, ...normalizedItems],
    signal,
  );
  const mainPost = hydratedFloors[0] ?? normalizedMainPost;

  return {
    ...response,
    mainPost,
    floorsPage: {
      ...response.floorsPage,
      items: hydratedFloors.slice(1),
    },
    viewerState: await hydrateLegacyThreadViewerState(response, signal),
  };
}

async function hydrateLegacyThreadViewerState(response: LegacyBbsThreadResponse, signal?: AbortSignal) {
  if (!response.thread.isActivity) {
    return response.viewerState;
  }

  const viewerRows = await callOptionalLegacyCurrentUser(signal);
  const viewerUsername = stringValue(viewerRows[0]?.username);

  return {
    ...response.viewerState,
    canManageActivitySignup: Boolean(
      usernameCanManageLegacyActivitySignup(
        viewerUsername,
        stringValue(response.activity?.leader_username || response.thread.author),
      )
    ),
    username: viewerUsername,
  };
}

function usernameCanManageLegacyActivitySignup(viewerUsername: string, leaderUsername: string) {
  const normalizedViewerUsername = viewerUsername.trim();
  const normalizedLeaderUsername = leaderUsername.trim();

  return Boolean(
    normalizedViewerUsername &&
    normalizedLeaderUsername &&
    isSameLegacyUsername(normalizedViewerUsername, normalizedLeaderUsername),
  );
}

function normalizeLegacyThreadDetailFloor(floor: LegacyBbsFloor): LegacyBbsFloor {
  const rawFloor = (floor as LegacyBbsFloor & { raw?: LegacyRow }).raw;
  const rawText = stringValue(floor.rawText ?? rawFloor?.rawText ?? rawFloor?.text);

  return {
    ...floor,
    contentHtml: stringValue(floor.contentHtml),
    rawText,
    signatureHtml: stringValue(floor.signatureHtml),
  };
}

async function hydrateLegacyFloorsSignatures(
  floors: LegacyBbsFloor[],
  signal?: AbortSignal,
): Promise<LegacyBbsFloor[]> {
  const floorsNeedingAuthorData = floors.filter((floor) => (
    (
      floor.signatureEnabled &&
      floor.signatureIndex >= 1 &&
      floor.signatureIndex <= 3 &&
      !floor.signatureHtml.trim() &&
      !getLegacyFloorAuthorProfileSignature(floor)
    ) ||
    floor.authorStar <= 0
  ));
  const authors = floorsNeedingAuthorData.reduce<string[]>((result, floor) => {
    const author = floor.author.trim();

    if (author && !result.some((existingAuthor) => isSameLegacyUsername(existingAuthor, author))) {
      result.push(author);
    }

    return result;
  }, []);

  const authorRows = authors.length > 0
    ? await Promise.all(
      authors.map(async (author) => {
        const rows = await callOptionalLegacyAsk({ view: author }, signal);

        return [author, rows[0]] as const;
      }),
    )
    : [];
  const rowsByAuthor = new Map(authorRows.map(([author, row]) => [author, row] as const));

  return Promise.all(floors.map(async (floor) => {
    const profileAuthor = authors.find((author) => isSameLegacyUsername(author, floor.author));
    const profileRow = profileAuthor ? rowsByAuthor.get(profileAuthor) : undefined;
    const authorProfileSignature = getLegacyFloorAuthorProfileSignature(floor);
    const signature = floor.signatureEnabled && floor.signatureIndex >= 1 && floor.signatureIndex <= 3
      ? authorProfileSignature || stringValue(profileRow?.[`sig${floor.signatureIndex}`]).trim()
      : '';
    const authorStar = floor.authorStar > 0 ? floor.authorStar : toNumber(floor.authorProfile?.star ?? profileRow?.star);
    const signatureHtml = signature
      ? await translateLegacySignatureHtml(signature, signal)
      : await translateExistingLegacySignatureHtml(floor.signatureHtml, signal);

    if (!signature && signatureHtml === floor.signatureHtml && authorStar === floor.authorStar) {
      return floor;
    }

    return {
      ...floor,
      authorStar,
      signatureHtml,
    };
  }));
}

function getLegacyFloorAuthorProfileSignature(floor: LegacyBbsFloor) {
  if (!floor.signatureEnabled || floor.signatureIndex < 1 || floor.signatureIndex > 3) {
    return '';
  }

  return getLegacySignatureValueByIndex(floor.authorProfile?.signatures, floor.signatureIndex);
}

function getLegacySignatureValueByIndex(
  signatures: NonNullable<LegacyBbsFloor['authorProfile']>['signatures'] | undefined,
  signatureIndex: number,
) {
  if (!signatures) {
    return '';
  }

  if (Array.isArray(signatures)) {
    return stringValue(signatures[signatureIndex - 1]).trim();
  }

  return stringValue(
    signatures[String(signatureIndex)] ??
      signatures[`sig${signatureIndex}`] ??
      signatures[signatureIndex - 1],
  ).trim();
}

async function translateLegacySignatureHtml(rawSignature: string, signal?: AbortSignal) {
  void signal;

  if (!rawSignature.trim()) {
    return '';
  }

  return renderLegacySignatureHtml(rawSignature);
}

async function translateExistingLegacySignatureHtml(signatureHtml: string, signal?: AbortSignal) {
  void signal;

  return signatureHtml;
}

export async function createLegacyThread(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsWritePostResponse> {
  const bid = toNumber(params.bid);

  await assertLegacyBoardWriteAllowed(bid, signal);

  if (isLegacyActivityThreadCreateRequest(params)) {
    return createLegacyActivityThread(params, signal);
  }

  const rows = await callLegacyAsk({
    ask: 'post',
    attachs: stringValue(params.attachs),
    bid,
    sig: params.sig,
    text: params.text,
    title: params.title,
    type: params.type,
  }, signal);

  return mapLegacyWritePostResponse(rows[0], bid);
}

async function createLegacyActivityThread(
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsWritePostResponse> {
  const bid = toNumber(params.bid);
  const title = stringValue(params.title).trim();
  const text = stringValue(params.text).trim();

  if (bid <= 0 || !title || !text) {
    throw new LegacyBbsError('活动帖参数不完整', 400, 400);
  }

  syncLegacyTokenCookie();

  const response = await fetch(getBbsNewApiUrl('activity/create'), {
    body: encodeLegacyActivityCreateParams({
      attachs: stringValue(params.attachs),
      bid,
      options: buildLegacyActivityCreateOptions(params.signupQuestions),
      sig: toNumber(params.sig),
      text,
      title,
    }),
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    method: 'POST',
    signal,
  });
  const payload = await readLegacyActivityCreateResponse(response);
  const code = toNumber(payload.code, response.ok ? 0 : response.status);

  if (!response.ok || code !== 0) {
    throw new LegacyBbsError(
      stringValue(payload.msg ?? payload.message) || response.statusText || '活动帖发布失败',
      response.status,
      code,
    );
  }

  return mapLegacyWritePostResponse(payload, bid);
}

function isLegacyActivityThreadCreateRequest(params: LegacyRequestBody) {
  return isTruthyLegacyValue(params.signupEnabled);
}

function isTruthyLegacyValue(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function encodeLegacyActivityCreateParams({
  attachs,
  bid,
  options,
  sig,
  text,
  title,
}: {
  attachs: string;
  bid: number;
  options: LegacyActivityCreateOption[];
  sig: number;
  text: string;
  title: string;
}) {
  const body = new URLSearchParams();

  body.set('attachs', attachs);
  body.set('bid', String(bid));
  body.set('options', JSON.stringify(options));
  body.set('sig', String(sig));
  body.set('text', text);
  body.set('title', title);

  return body;
}

async function readLegacyActivityCreateResponse(response: Response): Promise<LegacyRow> {
  try {
    const payload = await response.json();

    return isRecord(payload) ? payload : {};
  } catch {
    throw new LegacyBbsError(response.statusText || '活动发帖接口响应不是有效 JSON', response.status, response.status || 500);
  }
}

function isLegacyActivitySignupAction(value: string): value is LegacyBbsActivitySignupAction {
  return value === 'cancel' || value === 'join' || value === 'modify' || value === 'restore';
}

function encodeLegacyActivitySignupParams(
  bid: number,
  tid: number,
  params: LegacyRequestBody,
  action: LegacyBbsActivitySignupAction,
) {
  const body = new URLSearchParams();
  const optionValues = isRecord(params.optionValues) ? params.optionValues : {};
  const sig = toNumber(params.sig);
  const title = stringValue(params.title).trim() || `Re: 帖子 ${bid}-${tid}`;
  const type = stringValue(params.type).trim() || 'web';

  body.set('data[action]', action);
  body.set('data[bid]', String(bid));
  body.set('data[tid]', String(tid));
  body.set('data[title]', title);
  body.set('sig', String(sig));
  body.set('type', type);

  Object.entries(optionValues).forEach(([optionId, value]) => {
    const optionValue = Array.isArray(value)
      ? value.map((item) => stringValue(item).trim()).filter(Boolean).join(',')
      : stringValue(value).trim();

    body.set(`data[option_values][${optionId}]`, optionValue);
  });

  return body;
}

async function readLegacyActivitySignupResponse(response: Response): Promise<LegacyActivitySignupPayload> {
  const text = await response.text();

  try {
    const payload: unknown = JSON.parse(text);

    return isRecord(payload) ? payload : {};
  } catch {
    throw new LegacyBbsError(response.statusText || '活动报名接口响应不是有效 JSON', response.status, response.status || 500);
  }
}

function findLegacyActivitySignupFloor(response: LegacyBbsThreadResponse, username: string) {
  return response.floorsPage.items
    .slice()
    .reverse()
    .find((floor) => isSameLegacyUsername(floor.author, username) && isLegacyActivitySignupFloor(floor)) ?? null;
}

function isLegacyActivitySignupFloor(floor: LegacyBbsFloor) {
  const content = stripLegacyHtml(floor.rawText || floor.contentHtml);

  return (floor.rawText || floor.contentHtml).includes('：') || /[^:：]+[:：]/.test(content);
}

function isLegacyActivitySignupFloorCanceled(floor: LegacyBbsFloor) {
  return /<\s*strike\b/i.test(floor.contentHtml) || /报名状态：已取消/.test(stripLegacyHtml(floor.contentHtml));
}

function buildLegacyActivityCreateOptions(value: unknown): LegacyActivityCreateOption[] {
  if (!Array.isArray(value)) {
    throw new LegacyBbsError('请至少添加一个报名字段', 400, 400);
  }

  const options = value.map(mapLegacyActivityCreateOption).filter((option): option is LegacyActivityCreateOption => option !== null);

  if (options.length === 0) {
    throw new LegacyBbsError('请至少添加一个报名字段', 400, 400);
  }

  assertUniqueLegacyActivityOptionNames(options);

  return options;
}

function mapLegacyActivityCreateOption(question: unknown): LegacyActivityCreateOption | null {
  if (!isRecord(question)) {
    return null;
  }

  const type = stringValue(question.type);
  const label = getLegacyActivityOptionName(question, type);

  if (!label) {
    throw new LegacyBbsError('问题名称不能为空', 400, 400);
  }

  const typeId = mapLegacyActivityQuestionType(type);
  const option: LegacyActivityCreateOption = {
    comment: getLegacyActivityQuestionComment(question, type),
    option_name: label,
    required: question.required === false ? 0 : 1,
    type_id: typeId,
  };

  if (typeId === 1 || typeId === 3) {
    option.cases = getLegacyActivityQuestionCases(question, type, label);
  }

  return option;
}

function getLegacyActivityOptionName(question: Record<string, unknown>, type: string) {
  if (type === 'id') {
    return 'ID';
  }

  return stringValue(question.label).trim();
}

function mapLegacyActivityQuestionType(type: string): LegacyActivityCreateOption['type_id'] {
  if (type === 'radio' || type === 'checkbox') {
    return 1;
  }

  if (type === 'multiSelect') {
    return 3;
  }

  return 6;
}

function getLegacyActivityQuestionCases(question: Record<string, unknown>, type: string, label: string) {
  const optionNames = type === 'checkbox'
    ? ['是', '否']
    : Array.isArray(question.options)
      ? question.options.map((option) => stringValue(option).trim()).filter(Boolean)
      : [];
  const uniqueOptionNames = Array.from(new Set(optionNames));

  if (uniqueOptionNames.length < 2) {
    throw new LegacyBbsError(`「${label}」的选项数量不能少于2个`, 400, 400);
  }

  return uniqueOptionNames.map((caseName) => ({
    case_name: caseName,
    comment: '',
  }));
}

function getLegacyActivityQuestionComment(question: Record<string, unknown>, type: string) {
  const min = toNumber(question.min, Number.NaN);
  const max = toNumber(question.max, Number.NaN);

  if (type === 'number' && Number.isFinite(min) && Number.isFinite(max)) {
    return `数字范围：${min} - ${max}`;
  }

  if (type === 'number' && Number.isFinite(min)) {
    return `数字下限：${min}`;
  }

  if (type === 'number' && Number.isFinite(max)) {
    return `数字上限：${max}`;
  }

  return '';
}

function assertUniqueLegacyActivityOptionNames(options: LegacyActivityCreateOption[]) {
  const seenNames = new Set<string>();

  options.forEach((option) => {
    const key = `${option.type_id}|${option.option_name}`;

    if (seenNames.has(key)) {
      throw new LegacyBbsError(`存在重复问题：「${option.option_name}」`, 400, 400);
    }

    seenNames.add(key);
  });
}

export async function createLegacyReplyFloor(
  bid: number,
  tid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsWritePostResponse> {
  await assertLegacyBoardWriteAllowed(bid, signal);

  const rows = await callLegacyAsk({
    ask: 'reply',
    attachs: stringValue(params.attachs),
    bid,
    sig: params.sig,
    text: params.text,
    tid,
    title: params.title,
    type: params.type,
  }, signal);
  const post = mapLegacyWritePostResponse(rows[0], bid, tid);

  return {
    ...post,
    floor: await fetchLegacyFloor(bid, tid, post.pid, signal),
  };
}

export async function updateLegacyFloor(
  bid: number,
  tid: number,
  pid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsWritePostResponse> {
  const rows = await callLegacyAsk({
    ask: 'edit',
    attachs: stringValue(params.attachs),
    bid,
    pid,
    sig: params.sig,
    text: params.text,
    tid,
    title: params.title,
    type: params.type,
  }, signal);

  return mapLegacyWritePostResponse(rows[0], bid, tid, pid);
}

export async function createLegacyNestedReply(
  bid: number,
  tid: number,
  pid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsNestedReply> {
  const fid = toNumber(params.fid);
  const text = stringValue(params.text).trim();

  if (bid <= 0 || tid <= 0 || pid <= 0 || fid <= 0 || text.length === 0) {
    throw new LegacyBbsError('缺少楼中楼参数', 400, 400);
  }

  await assertLegacyBoardWriteAllowed(bid, signal);

  await callLegacyAsk({
    ask: 'lzl',
    fid,
    method: 'post',
    text,
  }, signal);

  const rows = await callLegacyAsk({ ask: 'lzl', fid, method: 'ask' }, signal);
  const nestedReplies = rows
    .map(mapLegacyNestedReply)
    .filter((reply) => reply.id > 0)
    .sort((left, right) => left.id - right.id);
  const latestReply = [...nestedReplies]
    .reverse()
    .find((reply) => reply.fid === fid && stripLegacyHtml(reply.content).trim() === stripLegacyHtml(text).trim())
    ?? nestedReplies[nestedReplies.length - 1];

  if (!latestReply) {
    throw new LegacyBbsError('楼中楼已写入，但未能读取新回复', 500, 500);
  }

  return {
    ...latestReply,
    fid,
  };
}

async function assertLegacyBoardWriteAllowed(bid: number, signal?: AbortSignal) {
  if (bid <= 0) {
    return;
  }

  const [boardRows, viewerRows] = await Promise.all([
    callOptionalLegacyAsk({ ask: 'bbsinfo', bid }, { includeToken: false, signal }),
    callOptionalLegacyCurrentUser(signal),
  ]);
  const board = getBoardForBid(legacyForumBoards, bid);
  const requiredStar = toNumber(boardRows[0]?.need, board.requiredStar);
  const viewerRow = viewerRows[0];
  const username = stringValue(viewerRow?.username).trim();

  if (!username) {
    throw new LegacyBbsError('请先登录后再发帖或回复。', 401, -2);
  }

  const viewer = viewerRow
    ? {
        rights: toNumber(viewerRow.rights, -1),
        star: toNumber(viewerRow.star, -1),
        username,
      }
    : null;

  if (canBoardStarViewerPost(viewer, requiredStar)) {
    return;
  }

  throw new LegacyBbsError(getBoardStarRequirementMessage(requiredStar) || '当前账号不能在本版发帖或回复。', 403, 403);
}

export async function updateLegacyActivitySignup(
  bid: number,
  tid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsActivitySignupResponse> {
  if (bid <= 0 || tid <= 0) {
    throw new LegacyBbsError('活动帖编号无效', 400, 400);
  }

  const action = stringValue(params.action) as LegacyBbsActivitySignupAction;

  if (!isLegacyActivitySignupAction(action)) {
    throw new LegacyBbsError('未知活动报名操作', 400, 400);
  }

  const viewerRows = await callOptionalLegacyCurrentUser(signal);
  const username = stringValue(viewerRows[0]?.username).trim();

  if (!username) {
    throw new LegacyBbsError('请先登录后再报名。', 401, -2);
  }

  syncLegacyTokenCookie();

  const response = await fetch(getBbsNewApiUrl('activity/signup'), {
    body: encodeLegacyActivitySignupParams(bid, tid, params, action),
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    method: 'POST',
    signal,
  });
  const payload = await readLegacyActivitySignupResponse(response);
  const code = toNumber(payload.code, response.ok ? 0 : response.status);

  if (!response.ok || code !== 0) {
    throw new LegacyBbsError(
      stringValue(payload.msg ?? payload.message) || response.statusText || '活动报名同步失败',
      response.status,
      code,
    );
  }

  const threadResponse = await fetchLegacyThreadDetailForLatestActivitySignup(bid, tid, signal);
  const signupFloor = findLegacyActivitySignupFloor(threadResponse, username);
  const activityId = toNumber(threadResponse.activity?.activity_id);

  return {
    action,
    activityId,
    bid,
    canceled: action === 'cancel' || Boolean(signupFloor && isLegacyActivitySignupFloorCanceled(signupFloor)),
    fid: signupFloor?.fid ?? 0,
    floor: signupFloor ?? undefined,
    href: signupFloor ? `#thread-${bid}-${tid}-floor-${signupFloor.pid}` : `#thread-${bid}-${tid}`,
    pid: signupFloor?.pid ?? 0,
    threadId: `${bid}-${tid}`,
    tid,
  };
}

async function fetchLegacyThreadDetailForLatestActivitySignup(
  bid: number,
  tid: number,
  signal?: AbortSignal,
) {
  const firstPageResponse = await fetchLegacyThreadDetailQuery(bid, tid, {}, signal);
  const lastPage = Math.max(1, toNumber(firstPageResponse.floorsPage.pages, 1));

  return lastPage > 1
    ? fetchLegacyThreadDetailQuery(bid, tid, { page: lastPage }, signal)
    : firstPageResponse;
}

export async function updateLegacyThreadModeration(
  bid: number,
  tid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadModerationResponse> {
  const threadAction = stringValue(params.action) as LegacyBbsThreadModerationAction;
  const action = mapLegacyThreadModerationAction(threadAction);

  if (!action) {
    throw new LegacyBbsError('未知帖子管理操作', 400, 400);
  }

  const desiredActive = getOptionalLegacyBoolean(params.active);

  if (desiredActive !== null) {
    const currentState = await fetchLegacyThreadModerationState(bid, tid, signal);

    if (getLegacyThreadModerationStateValue(currentState, threadAction) === desiredActive) {
      return currentState;
    }
  }

  await callLegacyAsk({ ask: action, bid, tid }, signal);

  const nextState = await fetchLegacyThreadModerationState(bid, tid, signal);

  if (
    desiredActive !== null &&
    getLegacyThreadModerationStateValue(nextState, threadAction) !== desiredActive
  ) {
    throw new LegacyBbsError('帖子管理操作未生效，请刷新后重试。', 500, 500);
  }

  return nextState;
}

export async function deleteLegacyThread(
  bid: number,
  tid: number,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadModerationResponse> {
  await callLegacyAsk({ ask: 'delete', bid, pid: 0, tid }, signal);

  return {
    bid,
    deleted: true,
    tid,
  };
}

export async function moveLegacyThread(
  bid: number,
  tid: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadMoveResponse> {
  const toBid = toNumber(params.to ?? params.toBid);

  if (bid <= 0 || tid <= 0 || toBid <= 0) {
    throw new LegacyBbsError('缺少移动板块参数', 400, 400);
  }

  if (bid === toBid) {
    throw new LegacyBbsError('目标板块不能与当前板块相同', 400, 400);
  }

  const rows = await callLegacyAsk({ ask: 'move', bid, tid, to: toBid }, signal);
  const response = rows[0];
  const nextBid = toNumber(response?.bid);
  const nextTid = toNumber(response?.tid);

  if (nextBid <= 0 || nextTid <= 0) {
    throw new LegacyBbsError('移动成功返回缺少新主题编号', 500, 500);
  }

  return {
    bid: nextBid,
    fromBid: bid,
    fromTid: tid,
    tid: nextTid,
  };
}

export async function deleteLegacyFloor(
  bid: number,
  tid: number,
  pid: number,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadModerationResponse> {
  await callLegacyAsk({ ask: 'delete', bid, pid, tid }, signal);

  return {
    bid,
    floorDeleted: true,
    pid,
    tid,
  };
}

export async function deleteLegacyNestedReply(
  bid: number,
  tid: number,
  nestedReplyId: number,
  params: LegacyRequestBody,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadModerationResponse> {
  await callLegacyAsk({
    ask: 'lzl',
    fid: params.fid,
    lzlid: nestedReplyId,
    method: 'delete',
  }, signal);

  return {
    bid,
    nestedReplyDeleted: true,
    tid,
  };
}

async function fetchLegacyFloor(
  bid: number,
  tid: number,
  pid: number,
  signal?: AbortSignal,
): Promise<LegacyBbsFloor> {
  const rows = await callLegacyAsk({ bid, pid, tid }, signal);
  const row = rows.find((candidate) => toNumber(candidate.pid) === pid) ?? rows[0];

  if (!row) {
    throw new LegacyBbsError('楼层不存在', 404, 404);
  }

  const floor = await enrichLegacyFloorNestedReplies(mapLegacyFloor(row), signal);

  return (await hydrateLegacyFloorsSignatures([floor], signal))[0] ?? floor;
}

async function enrichLegacyFloorNestedReplies(
  floor: LegacyBbsFloor,
  signal?: AbortSignal,
): Promise<LegacyBbsFloor> {
  if (floor.nestedReplies.length > 0) {
    return floor;
  }

  if (floor.fid <= 0 || floor.nestedReplyCount <= 0) {
    return floor;
  }

  const rows = await callOptionalLegacyAsk({ ask: 'lzl', fid: floor.fid, method: 'ask' }, signal);
  const nestedReplies = rows
    .map(mapLegacyNestedReply)
    .filter((reply) => reply.id > 0);

  return {
    ...floor,
    nestedReplies,
  };
}

async function fetchLegacyThreadModerationState(
  bid: number,
  tid: number,
  signal?: AbortSignal,
): Promise<LegacyBbsThreadModerationResponse> {
  const [rows, globalTopRows] = await Promise.all([
    callLegacyAsk({ ask: 'tidinfo', bid, tid }, signal),
    callOptionalLegacyAsk({ ask: 'global_top' }, signal),
  ]);
  const row = rows[0];

  if (!row) {
    throw new LegacyBbsError('主题不存在', 404, 404);
  }

  return {
    bid,
    digest: toNumber(row.extr) > 0,
    globalPinned: toNumber(row.global_top) > 0 || globalTopRows.some((item) =>
      toNumber(item.bid) === bid && toNumber(item.tid) === tid
    ),
    locked: toNumber(row.locked) > 0,
    tid,
    top: toNumber(row.top) > 0,
  };
}

function getLegacyThreadModerationStateValue(
  state: LegacyBbsThreadModerationResponse,
  action: LegacyBbsThreadModerationAction,
) {
  if (action === 'digest') {
    return Boolean(state.digest);
  }

  if (action === 'globalPinned') {
    return Boolean(state.globalPinned);
  }

  if (action === 'locked') {
    return Boolean(state.locked);
  }

  return Boolean(state.top);
}

function getOptionalLegacyBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return value === true || value === 1 || value === '1' || value === 'true';
}

function mapLegacyThreadModerationAction(action: string): LegacyBbsUnifiedThreadAction | '' {
  if (action === 'pinned') {
    return 'top';
  }

  if (action === 'digest') {
    return 'extr';
  }

  if (action === 'locked') {
    return 'lock';
  }

  if (action === 'globalPinned') {
    return 'global_top_action';
  }

  return '';
}
