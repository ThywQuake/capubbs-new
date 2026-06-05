import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Ban,
  Download,
  Eye,
  FileText,
  Plus,
  Save,
  Settings,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLegacyBbsThreadDetail } from '../api/LegacyBbsDataContext';
import { ActivityCoverImageField } from '../components/activity/ActivityCoverImageField';
import { activities } from '../data/forumHome';
import { getThreadDetail } from '../data/threadDetails';
import type { ThreadActivitySignupQuestion, ThreadDetail } from '../types/forum';
import {
  ACTIVITY_SIGNUP_BOARD_NAME,
  activitySignupQuestionTypeOptions,
  defaultActivitySignupQuestions,
  getActivitySignupQuestionTypeHint,
  getActivitySignupRows,
  isActivitySignupQuestionChoiceType,
  isActivitySignupThread,
  normalizeActivitySignupQuestion,
  type ActivityCoverImage,
  type ActivitySignupQuestion,
  type ActivitySignupQuestionType,
  type ActivitySignupRow,
} from '../utils/activitySignup';
import { joinClassNames } from '../utils/classNames';
import { formatPostTimestamp } from '../utils/formatPostTimestamp';
import { getPublishedThreadSignupSettings, saveActivitySignupSettings } from '../utils/threadComposeStorage';
import { getThreadPath } from '../utils/threadRoutes';

type ActivityAdminRouteProps = {
  threadId: string | null;
};

type ActivityAdminTab = 'questions' | 'data';
type AdminMetricTone = 'danger' | 'default' | 'success' | 'warning';
type EditableActivitySignupQuestion = ActivitySignupQuestion & {
  localId: string;
};

