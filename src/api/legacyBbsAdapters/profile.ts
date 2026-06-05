import type { PublicProfile } from '../../types/publicProfile';
import type { ProfileField, UserCenterData, UserCenterRecords, UserRecord } from '../../types/userCenter';
import { getBoardPath } from '../../utils/boardRoutes';
import { getLegacySignatureFloorReferenceHref } from '../../utils/legacySignature';
import { getPublicProfilePath } from '../../utils/userRoutes';
import type { LegacyBbsUserCenterRecord, LegacyBbsUserCenterResponse, LegacyBbsPublicProfileResponse } from '../legacyBbsClient';
import {
  formatNullableUserCenterStat,
  formatUserCenterLastSeen,
  formatUserCenterProfileDate,
  formatUserCenterRating,
  getBoardName,
} from './shared';

export function adaptLegacyBbsUserCenter(data: LegacyBbsUserCenterResponse): UserCenterData {
  return {
    avatarSrc: data.profile.avatar,
    details: adaptUserCenterProfileDetails(data.profile.details),
    intro: data.profile.intro,
    rating: formatUserCenterRating(data.profile.star),
    records: adaptLegacyBbsUserCenterRecords(data.records),
    registeredAt: formatUserCenterProfileDate(data.profile.registeredAt),
    stats: [
      { label: '发帖数', value: data.profile.stats.posts },
      { label: '签到数', value: data.profile.stats.checkins },
      { label: '上次在线', value: formatUserCenterLastSeen(data.profile.lastSeenAt) },
      { label: '权限值', value: data.profile.rights },
      { label: '回复数', value: data.profile.stats.replies },
      { label: '灌水数', value: data.profile.stats.water },
      { label: '注册时间', value: formatUserCenterProfileDate(data.profile.registeredAt) },
      { label: '精品数', value: formatNullableUserCenterStat(data.profile.stats.digests) },
    ],
    userId: data.profile.username,
  };
}

export function adaptLegacyBbsUserCenterRecords(
  records: LegacyBbsUserCenterResponse['records'],
): UserCenterRecords {
  return {
    activities: records.activities.map(adaptUserCenterRecord),
    bookmarks: records.bookmarks.map(adaptUserCenterRecord),
    drafts: [],
    posts: records.posts.map(adaptUserCenterRecord),
    replies: records.replies.map(adaptUserCenterRecord),
    signatures: records.signatures.map(adaptUserCenterSignatureRecord),
  };
}

export function adaptLegacyBbsPublicProfile(data: LegacyBbsPublicProfileResponse): PublicProfile {
  return {
    activities: data.records.activities.map(adaptUserCenterRecord),
    avatarSrc: data.profile.avatar,
    bookmarks: data.records.bookmarks.map(adaptUserCenterRecord),
    details: adaptUserCenterProfileDetails(data.profile.details).map(({ label, value }) => ({ label, value })),
    id: data.profile.username,
    intro: data.profile.intro,
    lastSeen: formatUserCenterLastSeen(data.profile.lastSeenAt),
    posts: data.records.posts.map(adaptUserCenterRecord),
    rating: formatUserCenterRating(data.profile.star),
    registeredAt: formatUserCenterProfileDate(data.profile.registeredAt),
    replies: data.records.replies.map(adaptUserCenterRecord),
    slug: data.profile.username,
    stats: [
      { label: '权限值', value: data.profile.rights },
      { label: '发帖', value: data.profile.stats.posts },
      { label: '回复', value: data.profile.stats.replies },
      { label: '注册', value: formatUserCenterProfileDate(data.profile.registeredAt) },
      { label: '精品', value: formatNullableUserCenterStat(data.profile.stats.digests) },
      { label: '签到', value: data.profile.stats.checkins },
      { label: '灌水', value: data.profile.stats.water },
    ],
  };
}

function adaptUserCenterProfileDetails(details: LegacyBbsUserCenterResponse['profile']['details']): ProfileField[] {
  return [
    { key: 'hobby', label: '爱好', value: details.hobby },
    { key: 'qq', label: 'QQ', value: details.qq },
    { key: 'email', label: 'Email', value: details.email },
    { key: 'location', label: '地点', value: details.location },
  ];
}

function adaptUserCenterRecord(record: LegacyBbsUserCenterRecord): UserRecord {
  const board = getBoardName(record.board) || `版面 ${record.bid}`;
  const author = record.author || '匿名用户';

  return {
    author,
    authorHref: getPublicProfilePath(author),
    board,
    boardHref: getBoardPath(board),
    bookmarks: record.favorites ?? undefined,
    date: record.time,
    excerpt: record.deleted ? '原主题已删除' : record.excerpt,
    href: record.href,
    replies: record.replies ?? undefined,
    status: record.status,
    time: record.time,
    title: record.title,
    views: record.views ?? undefined,
  };
}

function adaptUserCenterSignatureRecord(record: LegacyBbsUserCenterRecord): UserRecord {
  const content = record.content ?? '';

  return {
    board: '签名档',
    boardHref: '#signature-panel',
    content,
    date: record.time,
    excerpt: record.excerpt,
    href: record.href,
    sourceHref: getLegacySignatureFloorReferenceHref(content) || undefined,
    time: record.time,
    title: record.title,
  };
}
