import { getBbsNewApiUrl, getCapubbsLegacyJsonApiUrl } from '../bbsNewApiRoutes';
import { readLegacyToken, syncLegacyTokenCookie } from './authSession';
import { LegacyBbsError } from './errors';
import type { LegacyJsonEnvelope, LegacyRequestBody, LegacyRow } from './types';
import { isAbortError, isRecord } from './utils';

type LegacyAskEndpoint = 'unified' | 'legacy-json';

type LegacyAskOptions = {
  endpoint?: LegacyAskEndpoint;
  includeToken?: boolean;
  signal?: AbortSignal;
};

type NormalizedLegacyAskOptions = {
  endpoint: LegacyAskEndpoint;
  includeToken: boolean;
  signal?: AbortSignal;
};

export async function callOptionalLegacyAsk(
  params: LegacyRequestBody,
  signalOrOptions?: AbortSignal | LegacyAskOptions,
) {
  try {
    return await callLegacyAsk(params, signalOrOptions);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return [];
  }
}

export async function callLegacyAsk(
  params: LegacyRequestBody,
  signalOrOptions?: AbortSignal | LegacyAskOptions,
) {
  const options = normalizeLegacyAskOptions(signalOrOptions);

  if (options.includeToken) {
    syncLegacyTokenCookie();
  }

  const response = await fetch(getLegacyAskEndpointUrl(options.endpoint), {
    body: encodeLegacyParams(params, options.includeToken),
    credentials: options.includeToken ? 'include' : 'omit',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    method: 'POST',
    signal: options.signal,
  });
  const payload = await readLegacyEnvelope(response);

  if (payload.code !== 0) {
    throw new LegacyBbsError(payload.msg ?? payload.message ?? '旧接口请求失败', response.status, payload.code);
  }

  return normalizeLegacyRows(payload.data);
}

function normalizeLegacyRows(data: LegacyJsonEnvelope['data']): LegacyRow[] {
  if (Array.isArray(data)) {
    return data;
  }

  return isRecord(data) ? [data] : [];
}

async function readLegacyEnvelope(response: Response): Promise<LegacyJsonEnvelope> {
  try {
    const payload = (await response.json()) as LegacyJsonEnvelope;

    if (!payload || typeof payload.code !== 'number') {
      throw new Error('Invalid legacy API envelope');
    }

    if (!response.ok && payload.code === 0) {
      throw new LegacyBbsError(response.statusText || '旧接口请求失败', response.status, response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof LegacyBbsError) {
      throw error;
    }

    throw new LegacyBbsError(response.statusText || '旧接口响应不是有效 JSON', response.status, response.status || 500);
  }
}

function encodeLegacyParams(params: LegacyRequestBody, includeToken: boolean) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });

  if (includeToken && !body.has('token')) {
    const token = readLegacyToken();

    if (token) {
      body.set('token', token);
    }
  }

  return body;
}

function normalizeLegacyAskOptions(signalOrOptions?: AbortSignal | LegacyAskOptions): NormalizedLegacyAskOptions {
  if (signalOrOptions && 'aborted' in signalOrOptions) {
    return {
      endpoint: 'unified',
      includeToken: true,
      signal: signalOrOptions,
    };
  }

  return {
    endpoint: signalOrOptions?.endpoint ?? 'unified',
    includeToken: signalOrOptions?.includeToken ?? true,
    signal: signalOrOptions?.signal,
  };
}

function getLegacyAskEndpointUrl(endpoint: LegacyAskEndpoint) {
  return endpoint === 'legacy-json' ? getCapubbsLegacyJsonApiUrl() : getBbsNewApiUrl('legacy/');
}