export function ActivityAdminRoute({ threadId }: ActivityAdminRouteProps) {
  const legacyThreadState = useLegacyBbsThreadDetail(threadId);
  const staticThread = getThreadDetail(threadId);
  const thread = legacyThreadState.thread ?? staticThread;
  const isLegacyThreadLoading = legacyThreadState.isLegacyThreadId && legacyThreadState.status === 'loading';
  const savedSignupSettings = useMemo(() => (threadId ? getPublishedThreadSignupSettings(threadId) : null), [threadId]);
  const initialQuestions = useMemo(
    () => getEditableActivitySignupQuestions(savedSignupSettings?.questions ?? defaultActivitySignupQuestions),
    [savedSignupSettings],
  );
  const settingQuestions = useMemo(
    () => (
      thread?.signupQuestions && thread.signupQuestions.length > 0
        ? getEditableThreadActivitySignupQuestions(thread.signupQuestions)
        : initialQuestions
    ),
    [initialQuestions, thread?.signupQuestions],
  );
  const [activeTab, setActiveTab] = useState<ActivityAdminTab>('questions');
  const [isSignupOpen, setIsSignupOpen] = useState(true);
  const [isCloseSignupConfirmOpen, setIsCloseSignupConfirmOpen] = useState(false);
  const [questions, setQuestions] = useState<EditableActivitySignupQuestion[]>(settingQuestions);
  const [activityCoverImage, setActivityCoverImage] = useState<ActivityCoverImage | null>(savedSignupSettings?.coverImage ?? null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const signupRows = useMemo(() => (thread ? getActivitySignupRows(thread) : []), [thread]);
  const selectedRow = signupRows.find((row) => row.floor.id === selectedRowId) ?? signupRows[0] ?? null;

  useEffect(() => {
    setQuestions(settingQuestions);
  }, [settingQuestions]);

  useEffect(() => {
    setActivityCoverImage(savedSignupSettings?.coverImage ?? null);
  }, [savedSignupSettings]);

  if (isLegacyThreadLoading) {
    return (
      <ActivityAdminNotice
        title="正在读取报名后台"
        description="正在从真实活动帖接口读取报名表和报名楼层。"
      />
    );
  }

  if (!thread) {
    return (
      <ActivityAdminNotice
        title="没有找到活动帖"
        description={threadId ? `当前地址中的「${threadId}」还没有配置帖子详情。` : '当前地址缺少帖子编号。'}
      />
    );
  }

  if (!isActivitySignupThread(thread)) {
    return (
      <ActivityAdminNotice
        title="这不是活动报名帖"
        description={`活动后台只处理${ACTIVITY_SIGNUP_BOARD_NAME}中的活动报名帖。`}
        backHref={getThreadPath(thread.id)}
      />
    );
  }

  if (!thread.canManageActivitySignup) {
    return (
      <ActivityAdminNotice
        title="暂时不能管理这个报名帖"
        description="报名后台只对当前活动帖的帖主开放。"
        backHref={getThreadPath(thread.id)}
      />
    );
  }

  const validSignupCount = signupRows.filter((row) => row.status === '有效').length;
  const canceledSignupCount = signupRows.filter((row) => row.status === '已取消').length;
  const signupStartTime = formatPostTimestamp(thread.createdAt);
  const signupDeadline = getActivitySignupDeadline(thread);
  const signupStatus = getActivitySignupStatus(isSignupOpen, thread.createdAt, signupDeadline);
  const updateQuestion = (localId: string, patch: Partial<ActivitySignupQuestion>) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.localId === localId
          ? normalizeActivitySignupQuestion({
              ...question,
              ...patch,
            })
          : question,
      ),
    );
  };
  const addQuestionOption = (localId: string) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.localId === localId
          ? {
              ...question,
              options: [...(question.options ?? []), `选项 ${(question.options?.length ?? 0) + 1}`],
            }
          : question,
      ),
    );
  };
  const removeQuestionOption = (localId: string, optionIndex: number) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.localId === localId
          ? {
              ...question,
              options: (question.options ?? []).filter((_option, index) => index !== optionIndex),
            }
          : question,
      ),
    );
  };
  const updateQuestionOption = (localId: string, optionIndex: number, value: string) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.localId === localId
          ? {
              ...question,
              options: (question.options ?? []).map((option, index) => (index === optionIndex ? value : option)),
            }
          : question,
      ),
    );
  };
  const updateQuestionNumberLimit = (localId: string, field: 'max' | 'min', value: string) => {
    updateQuestion(localId, {
      [field]: value.trim() === '' ? undefined : Number(value),
    });
  };
  const addQuestion = () => {
    setQuestions((currentQuestions) => [
      ...currentQuestions,
      {
        id: 'note',
        label: `自定义字段 ${currentQuestions.length + 1}`,
        localId: `custom-${Date.now()}-${currentQuestions.length}`,
        required: false,
        type: 'text',
      },
    ]);
  };
  const removeQuestion = (questionIndex: number) => {
    setQuestions((currentQuestions) => currentQuestions.filter((_question, index) => index !== questionIndex));
  };
  const reorderQuestion = (fromIndex: number, toIndex: number) => {
    setQuestions((currentQuestions) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return currentQuestions;
      }

      const nextQuestions = [...currentQuestions];
      const [movedQuestion] = nextQuestions.splice(fromIndex, 1);

      if (!movedQuestion) {
        return currentQuestions;
      }

      nextQuestions.splice(toIndex, 0, movedQuestion);

      return nextQuestions;
    });
  };
  const exportCsv = () => {
    downloadSignupCsv(thread, signupRows);
  };
  const handleSignupOpenChange = () => {
    if (isSignupOpen) {
      setIsCloseSignupConfirmOpen(true);
      return;
    }

    setIsSignupOpen(true);
  };
  const confirmCloseSignup = () => {
    setIsSignupOpen(false);
    setIsCloseSignupConfirmOpen(false);
  };

  return (
    <article className="space-y-4">
      <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
        <div className="border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={getThreadPath(thread.id)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-3 text-sm font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <ArrowLeft size={16} />
              查看原帖
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight text-[#385772] dark:text-white">
                报名后台管理：{thread.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-5 sm:p-5">
          <AdminMetric label="报名状态" tone={signupStatus.tone} value={signupStatus.label} />
          <AdminMetric label="开始时间" value={signupStartTime} />
          <AdminMetric label="截止时间" value={signupDeadline} />
          <AdminMetric label="有效报名" value={validSignupCount} />
          <AdminMetric label="已取消" value={canceledSignupCount} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/80 px-4 py-3 dark:border-white/10 sm:px-5">
          <AdminTabButton active={activeTab === 'questions'} icon={<Settings size={15} />} label="问卷设置" onClick={() => setActiveTab('questions')} />
          <AdminTabButton active={activeTab === 'data'} icon={<FileText size={15} />} label="报名数据" onClick={() => setActiveTab('data')} />
          <button
            type="button"
            onClick={handleSignupOpenChange}
            className={joinClassNames(
              'ml-0 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 sm:ml-auto',
              isSignupOpen
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-700 dark:border-emerald-100/15 dark:bg-emerald-300/10 dark:text-emerald-100',
            )}
          >
            {isSignupOpen ? '关闭报名' : '重新开放'}
          </button>
        </div>
      </section>

      <CloseSignupConfirmDialog
        open={isCloseSignupConfirmOpen}
        onCancel={() => setIsCloseSignupConfirmOpen(false)}
        onConfirm={confirmCloseSignup}
      />

      {activeTab === 'questions' ? (
        <QuestionManager
          coverImage={activityCoverImage}
          questions={questions}
          defaultClosesAt={savedSignupSettings?.closesAt || toDateTimeLocalValueFromActivityDeadline(signupDeadline)}
          defaultOpensAt={savedSignupSettings?.opensAt || toDateTimeLocalValueFromIso(thread.createdAt)}
          onAddOption={addQuestionOption}
          onAddQuestion={addQuestion}
          onCoverImageChange={setActivityCoverImage}
          onRemoveOption={removeQuestionOption}
          onRemoveQuestion={removeQuestion}
          onReorderQuestion={reorderQuestion}
          onSaveSettings={(opensAt, closesAt) => {
            if (legacyThreadState.isLegacyThreadId) {
              return '真实设置保存未接入';
            }

            saveActivitySignupSettings(thread.id, {
              closesAt,
              coverImage: activityCoverImage,
              opensAt,
              questions,
            });

            return undefined;
          }}
          onUpdateNumberLimit={updateQuestionNumberLimit}
          onUpdateOption={updateQuestionOption}
          onUpdateQuestion={updateQuestion}
        />
      ) : (
        <SignupDataTable
          questions={thread.signupQuestions ?? []}
          rows={signupRows}
          selectedRow={selectedRow}
          onExportCsv={exportCsv}
          onSelectRow={(row) => setSelectedRowId(row.floor.id)}
        />
      )}
    </article>
  );
}

function QuestionManager({
  coverImage,
  defaultClosesAt,
  defaultOpensAt,
  onAddOption,
  onAddQuestion,
  onCoverImageChange,
  onRemoveOption,
  onRemoveQuestion,
  onReorderQuestion,
  onSaveSettings,
  onUpdateNumberLimit,
  onUpdateOption,
  onUpdateQuestion,
  questions,
}: {
  coverImage: ActivityCoverImage | null;
  defaultClosesAt: string;
  defaultOpensAt: string;
  onAddOption: (localId: string) => void;
  onAddQuestion: () => void;
  onCoverImageChange: (coverImage: ActivityCoverImage | null) => void;
  onRemoveOption: (localId: string, optionIndex: number) => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onReorderQuestion: (fromIndex: number, toIndex: number) => void;
  onSaveSettings: (opensAt: string, closesAt: string) => string | undefined;
  onUpdateNumberLimit: (localId: string, field: 'max' | 'min', value: string) => void;
  onUpdateOption: (localId: string, optionIndex: number, value: string) => void;
  onUpdateQuestion: (localId: string, patch: Partial<ActivitySignupQuestion>) => void;
  questions: EditableActivitySignupQuestion[];
}) {
  const [opensAt, setOpensAt] = useState(defaultOpensAt);
  const [closesAt, setClosesAt] = useState(defaultClosesAt);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setOpensAt(defaultOpensAt);
  }, [defaultOpensAt]);

  useEffect(() => {
    setClosesAt(defaultClosesAt);
  }, [defaultClosesAt]);

  const handleSave = () => {
    setSavedMessage(onSaveSettings(opensAt, closesAt) ?? '已保存');
  };

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-white/10">
        <h2 className="text-base font-bold text-[#385772] dark:text-white">问卷设置</h2>
        <div className="flex items-center gap-3">
          {savedMessage ? <span className="text-xs font-bold text-emerald-700 dark:text-emerald-100">{savedMessage}</span> : null}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
          >
            <Save size={15} />
            保存
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-2">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            问卷开放时间
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            问卷截止时间
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            />
          </label>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white/35 p-3 dark:border-white/10 dark:bg-white/[0.025]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#385772] dark:text-white">问卷格式</h3>
            <button
              type="button"
              onClick={onAddQuestion}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
            >
              <Plus size={15} />
              添加字段
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            {questions.map((question, index) => (
              <div
                key={question.localId}
                className="grid gap-3 rounded-lg border border-zinc-200 bg-white/70 p-3 transition dark:border-white/10 dark:bg-zinc-900/50 lg:grid-cols-[2.75rem_minmax(0,1.1fr)_9rem_8rem_minmax(0,1.25fr)_auto]"
              >
                <div className="flex items-end gap-1 self-end lg:flex-col">
                  <button
                    type="button"
                    aria-label={`上移「${question.label || `字段 ${index + 1}`}」`}
                    title="上移"
                    onClick={() => onReorderQuestion(index, index - 1)}
                    disabled={index === 0}
                    className="inline-flex h-8 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-white"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移「${question.label || `字段 ${index + 1}`}」`}
                    title="下移"
                    onClick={() => onReorderQuestion(index, index + 1)}
                    disabled={index === questions.length - 1}
                    className="inline-flex h-8 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-white"
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  字段名
                  <input
                    value={question.label}
                    onChange={(event) => onUpdateQuestion(question.localId, { label: event.target.value })}
                    className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  题型
                  <select
                    value={question.type}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      onUpdateQuestion(question.localId, { type: event.target.value as ActivitySignupQuestionType })
                    }
                    className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  >
                    {activitySignupQuestionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex h-full items-end gap-2 pb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={question.required}
                    disabled={question.type === 'id'}
                    onChange={(event) => onUpdateQuestion(question.localId, { required: event.target.checked })}
                    className="h-4 w-4 accent-[#385772] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  必填
                </label>
                <QuestionRuleEditor
                  question={question}
                  onAddOption={onAddOption}
                  onRemoveOption={onRemoveOption}
                  onUpdateNumberLimit={onUpdateNumberLimit}
                  onUpdateOption={onUpdateOption}
                />
                <button
                  type="button"
                  onClick={() => onRemoveQuestion(index)}
                  disabled={questions.length <= 1}
                  className="inline-flex h-10 items-center justify-center self-end rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <ActivityCoverImageField value={coverImage} onChange={onCoverImageChange} />
      </div>
    </section>
  );
}

function QuestionRuleEditor({
  onAddOption,
  onRemoveOption,
  onUpdateNumberLimit,
  onUpdateOption,
  question,
}: {
  onAddOption: (localId: string) => void;
  onRemoveOption: (localId: string, optionIndex: number) => void;
  onUpdateNumberLimit: (localId: string, field: 'max' | 'min', value: string) => void;
  onUpdateOption: (localId: string, optionIndex: number, value: string) => void;
  question: EditableActivitySignupQuestion;
}) {
  if (isActivitySignupQuestionChoiceType(question.type)) {
    const options = question.options ?? [];

    return (
      <div className="min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        选项
        <div className="mt-2 grid gap-2">
          {options.map((option, optionIndex) => (
            <div key={`${question.localId}-${optionIndex}`} className="flex min-w-0 items-center gap-2">
              <input
                value={option}
                onChange={(event) => onUpdateOption(question.localId, optionIndex, event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => onRemoveOption(question.localId, optionIndex)}
                disabled={options.length <= 1}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onAddOption(question.localId)}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <Plus size={14} />
            添加选项
          </button>
        </div>
      </div>
    );
  }

  if (question.type === 'number') {
    const hasInvalidRange =
      typeof question.min === 'number' && typeof question.max === 'number' && question.min > question.max;

    return (
      <div className="min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        数字范围
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label>
            下限
            <input
              type="number"
              value={question.min ?? ''}
              onChange={(event) => onUpdateNumberLimit(question.localId, 'min', event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            />
          </label>
          <label>
            上限
            <input
              type="number"
              value={question.max ?? ''}
              onChange={(event) => onUpdateNumberLimit(question.localId, 'max', event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            />
          </label>
        </div>
        {hasInvalidRange ? <p className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-100">下限不能大于上限</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
      规则
      <p className="mt-2 rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm leading-5 text-zinc-600 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
        {getActivitySignupQuestionTypeHint(question.type)}
      </p>
    </div>
  );
}

function CloseSignupConfirmDialog({
  onCancel,
  onConfirm,
  open,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-signup-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 dark:bg-black/80"
      onClick={onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),26rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-100">
            <Ban size={17} />
          </span>
          <h2 id="close-signup-dialog-title" className="text-base font-semibold">
            确认关闭报名？
          </h2>
        </header>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            关闭后，用户将不能继续提交或修改报名。已有报名数据仍会保留在报名数据表中。
          </p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-md border border-rose-300 bg-rose-600 px-3 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-900 dark:bg-rose-300 dark:text-zinc-950 dark:hover:bg-rose-200 dark:focus-visible:ring-rose-200"
          >
            确认关闭
          </button>
        </footer>
      </section>
    </div>
  );
}

function SignupDataTable({
  onExportCsv,
  onSelectRow,
  questions,
  rows,
  selectedRow,
}: {
  onExportCsv: () => void;
  onSelectRow: (row: ActivitySignupRow) => void;
  questions: ThreadActivitySignupQuestion[];
  rows: ActivitySignupRow[];
  selectedRow: ActivitySignupRow | null;
}) {
  const tableQuestions = questions.length > 0 ? questions.slice(0, 5) : [];

  return (
    <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
        <h2 className="text-base font-bold text-[#385772] dark:text-white">报名数据表</h2>
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-3 text-sm font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
        >
          <Download size={15} />
          导出 CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[58rem] w-full text-left text-sm">
          <thead className="border-b border-zinc-200/80 bg-zinc-50 text-xs font-bold text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">报名时间</th>
              <th className="px-4 py-3">状态</th>
              {tableQuestions.length > 0 ? (
                tableQuestions.map((question) => <th key={question.id} className="px-4 py-3">{question.label}</th>)
              ) : (
                <>
                  <th className="px-4 py-3">报名组别</th>
                  <th className="px-4 py-3">集合点</th>
                  <th className="px-4 py-3">车辆状态</th>
                </>
              )}
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {rows.map((row) => (
              <tr
                key={row.floor.id}
                className={joinClassNames(
                  'transition',
                  selectedRow?.floor.id === row.floor.id
                    ? 'bg-[#385772]/5 dark:bg-emerald-200/10'
                    : 'bg-white/30 hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/[0.04]',
                )}
              >
                <td className="px-4 py-3 font-bold text-[#385772] dark:text-white">{row.floor.author.name}</td>
                <td className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">{formatPostTimestamp(row.floor.time)}</td>
                <td className="px-4 py-3">
                  <SignupStatusBadge status={row.status} />
                </td>
                {tableQuestions.length > 0 ? (
                  tableQuestions.map((question) => (
                    <td key={question.id} className="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                      {getActivitySignupAdminValue(row, question)}
                    </td>
                  ))
                ) : (
                  <>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{row.draft.group}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{row.draft.meetPoint || '-'}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{row.draft.bikeCondition || '-'}</td>
                  </>
                )}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelectRow(row)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
                  >
                    <Eye size={14} />
                    查看
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <div className="border-t border-zinc-200/80 bg-zinc-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04] sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#385772] dark:text-white">
              {selectedRow.floor.author.name} 的报名详情
            </h3>
            <span className="text-xs font-semibold text-[#875A41] dark:text-white/70">#{selectedRow.floor.floor}</span>
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200 sm:grid-cols-2">
            {questions.length > 0
              ? questions.map((question) => (
                  <p key={question.id} className="rounded-md border border-zinc-200 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/60">
                    <span className="font-bold text-[#385772] dark:text-white">{question.label}：</span>
                    {getActivitySignupAdminValue(selectedRow, question)}
                  </p>
                ))
              : selectedRow.floor.content.map((line) => (
                  <p key={line} className="rounded-md border border-zinc-200 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/60">
                    {line}
                  </p>
                ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminMetric({
  label,
  tone = 'default',
  value,
}: {
  label: string;
  tone?: AdminMetricTone;
  value: number | string;
}) {
  return (
    <div
      className={joinClassNames(
        'rounded-lg border p-3',
        getAdminMetricToneClass(tone, 'card'),
      )}
    >
      <div className={joinClassNames('text-xs font-semibold', getAdminMetricToneClass(tone, 'label'))}>{label}</div>
      <div
        className={joinClassNames(
          'mt-1 text-xl font-bold',
          getAdminMetricToneClass(tone, 'value'),
        )}
      >
        {value}
      </div>
    </div>
  );
}

function AdminTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={joinClassNames(
        'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
        active
          ? 'bg-[#385772] text-white shadow-sm dark:bg-emerald-200 dark:text-zinc-950'
          : 'border border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SignupStatusBadge({ status }: { status: ActivitySignupRow['status'] }) {
  const className =
    status === '有效'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-100/20 dark:bg-emerald-300/10 dark:text-emerald-100'
      : status === '已取消'
        ? 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300'
        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-100/20 dark:bg-rose-300/10 dark:text-rose-100';

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${className}`}>{status}</span>;
}

function getActivitySignupAdminValue(row: ActivitySignupRow, question: ThreadActivitySignupQuestion) {
  const value = row.draft.values[question.id];

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((optionId) => getActivitySignupAdminOptionLabel(question, optionId)).join('、')
      : '-';
  }

  if (!value?.trim()) {
    return '-';
  }

  return question.type === 'choice' ? getActivitySignupAdminOptionLabel(question, value) : value;
}

