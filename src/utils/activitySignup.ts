import type { ThreadActivitySignupQuestion, ThreadDetail, ThreadFloor } from '../types/forum';

export const ACTIVITY_SIGNUP_BOARD_NAME = '车协工作区';
const activitySignupBoardNames = new Set([ACTIVITY_SIGNUP_BOARD_NAME, '活动交流']);

export type ActivitySignupValue = string | string[];
export type ActivitySignupValues = Record<string, ActivitySignupValue>;

export type ActivitySignupDraft = {
  bikeCondition: string;
  group: string;
  meetPoint: string;
  note: string;
  supportNeed: string;
  values: ActivitySignupValues;
};

export type ActivitySignupQuestionType =
  | 'id'
  | 'checkbox'
  | 'radio'
  | 'multiSelect'
  | 'text'
  | 'number'
  | 'phone'
  | 'email'
  | 'textarea';

export type ActivitySignupQuestion = {
  id: string;
  label: string;
  max?: number;
  min?: number;
  options?: string[];
  required: boolean;
  type: ActivitySignupQuestionType;
};

export type ActivityCoverImage = {
  dataUrl: string;
  meta: string;
  name: string;
};

export type ActivitySignupRow = {
  draft: ActivitySignupDraft;
  floor: ThreadFloor;
  missingFields: string[];
  status: '有效' | '异常' | '已取消';
};

export const activitySignupGroups = ['轻松组', '进阶组', '保障志愿'];

export const activitySignupQuestionTypeOptions: Array<{ label: string; value: ActivitySignupQuestionType }> = [
  { label: 'ID', value: 'id' },
  { label: '勾选', value: 'checkbox' },
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'multiSelect' },
  { label: '填空', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '电话', value: 'phone' },
  { label: '邮箱', value: 'email' },
  { label: '多行文本', value: 'textarea' },
];

export const emptyActivitySignupDraft: ActivitySignupDraft = {
  bikeCondition: '',
  group: activitySignupGroups[0],
  meetPoint: '',
  note: '',
  supportNeed: '',
  values: {},
};

export const defaultActivitySignupQuestions: ActivitySignupQuestion[] = [
  {
    id: 'name',
    label: '姓名',
    required: true,
    type: 'text',
  },
  {
    id: 'userId',
    label: 'ID',
    required: true,
    type: 'id',
  },
  {
    id: 'gender',
    label: '性别',
    options: ['男', '女'],
    required: true,
    type: 'radio',
  },
  {
    id: 'phone',
    label: '联系电话',
    required: true,
    type: 'phone',
  },
  {
    id: 'gradeDepartment',
    label: '年级院系',
    required: true,
    type: 'text',
  },
  {
    id: 'rolePreference',
    label: '职务意愿（可报职务：队医、队医助理、押后、押后助理、拉秘助理、摄影、社考；职务意愿可多选/排序，也可无职务意愿。）',
    required: false,
    type: 'text',
  },
  {
    id: 'acceptAdjustment',
    label: '是否接受调剂',
    options: ['是', '否'],
    required: true,
    type: 'radio',
  },
  {
    id: 'trainingCount',
    label: '参加过拉练的次数',
    required: false,
    type: 'text',
  },
  {
    id: 'hasMedicalQualification',
    label: '是否有队医资格',
    options: ['是', '否'],
    required: true,
    type: 'radio',
  },
  {
    id: 'hasSweepQualification',
    label: '是否有押后资格',
    options: ['是', '否'],
    required: true,
    type: 'radio',
  },
  {
    id: 'needsHelmet',
    label: '是否需要借头盔',
    options: ['是', '否'],
    required: true,
    type: 'radio',
  },
  {
    id: 'specialty',
    label: '特长',
    required: false,
    type: 'text',
  },
  {
    id: 'message',
    label: '想说的话',
    required: false,
    type: 'textarea',
  },
];

export function isActivitySignupThread(thread: ThreadDetail) {
  return thread.kind === 'activity' && activitySignupBoardNames.has(thread.board);
}

export function isActivitySignupQuestionChoiceType(type: ActivitySignupQuestionType) {
  return type === 'radio' || type === 'multiSelect';
}

export function normalizeActivitySignupQuestion<T extends ActivitySignupQuestion>(question: T): T {
  const normalizedQuestion = { ...question };

  if (normalizedQuestion.type === 'id') {
    normalizedQuestion.required = true;
  }

  if (isActivitySignupQuestionChoiceType(normalizedQuestion.type)) {
    normalizedQuestion.options =
      normalizedQuestion.options && normalizedQuestion.options.length > 0 ? normalizedQuestion.options : ['选项 1'];
  } else {
    delete normalizedQuestion.options;
  }

  if (normalizedQuestion.type !== 'number') {
    delete normalizedQuestion.min;
    delete normalizedQuestion.max;
  }

  return normalizedQuestion;
}

export function getActivitySignupQuestionTypeHint(type: ActivitySignupQuestionType) {
  switch (type) {
    case 'id':
      return '自动读取当前用户 ID，用户不用填写。';
    case 'checkbox':
      return '记录用户是否勾选。';
    case 'phone':
      return '提交时默认检查电话格式。';
    case 'email':
      return '提交时默认检查邮箱格式。';
    case 'text':
      return '普通单行文本。';
    case 'textarea':
      return '适合填写较长说明。';
    default:
      return '无需额外配置。';
  }
}

