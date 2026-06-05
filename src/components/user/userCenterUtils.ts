import type { ProfileField, ProfileFieldKey, UserCenterTab, UserRecordVariant } from '../../types/userCenter';

export function createProfileDraft(details: ProfileField[]) {
  return details.reduce<Record<ProfileFieldKey, string>>(
    (draft, item) => ({
      ...draft,
      [item.key]: item.value,
    }),
    {
      hobby: '',
      intro: '',
      qq: '',
      email: '',
      location: '',
    },
  );
}

export function getRecordVariant(tab: UserCenterTab): UserRecordVariant {
  if (tab === 'replies') {
    return 'reply';
  }

  if (tab === 'bookmarks') {
    return 'favorite';
  }

  if (tab === 'activities') {
    return 'activity';
  }

  if (tab === 'drafts') {
    return 'draft';
  }

  if (tab === 'signatures') {
    return 'signature';
  }

  return 'post';
}

export function isRecordInDateRange(date: string, startDate: string, endDate: string) {
  const recordTime = new Date(date).getTime();

  if (startDate) {
    const startTime = new Date(`${startDate}T00:00:00`).getTime();
    if (recordTime < startTime) {
      return false;
    }
  }

  if (endDate) {
    const endTime = new Date(`${endDate}T23:59:59.999`).getTime();
    if (recordTime > endTime) {
      return false;
    }
  }

  return true;
}