function getActivitySignupAdminOptionLabel(question: ThreadActivitySignupQuestion, optionId: string) {
  return question.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

function ActivityAdminNotice({
  backHref,
  description,
  title,
}: {
  backHref?: string;
  description: string;
  title: string;
}) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 text-center shadow-panel dark:border-zinc-800">
      <h1 className="text-xl font-bold text-[#385772] dark:text-white">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      {backHref ? (
        <Link
          to={backHref}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
        >
          返回原帖
        </Link>
      ) : null}
    </section>
  );
}

function getActivitySignupDeadline(thread: ThreadDetail) {
  const activity = activities.find((item) => item.href === `#thread-${thread.id}` || item.title === thread.title);

  return activity?.deadline ?? '未设置';
}

function getActivitySignupStatus(isSignupOpen: boolean, startAt: string, deadline: string) {
  if (!isSignupOpen) {
    return {
      label: '已结束',
      tone: 'danger' as const,
    };
  }

  const now = new Date();
  const startTime = new Date(startAt);
  const deadlineTime = getActivityDeadlineDate(deadline);

  if (!Number.isNaN(startTime.getTime()) && now < startTime) {
    return {
      label: '未开始',
      tone: 'warning' as const,
    };
  }

  if (deadlineTime && now > deadlineTime) {
    return {
      label: '已结束',
      tone: 'danger' as const,
    };
  }

  return {
    label: '报名中',
    tone: 'success' as const,
  };
}