export function getEmptyActivitySignupDraft(
  questions: ThreadActivitySignupQuestion[] = [],
  currentUserId = '',
): ActivitySignupDraft {
  return {
    ...emptyActivitySignupDraft,
    values: questions.reduce<ActivitySignupValues>((values, question) => {
      values[question.id] = question.label.trim().toUpperCase() === 'ID' ? currentUserId : question.type === 'multiChoice' ? [] : '';

      return values;
    }, {}),
  };
}

export function getActivitySignupDraftFromFloor(
  floor?: ThreadFloor | null,
  questions: ThreadActivitySignupQuestion[] = [],
): ActivitySignupDraft | null {
  if (!floor) {
    return null;
  }

  if (questions.length > 0) {
    const values = questions.reduce<ActivitySignupValues>((result, question) => {
      const rawValue = getActivitySignupField(floor.content, question.label);

      if (!rawValue) {
        result[question.id] = question.type === 'multiChoice' ? [] : '';
        return result;
      }

      if (question.type === 'multiChoice') {
        const labels = rawValue.split(/[、,，]/).map((value) => value.trim()).filter(Boolean);
        result[question.id] = labels.map((label) => getActivitySignupQuestionOptionId(question, label)).filter(Boolean);
        return result;
      }

      if (question.type === 'choice') {
        result[question.id] = getActivitySignupQuestionOptionId(question, rawValue);
        return result;
      }

      result[question.id] = rawValue === '无' ? '' : rawValue;
      return result;
    }, {});

    return Object.values(values).some(hasActivitySignupValue)
      ? {
          ...emptyActivitySignupDraft,
          values,
        }
      : null;
  }

  const group = getActivitySignupField(floor.content, '报名组别');
  const meetPoint = getActivitySignupField(floor.content, '集合点');
  const bikeCondition = getActivitySignupField(floor.content, '车辆状态');

  if (!group && !meetPoint && !bikeCondition) {
    return null;
  }

  const supportNeed = getActivitySignupField(floor.content, '保障需求');
  const note = getActivitySignupField(floor.content, '备注');

  return {
    bikeCondition,
    group: activitySignupGroups.includes(group) ? group : activitySignupGroups[0],
    meetPoint,
    supportNeed: supportNeed === '无' ? '' : supportNeed,
    note: note === '无' ? '' : note,
    values: {},
  };
}

export function getActivitySignupField(content: string[], label: string) {
  const prefix = `${label}：`;
  const line = content.find((paragraph) => paragraph.startsWith(prefix));

  return line ? line.slice(prefix.length).trim() : '';
}

export function isCanceledActivitySignupFloor(floor: ThreadFloor) {
  return floor.content.some((paragraph) => paragraph === '报名状态：已取消');
}

export function formatActivitySignupContent(
  draft: ActivitySignupDraft,
  questions: ThreadActivitySignupQuestion[] = [],
) {
  if (questions.length > 0) {
    return questions.map((question) => `${question.label}：${formatActivitySignupQuestionValue(question, draft.values[question.id])}`);
  }

  return [
    `报名组别：${draft.group}`,
    `集合点：${draft.meetPoint.trim()}`,
    `车辆状态：${draft.bikeCondition.trim()}`,
    `保障需求：${draft.supportNeed.trim() || '无'}`,
    `备注：${draft.note.trim() || '无'}`,
  ];
}

export function getActivitySignupRows(thread: ThreadDetail) {
  return thread.floors
    .map((floor) => getActivitySignupRow(floor, thread.signupQuestions ?? []))
    .filter((row): row is ActivitySignupRow => row !== null);
}

export function getActivitySignupRow(
  floor: ThreadFloor,
  questions: ThreadActivitySignupQuestion[] = [],
): ActivitySignupRow | null {
  const draft = getActivitySignupDraftFromFloor(floor, questions);

  if (!draft) {
    return null;
  }

  const missingFields = questions.length > 0
    ? questions
        .filter((question) => question.required && !hasActivitySignupValue(draft.values[question.id]))
        .map((question) => question.label)
    : [
        draft.group.trim() ? '' : '报名组别',
        draft.meetPoint.trim() ? '' : '集合点',
        draft.bikeCondition.trim() ? '' : '车辆状态',
      ].filter(Boolean);
  const status = isCanceledActivitySignupFloor(floor)
    ? '已取消'
    : missingFields.length > 0
      ? '异常'
      : '有效';

  return {
    draft,
    floor,
    missingFields,
    status,
  };
}

export function hasActivitySignupValue(value: ActivitySignupValue | undefined) {
  return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
}

function getActivitySignupQuestionOptionId(question: ThreadActivitySignupQuestion, label: string) {
  const option = question.options?.find((candidate) => candidate.label === label || candidate.id === label);

  return option?.id ?? '';
}

function formatActivitySignupQuestionValue(question: ThreadActivitySignupQuestion, value: ActivitySignupValue | undefined) {
  if (!hasActivitySignupValue(value)) {
    return question.required ? '' : '无';
  }

  if (question.type === 'multiChoice') {
    return Array.isArray(value)
      ? value.map((optionId) => getActivitySignupQuestionOptionLabel(question, optionId)).filter(Boolean).join('、')
      : getActivitySignupQuestionOptionLabel(question, value ?? '');
  }

  if (question.type === 'choice' && typeof value === 'string') {
    return getActivitySignupQuestionOptionLabel(question, value);
  }

  return Array.isArray(value) ? value.join('、') : (value ?? '').trim();
}

function getActivitySignupQuestionOptionLabel(question: ThreadActivitySignupQuestion, optionId: string) {
  return question.options?.find((option) => option.id === optionId)?.label ?? optionId;
}
