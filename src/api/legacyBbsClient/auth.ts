import { LegacyBbsError } from './errors';
import { mapLegacyViewer, mapMinimalViewer, isSameLegacyUsername } from './mappers';
import { writeLegacyTokenCookie } from './authSession';
import { callOptionalLegacyCurrentUser } from './currentUser';
import { fetchLegacyXmlUserProfile } from './legacyXmlProfile';
import { callLegacyAsk } from './transport';
import type { LegacyBbsAuthResponse, LegacyBbsViewer, LegacyRequestBody } from './types';
import { stringValue } from './utils';

export async function loginWithLegacyApi(params: LegacyRequestBody, signal?: AbortSignal) {
  const username = stringValue(params.username).trim();
  const password = stringValue(params.passwordHash || params.password);

  if (!username || !password) {
    throw new LegacyBbsError('用户名和密码不能为空', 400, 400);
  }

  const rows = await callLegacyAsk(
    {
      ask: 'login',
      browser: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      onlinetype: 'web',
      password,
      username,
    },
    { endpoint: 'unified', signal },
  );
  const loginRow = rows[0] ?? {};
  const sessionUsername = stringValue(loginRow.username || username).trim() || username;
  const token = stringValue(loginRow.token);
  if (token) {
    writeLegacyTokenCookie(token);
  }

  const viewer = await fetchSessionViewer(sessionUsername, signal);

  return {
    token,
    viewer,
  };
}

export async function registerWithLegacyApi(params: LegacyRequestBody, signal?: AbortSignal): Promise<LegacyBbsAuthResponse> {
  const username = stringValue(params.username).trim();
  const password = stringValue(params.passwordHash || params.password);
  const captcha = stringValue(params.captcha).trim();

  if (!username || !password || !captcha) {
    throw new LegacyBbsError('请填写 ID、密码和验证码', 400, 400);
  }

  const rows = await callLegacyAsk(
    {
      ask: 'register',
      browser: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      captcha,
      hobby: stringValue(params.hobby),
      icon: stringValue(params.icon),
      intro: stringValue(params.intro),
      mail: stringValue(params.mail || params.email),
      onlinetype: 'web',
      password,
      place: stringValue(params.place),
      qq: stringValue(params.qq),
      sex: stringValue(params.sex),
      sig1: stringValue(params.sig1),
      sig2: stringValue(params.sig2),
      sig3: stringValue(params.sig3),
      username,
    },
    { endpoint: 'unified', signal },
  );
  const registerRow = rows[0] ?? {};
  const sessionUsername = stringValue(registerRow.username || username).trim() || username;
  const token = stringValue(registerRow.token);
  if (token) {
    writeLegacyTokenCookie(token);
  }

  const viewer = await fetchSessionViewer(sessionUsername, signal);

  return {
    token,
    viewer,
  };
}

async function fetchSessionViewer(username: string, signal?: AbortSignal): Promise<LegacyBbsViewer> {
  const [viewerRows, profileViewer] = await Promise.all([
    callOptionalLegacyCurrentUser(signal),
    fetchLegacyXmlUserProfile(username, signal).catch(() => null),
  ]);
  const currentViewer = mapLegacyViewer(viewerRows[0]);

  if (
    currentViewer &&
    profileViewer &&
    isSameLegacyUsername(currentViewer.username, username) &&
    isSameLegacyUsername(profileViewer.username, username)
  ) {
    return {
      ...currentViewer,
      ...profileViewer,
    };
  }

  if (profileViewer && isSameLegacyUsername(profileViewer.username, username)) {
    return profileViewer;
  }

  if (currentViewer && isSameLegacyUsername(currentViewer.username, username)) {
    return currentViewer;
  }

  return mapMinimalViewer(username);
}