function getActivityDeadlineDate(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return new Date(new Date().getFullYear(), Number(match[1]) - 1, Number(match[2]), Number(match[3]), Number(match[4]));
}

function getAdminMetricToneClass(tone: AdminMetricTone, part: 'card' | 'label' | 'value') {
  if (part === 'card') {
    if (tone === 'warning') {
      return 'border-amber-200 bg-amber-50 dark:border-amber-100/20 dark:bg-amber-300/10';
    }

    if (tone === 'success') {
      return 'border-emerald-200 bg-emerald-50 dark:border-emerald-100/20 dark:bg-emerald-300/10';
    }

    if (tone === 'danger') {
      return 'border-rose-200 bg-rose-50 dark:border-rose-100/20 dark:bg-rose-300/10';
    }

    return 'border-zinc-200 bg-white/55 dark:border-white/10 dark:bg-white/[0.04]';
  }

  if (part === 'label') {
    if (tone === 'warning') {
      return 'text-amber-700 dark:text-amber-100';
    }

    if (tone === 'success') {
      return 'text-emerald-700 dark:text-emerald-100';
    }

    if (tone === 'danger') {
      return 'text-rose-700 dark:text-rose-100';
    }

    return 'text-zinc-500 dark:text-zinc-400';
  }

  if (tone === 'warning') {
    return 'text-amber-800 dark:text-amber-100';
  }

  if (tone === 'success') {
    return 'text-emerald-800 dark:text-emerald-100';
  }

  if (tone === 'danger') {
    return 'text-rose-700 dark:text-rose-100';
  }

  return 'text-[#385772] dark:text-white';
}

