import { getBbsNewApiUrl } from './bbsNewApiRoutes';

type LegacyParamValue = string | number | boolean | null | undefined;

type LegacyJsonEndpointOptions = {
  ignoreResponseBody?: boolean;
  ignoreResponseStatus?: boolean;
};

type LegacyBbsJsonResponse = {
  code?: number;
  count?: number;
  data?: unknown;
  message?: string;
  msg?: string;
  bid?: string | number;
  tid?: string | number;
};

export type LegacyPunishmentRecord = {
  id: string;
  username: string;
  name: string;
  reason: string;
  distance: string;
  addition: string;
  startDate: string;
  endDate: string;
  isEnd: boolean;
};

export type LegacyPunishmentDraft = {
  username: string;
  name: string;
  reason: string;
  distance: string;
  addition: string;
  startDate: string;
};

export class LegacyBbsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'LegacyBbsApiError';
    this.status = status;
  }
}

export async function legacyMoveThread({
  bid,
  tid,
  to,
}: {
  bid: number;
  tid: number;
  to: number;
}) {
  const payload = await legacyBbsJsonRequest({
    ask: 'move',
    bid,
    tid,
    to,
  });
  const nextBid = Number(payload.bid);
  const nextTid = Number(payload.tid);

  if (!Number.isFinite(nextBid) || !Number.isFinite(nextTid)) {
    throw new LegacyBbsApiError('挪版成功返回缺少新主题编号', 200);
  }

  return {
    bid: nextBid,
    tid: nextTid,
  };
}

export async function legacyAdminChangePassword(targetUsername: string, newPassword: string) {
  const payload = await legacyBbsJsonRequest({
    ask: 'admin_reset_password',
    target_username: targetUsername,
    new_password: newPassword,
  });

  return payload.msg ?? '密码已更新';
}

export async function legacyGetPunishmentRecords(
  options: {
    history?: boolean;
    year?: number;
  } = {},
  signal?: AbortSignal,
) {
  const params: Record<string, LegacyParamValue> = {};

  if (typeof options.year === 'number') {
    params.year = options.year;
  }

  if (typeof options.history === 'boolean') {
    params.history = options.history ? 1 : 0;
  }

  const payload = await legacyJsonEndpoint<{ result?: unknown[] }>('punishments/get/', params, signal);

  return (Array.isArray(payload.result) ? payload.result : []).map(normalizePunishmentRecord);
}

export async function legacyAddPunishmentRecord(draft: LegacyPunishmentDraft) {
  await legacyJsonEndpoint('punishments/add/', {
    action: 'add',
    addition: draft.addition,
    distance: draft.distance,
    name: draft.name,
    reason: draft.reason,
    start_date: draft.startDate,
    username: draft.username,
  }, undefined, { ignoreResponseBody: true, ignoreResponseStatus: true });
}

export async function legacyUpdatePunishmentRecord({
  action,
  endDate,
  punishmentId,
}: {
  action: 'cancel_finish' | 'delete' | 'finish';
  endDate?: string;
  punishmentId: string;
}) {
  await legacyJsonEndpoint('punishments/update/', {
    action,
    end_date: endDate,
    punishment_id: punishmentId,
  }, undefined, { ignoreResponseBody: true, ignoreResponseStatus: true });
}

async function legacyBbsJsonRequest(params: Record<string, LegacyParamValue>) {
  const payload = await legacyJsonEndpoint<LegacyBbsJsonResponse>('legacy/', params);

  if (typeof payload.code === 'number' && payload.code !== 0) {
    throw new LegacyBbsApiError(payload.msg ?? '旧接口请求失败', 200);
  }

  return normalizeLegacyBbsJsonPayload(payload);
}

async function legacyJsonEndpoint<T>(
  path: string,
  params: Record<string, LegacyParamValue>,
  signal?: AbortSignal,
  options: LegacyJsonEndpointOptions = {},
) {
  const response = await fetch(getBbsNewApiUrl(path), {
    body: encodeLegacyParams(params),
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    method: 'POST',
    signal,
  });

  if (!response.ok && !options.ignoreResponseStatus) {
    throw new LegacyBbsApiError(response.statusText || '旧接口请求失败', response.status);
  }

  if (options.ignoreResponseBody) {
    return {} as T;
  }

  const responseText = await response.text();
  const trimmedResponseText = responseText.trim();

  if (!trimmedResponseText) {
    throw new LegacyBbsApiError(
      response.ok
        ? '旧接口没有返回数据，请确认当前账号有权限或接口地址是否正确'
        : response.statusText || '旧接口请求失败',
      response.status,
    );
  }

  let payload: T & { code?: number; msg?: string; message?: string };

  try {
    payload = JSON.parse(trimmedResponseText) as T & { code?: number; msg?: string; message?: string };
  } catch {
    throw new LegacyBbsApiError('旧接口返回格式不是 JSON，请检查接口地址或登录权限', response.status);
  }

  if (typeof payload.code === 'number' && payload.code !== 0) {
    throw new LegacyBbsApiError(payload.msg ?? payload.message ?? '旧接口请求失败', response.status);
  }

  return payload;
}

function encodeLegacyParams(params: Record<string, LegacyParamValue>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    body.set(key, String(value));
  });

  return body;
}

function normalizeLegacyBbsJsonPayload(payload: LegacyBbsJsonResponse) {
  const data = payload.data;

  if (Array.isArray(data) && isRecordObject(data[0])) {
    return {
      ...data[0],
      msg: payload.msg ?? payload.message ?? String(data[0].msg ?? ''),
    };
  }

  if (isRecordObject(data)) {
    return {
      ...data,
      msg: payload.msg ?? payload.message,
    };
  }

  return payload;
}

function normalizePunishmentRecord(rawRecord: unknown): LegacyPunishmentRecord {
  const record = isRecordObject(rawRecord) ? rawRecord : {};

  return {
    addition: String(record.addition ?? '0'),
    distance: String(record.distance ?? ''),
    endDate: String(record.end_date ?? ''),
    id: String(record.id ?? ''),
    isEnd: String(record.is_end ?? '0') === '1',
    name: String(record.name ?? ''),
    reason: String(record.reason ?? ''),
    startDate: String(record.start_date ?? ''),
    username: String(record.username ?? ''),
  };
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