function toDateTimeLocalValueFromIso(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);

  return match ? `${match[1]}T${match[2]}` : '';
}

function toDateTimeLocalValueFromActivityDeadline(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);

  if (!match) {
    return '';
  }

  return `${new Date().getFullYear()}-${match[1]}-${match[2]}T${match[3]}:${match[4]}`;
}

function getEditableActivitySignupQuestions(questions: ActivitySignupQuestion[]): EditableActivitySignupQuestion[] {
  const sourceQuestions = questions.length > 0 ? questions : defaultActivitySignupQuestions;

  return sourceQuestions.map((question, index) => ({
    ...normalizeActivitySignupQuestion({ ...question }),
    localId: question.id || `question-${index}`,
  }));
}

function getEditableThreadActivitySignupQuestions(questions: ThreadActivitySignupQuestion[]): EditableActivitySignupQuestion[] {
  return questions.map((question, index) => normalizeActivitySignupQuestion({
    id: question.id,
    label: question.label,
    localId: question.id || `thread-question-${index}`,
    options: question.options?.map((option) => option.label),
    required: question.required,
    type: getEditableQuestionTypeFromThreadQuestion(question),
  }));
}

function getEditableQuestionTypeFromThreadQuestion(question: ThreadActivitySignupQuestion): ActivitySignupQuestionType {
  if (question.label.trim().toUpperCase() === 'ID') {
    return 'id';
  }

  if (question.type === 'choice') {
    return 'radio';
  }

  if (question.type === 'multiChoice') {
    return 'multiSelect';
  }

  return 'text';
}

function downloadSignupCsv(thread: ThreadDetail, rows: ActivitySignupRow[]) {
  const questions = thread.signupQuestions ?? [];
  const headers = questions.length > 0
    ? ['ID', '报名时间', '状态', ...questions.map((question) => question.label), '楼层']
    : ['ID', '报名时间', '状态', '报名组别', '集合点', '车辆状态', '保障需求', '备注', '楼层'];
  const csvRows = rows.map((row) => {
    const fixedCells = [
      row.floor.author.name,
      formatPostTimestamp(row.floor.time),
      row.status,
    ];
    const questionCells = questions.length > 0
      ? questions.map((question) => getActivitySignupAdminValue(row, question))
      : [
          row.draft.group,
          row.draft.meetPoint,
          row.draft.bikeCondition,
          row.draft.supportNeed || '无',
          row.draft.note || '无',
        ];

    return [...fixedCells, ...questionCells, `#${row.floor.floor}`];
  });
  const csvContent = [headers, ...csvRows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeFileName(thread.title)}-报名数据.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'activity-signups';
}
