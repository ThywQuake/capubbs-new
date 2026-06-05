import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Eye,
  FileText,
  Paperclip,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLegacyBbs } from '../api/LegacyBbsDataContext';
import { legacyBbsPost, type LegacyBbsWritePostResponse } from '../api/legacyBbsClient';
import { RichTextEditor, type RichTextEditorValue } from '../components/editor/RichTextEditor';
import {
  getSignatureOptionByIndex,
  SignatureSelector,
  useLegacySignatureOptions,
} from '../components/thread/SignatureSelector';
import { ThreadPostPreviewDialog } from '../components/thread/ThreadPostPreviewDialog';
import { getBoardDetail } from '../data/boardDetails';
import type { ThreadAttachment, ThreadFloor } from '../types/forum';
import {
  ACTIVITY_SIGNUP_BOARD_NAME,
  activitySignupQuestionTypeOptions,
  defaultActivitySignupQuestions,
  getActivitySignupQuestionTypeHint,
  isActivitySignupQuestionChoiceType,
  normalizeActivitySignupQuestion,
  type ActivityCoverImage,
  type ActivitySignupQuestionType,
} from '../utils/activitySignup';
import { getBoardPath } from '../utils/boardRoutes';
import { canViewerPostToBoard, getBoardStarRequirementMessage } from '../utils/boardStarRequirement';
import { joinClassNames } from '../utils/classNames';
import { normalizeNewForumQuotesForLegacyStorage } from '../utils/legacyQuote';
import {
  clearThreadComposeDraft,
  readThreadComposeDraft,
  saveThreadComposeDraft,
  type SignupQuestionDraft,
} from '../utils/threadComposeStorage';
import { getThreadPath } from '../utils/threadRoutes';
import { getPublicProfilePath } from '../utils/userRoutes';
import { getViewerRights, isGuestViewer } from '../utils/viewerPermissions';
import { getViewerStorageOwnerKey } from '../utils/viewerStorage';

type ThreadComposeRouteProps = {
  boardName: string | null;
};

export function ThreadComposeRoute({ boardName }: ThreadComposeRouteProps) {
  const navigate = useNavigate();
  const legacyBbs = useLegacyBbs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const board = getBoardDetail(boardName);
  const boardSummary = legacyBbs.getBoardSummary(board?.name ?? boardName);
  const requiredStar = boardSummary?.requiredStar ?? 0;
  const isGuest = isGuestViewer(legacyBbs.viewer);
  const canPostToBoard = canViewerPostToBoard(legacyBbs.viewer, requiredStar);
  const composeDraftOwnerKey = getViewerStorageOwnerKey(legacyBbs.viewer);
  const canEnableSignup = board?.name === ACTIVITY_SIGNUP_BOARD_NAME && getViewerRights(legacyBbs.viewer) >= 2;
  const boardId = legacyBbs.resolveBoardId(board?.name ?? null);
  const boardPath = board ? getBoardPath(board.name) : '/';
  const [titleDraft, setTitleDraft] = useState('');
  const [editorValue, setEditorValue] = useState<RichTextEditorValue>(getEmptyEditorValue);
  const [attachments, setAttachments] = useState<ThreadAttachment[]>([]);
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [signupStart, setSignupStart] = useState('');
  const [signupEnd, setSignupEnd] = useState('');
  const [signupQuestions, setSignupQuestions] = useState<SignupQuestionDraft[]>(getDefaultSignupQuestions);
  const [activityCoverImage, setActivityCoverImage] = useState<ActivityCoverImage | null>(null);
  const [signatureIndex, setSignatureIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const { options: signatureOptions, status: signatureStatus } = useLegacySignatureOptions(
    isGuest ? null : composeDraftOwnerKey,
  );
  const previewParagraphs = useMemo(() => getEditorParagraphs(editorValue), [editorValue]);
  const activeSignupEnabled = canEnableSignup && signupEnabled;
  const hasValidSignupSettings =
    !activeSignupEnabled ||
    (signupStart.trim().length > 0 &&
      signupEnd.trim().length > 0 &&
      signupQuestions.length > 0 &&
      signupQuestions.every(isValidSignupQuestion));
  const canPublish = Boolean(
      board &&
      boardId &&
      canPostToBoard &&
      titleDraft.trim().length > 0 &&
      previewParagraphs.length > 0 &&
      hasValidSignupSettings &&
      !isPublishing,
  );

  useEffect(() => {
    if (!board) {
      return;
    }

    const draft = readThreadComposeDraft(board.name, composeDraftOwnerKey);

    if (!draft) {
      setTitleDraft('');
      setEditorValue(getEmptyEditorValue());
      setAttachments([]);
      setSignupEnabled(false);
      setSignupStart('');
      setSignupEnd('');
      setSignupQuestions(getDefaultSignupQuestions());
      setActivityCoverImage(null);
      setSignatureIndex(0);
      setIsPreviewOpen(false);
      setStatusMessage('');
      return;
    }

    setTitleDraft(draft.title);
    setEditorValue({
      content: draft.content,
      mode: draft.contentMode,
    });
    setAttachments(draft.attachments);
    const canUseDraftSignup = canEnableSignup && draft.signupEnabled;

    setSignupEnabled(canUseDraftSignup);
    setSignupStart(canUseDraftSignup ? draft.signupStart : '');
    setSignupEnd(canUseDraftSignup ? draft.signupEnd : '');
    setSignupQuestions(
      canUseDraftSignup && draft.signupQuestions.length > 0
        ? draft.signupQuestions.map(normalizeActivitySignupQuestion)
        : getDefaultSignupQuestions(),
    );
    setActivityCoverImage(canUseDraftSignup ? draft.activityCoverImage : null);
    setSignatureIndex(draft.signatureIndex);
    setIsPreviewOpen(false);
    setStatusMessage('已恢复草稿。');
  }, [board?.name, canEnableSignup, composeDraftOwnerKey]);

  if (!board) {
    return (
      <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
        <h1 className="text-xl font-bold text-[#385772] dark:text-white">没有找到板块</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {boardName ? `当前地址中的「${boardName}」还没有配置版面。` : '当前地址缺少版面名称。'}
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
        >
          返回首页
        </Link>
      </section>
    );
  }

  if (isGuest) {
    return (
      <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
        <h1 className="text-xl font-bold text-[#385772] dark:text-white">游客模式仅可浏览</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          登录后可以在「{board.name}」发帖。
        </p>
        <Link
          to={boardPath}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
        >
          返回版面
        </Link>
      </section>
    );
  }

  if (!canPostToBoard) {
    return (
      <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
        <h1 className="text-xl font-bold text-[#385772] dark:text-white">当前星级暂不能发帖</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {getBoardStarRequirementMessage(requiredStar) || `当前账号暂不能在「${board.name}」发帖。`}
        </p>
        <Link
          to={boardPath}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
        >
          返回版面
        </Link>
      </section>
    );
  }

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    setAttachments((currentAttachments) => [
      ...currentAttachments,
      ...selectedFiles.map((file) => ({
        href: `#attachment-${encodeURIComponent(file.name)}`,
        meta: `${formatFileSize(file.size)} · 新增`,
        name: file.name,
      })),
    ]);
    event.currentTarget.value = '';
  };

  const handleRemoveAttachment = (attachmentIndex: number) => {
    setAttachments((currentAttachments) =>
      currentAttachments.filter((_, currentIndex) => currentIndex !== attachmentIndex),
    );
  };

  const handleSaveDraft = () => {
    saveThreadComposeDraft(board.name, getDraftPayload(), composeDraftOwnerKey);
    setStatusMessage('草稿已保存。');
  };

  const handleCancel = () => {
    if (window.confirm('放弃当前发帖内容？')) {
      navigate(boardPath);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canPublish) {
      if (!boardId) {
        setStatusMessage('当前版面还没有匹配到真实 API 版面，暂时不能发布。');
      }
      return;
    }

    setIsPublishing(true);
    setStatusMessage('正在发布...');

    try {
      const publishedThread = await legacyBbsPost<LegacyBbsWritePostResponse>(
        '/threads',
        {
          bid: boardId,
          sig: signatureIndex,
          signupEnabled: activeSignupEnabled,
          signupEnd: activeSignupEnabled ? signupEnd : '',
          signupQuestions: activeSignupEnabled ? signupQuestions.map(normalizeActivitySignupQuestion) : [],
          signupStart: activeSignupEnabled ? signupStart : '',
          text: getEditorStorageHtml(editorValue),
          title: titleDraft.trim(),
          type: 'web',
        },
      );

      clearThreadComposeDraft(board.name, composeDraftOwnerKey);
      navigate(getThreadPath(publishedThread.threadId));
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  };

  const getDraftPayload = () => {
    const canUseSignup = canEnableSignup && signupEnabled;

    return {
      activityCoverImage: canUseSignup ? activityCoverImage : null,
      attachments,
      content: editorValue.content,
      contentMode: editorValue.mode,
      signupEnabled: canUseSignup,
      signupEnd: canUseSignup ? signupEnd : '',
      signupQuestions: canUseSignup ? signupQuestions.map(normalizeActivitySignupQuestion) : [],
      signupStart: canUseSignup ? signupStart : '',
      signatureIndex,
      title: titleDraft,
    };
  };

  const updateSignupQuestion = (questionId: string, patch: Partial<SignupQuestionDraft>) => {
    setSignupQuestions((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? normalizeActivitySignupQuestion({
              ...question,
              ...patch,
            })
          : question,
      ),
    );
  };

  const addSignupQuestionOption = (questionId: string) => {
    setSignupQuestions((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [...(question.options ?? []), `选项 ${(question.options?.length ?? 0) + 1}`],
            }
          : question,
      ),
    );
  };

  const removeSignupQuestionOption = (questionId: string, optionIndex: number) => {
    setSignupQuestions((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: (question.options ?? []).filter((_option, index) => index !== optionIndex),
            }
          : question,
      ),
    );
  };

  const updateSignupQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    setSignupQuestions((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: (question.options ?? []).map((option, index) => (index === optionIndex ? value : option)),
            }
          : question,
      ),
    );
  };

  const updateSignupQuestionNumberLimit = (questionId: string, field: 'max' | 'min', value: string) => {
    updateSignupQuestion(questionId, {
      [field]: value.trim() === '' ? undefined : Number(value),
    });
  };

  const addSignupQuestion = () => {
    setSignupQuestions((questions) => [
      ...questions,
      normalizeActivitySignupQuestion({
        id: makeQuestionId(),
        label: `自定义字段 ${questions.length + 1}`,
        required: false,
        type: 'text',
      }),
    ]);
  };

  const removeSignupQuestion = (questionId: string) => {
    setSignupQuestions((questions) =>
      questions.length <= 1 ? questions : questions.filter((question) => question.id !== questionId),
    );
  };

  const reorderSignupQuestion = (fromIndex: number, toIndex: number) => {
    setSignupQuestions((questions) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return questions;
      }

      const nextQuestions = [...questions];
      const [movedQuestion] = nextQuestions.splice(fromIndex, 1);

      if (!movedQuestion) {
        return questions;
      }

      nextQuestions.splice(toIndex, 0, movedQuestion);

      return nextQuestions;
    });
  };

  const selectedSignatureOption = getSignatureOptionByIndex(signatureOptions, signatureIndex);
  const previewFloor: ThreadFloor = {
    attachments,
    author: {
      avatarSrc: legacyBbs.viewer?.avatar,
      href: legacyBbs.viewer?.username ? getPublicProfilePath(legacyBbs.viewer.username) : '#',
      id: legacyBbs.viewer?.username || 'preview-author',
      name: legacyBbs.viewer?.username || '我',
      rating: '',
      role: '楼主',
    },
    content: previewParagraphs.length > 0 ? previewParagraphs : ['暂无内容。'],
    floor: 1,
    htmlContent: previewParagraphs.length > 0 ? getEditorStorageHtml(editorValue) : '<p>暂无内容。</p>',
    id: 'thread-compose-preview',
    signatureHtml: signatureIndex > 0 ? selectedSignatureOption?.html : '',
    signatureIndex: signatureIndex > 0 ? signatureIndex : undefined,
    time: makeLocalTimestamp(),
  };

  return (
    <article className="space-y-4">
      <form className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5" onSubmit={handleSubmit}>
        <div className="flex min-w-0 items-start gap-3 border-b border-zinc-200/80 pb-4 dark:border-white/10">
          <Link
            to={boardPath}
            aria-label="返回板块"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#875A41] dark:text-white/60">
              {board.name} / 发帖
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">
              发布新主题
            </h1>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            标题
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder="请输入标题"
              className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>

          {canEnableSignup ? (
            <section className="rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <label className="flex items-center gap-3 text-sm font-bold text-[#385772] dark:text-white">
                <input
                  type="checkbox"
                  checked={signupEnabled}
                  onChange={(event) => setSignupEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] dark:border-white/20 dark:bg-zinc-900 dark:focus:ring-emerald-200"
                />
                开启活动报名
              </label>

              {signupEnabled ? (
                <ComposeSignupSettings
                  questions={signupQuestions}
                  signupEnd={signupEnd}
                  signupStart={signupStart}
                  onAddOption={addSignupQuestionOption}
                  onAddQuestion={addSignupQuestion}
                  onRemoveOption={removeSignupQuestionOption}
                  onRemoveQuestion={removeSignupQuestion}
                  onReorderQuestion={reorderSignupQuestion}
                  onSignupEndChange={setSignupEnd}
                  onSignupStartChange={setSignupStart}
                  onUpdateNumberLimit={updateSignupQuestionNumberLimit}
                  onUpdateOption={updateSignupQuestionOption}
                  onUpdateQuestion={updateSignupQuestion}
                />
              ) : null}
            </section>
          ) : null}

          <div>
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">正文</h2>
            <div className="mt-2">
              <RichTextEditor
                ariaLabel={`在「${board.name}」发帖`}
                placeholder="在这里输入帖子内容..."
                value={editorValue}
                onChange={setEditorValue}
              />
            </div>
          </div>

          <SignatureSelector
            id="thread-compose-signature"
            options={signatureOptions}
            status={signatureStatus}
            value={signatureIndex}
            onChange={setSignatureIndex}
          />

          <section className="rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xs font-bold text-[#385772] dark:text-white">
                <FileText size={15} className="text-emerald-700/80 dark:text-emerald-100/80" />
                附件
              </h2>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAttachmentChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
              >
                <Paperclip size={15} />
                添加图片 / 文件
              </button>
            </div>
            {attachments.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {attachments.map((attachment, attachmentIndex) => (
                  <div
                    key={`${attachment.href}-${attachment.name}-${attachmentIndex}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.05]"
                  >
                    <a href={attachment.href} className="min-w-0 truncate font-semibold text-zinc-800 hover:underline dark:text-white">
                      {attachment.name}
                    </a>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs font-medium text-zinc-500 dark:text-zinc-400 sm:inline">
                        {attachment.meta}
                      </span>
                      <button
                        type="button"
                        aria-label={`删除附件 ${attachment.name}`}
                        onClick={() => handleRemoveAttachment(attachmentIndex)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:text-zinc-300 dark:hover:bg-rose-300/10 dark:hover:text-rose-100"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">暂无附件。</p>
            )}
          </section>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-10 items-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100 dark:hover:bg-rose-300/20"
          >
            取消
          </button>
          {statusMessage ? <p className="text-sm font-semibold text-[#385772] dark:text-emerald-100">{statusMessage}</p> : null}
          <div className="ml-auto flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-4 text-sm font-bold text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <Save size={16} />
              保存草稿
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className={joinClassNames(
                'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
                isPreviewOpen
                  ? 'border-[#385772]/20 bg-[#385772] text-white hover:bg-[#28465f] dark:border-emerald-100/15 dark:bg-emerald-200 dark:text-zinc-950'
                  : 'border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]',
              )}
            >
              <Eye size={16} />
              预览
            </button>
            <button
              type="submit"
              disabled={!canPublish}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
            >
              <Send size={16} />
              {isPublishing ? '发布中...' : '发布帖子'}
            </button>
          </div>
        </div>
      </form>

      {isPreviewOpen ? (
        <ThreadPostPreviewDialog
          currentAccountId={legacyBbs.viewer?.id ?? null}
          floor={previewFloor}
          subtitle={`${board.name} / 发帖预览`}
          threadTitle={titleDraft.trim() || '未命名主题'}
          title="预览帖子"
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </article>
  );
}

function ComposeSignupSettings({
  onAddOption,
  onAddQuestion,
  onRemoveOption,
  onRemoveQuestion,
  onReorderQuestion,
  onSignupEndChange,
  onSignupStartChange,
  onUpdateNumberLimit,
  onUpdateOption,
  onUpdateQuestion,
  questions,
  signupEnd,
  signupStart,
}: {
  onAddOption: (questionId: string) => void;
  onAddQuestion: () => void;
  onRemoveOption: (questionId: string, optionIndex: number) => void;
  onRemoveQuestion: (questionId: string) => void;
  onReorderQuestion: (fromIndex: number, toIndex: number) => void;
  onSignupEndChange: (value: string) => void;
  onSignupStartChange: (value: string) => void;
  onUpdateNumberLimit: (questionId: string, field: 'max' | 'min', value: string) => void;
  onUpdateOption: (questionId: string, optionIndex: number, value: string) => void;
  onUpdateQuestion: (questionId: string, patch: Partial<SignupQuestionDraft>) => void;
  questions: SignupQuestionDraft[];
  signupEnd: string;
  signupStart: string;
}) {
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-2">
        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          报名开始时间
          <input
            type="datetime-local"
            value={signupStart}
            onChange={(event) => onSignupStartChange(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </label>
        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          报名截止时间
          <input
            type="datetime-local"
            value={signupEnd}
            onChange={(event) => onSignupEndChange(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          />
        </label>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white/35 p-3 dark:border-white/10 dark:bg-white/[0.025]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#385772] dark:text-white">
            <CalendarDays size={15} />
            问卷设置
          </div>
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
          {questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="grid gap-3 rounded-lg border border-zinc-200 bg-white/70 p-3 transition dark:border-white/10 dark:bg-zinc-900/50 lg:grid-cols-[2.75rem_minmax(0,1.1fr)_9rem_8rem_minmax(0,1.25fr)_auto]"
            >
              <div className="flex items-end gap-1 self-end lg:flex-col">
                <button
                  type="button"
                  aria-label={`上移「${question.label || `字段 ${questionIndex + 1}`}」`}
                  title="上移"
                  onClick={() => onReorderQuestion(questionIndex, questionIndex - 1)}
                  disabled={questionIndex === 0}
                  className="inline-flex h-8 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-white"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`下移「${question.label || `字段 ${questionIndex + 1}`}」`}
                  title="下移"
                  onClick={() => onReorderQuestion(questionIndex, questionIndex + 1)}
                  disabled={questionIndex === questions.length - 1}
                  className="inline-flex h-8 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-white"
                >
                  <ArrowDown size={15} />
                </button>
              </div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                字段名
                <input
                  value={question.label}
                  onChange={(event) => onUpdateQuestion(question.id, { label: event.target.value })}
                  placeholder="字段名"
                  className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                题型
                <select
                  value={question.type}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    onUpdateQuestion(question.id, { type: event.target.value as ActivitySignupQuestionType })
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
                  onChange={(event) => onUpdateQuestion(question.id, { required: event.target.checked })}
                  className="h-4 w-4 accent-[#385772] disabled:cursor-not-allowed disabled:opacity-50"
                />
                必填
              </label>
              <ComposeQuestionRuleEditor
                question={question}
                onAddOption={onAddOption}
                onRemoveOption={onRemoveOption}
                onUpdateNumberLimit={onUpdateNumberLimit}
                onUpdateOption={onUpdateOption}
              />
              <button
                type="button"
                aria-label={`删除问题 ${questionIndex + 1}`}
                onClick={() => onRemoveQuestion(question.id)}
                disabled={questions.length <= 1}
                className="inline-flex h-10 items-center justify-center self-end rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComposeQuestionRuleEditor({
  onAddOption,
  onRemoveOption,
  onUpdateNumberLimit,
  onUpdateOption,
  question,
}: {
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, optionIndex: number) => void;
  onUpdateNumberLimit: (questionId: string, field: 'max' | 'min', value: string) => void;
  onUpdateOption: (questionId: string, optionIndex: number, value: string) => void;
  question: SignupQuestionDraft;
}) {
  if (isActivitySignupQuestionChoiceType(question.type)) {
    const options = question.options ?? [];

    return (
      <div className="min-w-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        选项
        <div className="mt-2 grid gap-2">
          {options.map((option, optionIndex) => (
            <div key={`${question.id}-${optionIndex}`} className="flex min-w-0 items-center gap-2">
              <input
                value={option}
                onChange={(event) => onUpdateOption(question.id, optionIndex, event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => onRemoveOption(question.id, optionIndex)}
                disabled={options.length <= 1}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onAddOption(question.id)}
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
              onChange={(event) => onUpdateNumberLimit(question.id, 'min', event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            />
          </label>
          <label>
            上限
            <input
              type="number"
              value={question.max ?? ''}
              onChange={(event) => onUpdateNumberLimit(question.id, 'max', event.target.value)}
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

function getDefaultSignupQuestions(): SignupQuestionDraft[] {
  return defaultActivitySignupQuestions.map((question) =>
    normalizeActivitySignupQuestion({
      ...question,
      options: question.options ? [...question.options] : undefined,
    }),
  );
}

function isValidSignupQuestion(question: SignupQuestionDraft) {
  if (question.label.trim().length === 0) {
    return false;
  }

  if (isActivitySignupQuestionChoiceType(question.type)) {
    const options = question.options ?? [];

    return options.length >= 2 && options.every((option) => option.trim().length > 0);
  }

  if (question.type === 'number') {
    return !(typeof question.min === 'number' && typeof question.max === 'number' && question.min > question.max);
  }

  return true;
}

function getEmptyEditorValue(): RichTextEditorValue {
  return {
    content: '',
    mode: 'rich',
  };
}

function getEditorParagraphs(value: RichTextEditorValue) {
  if (value.mode === 'markdown') {
    return splitTextIntoParagraphs(stripMarkdownText(value.content));
  }

  if (typeof document === 'undefined') {
    return splitTextIntoParagraphs(value.content);
  }

  const container = document.createElement('div');
  container.innerHTML = value.content;
  const paragraphNodes = Array.from(container.querySelectorAll('p, li'));
  const paragraphs = paragraphNodes
    .map((node) => normalizeParagraphText(node.textContent ?? ''))
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  return splitTextIntoParagraphs(container.textContent ?? '');
}

function getEditorStorageHtml(value: RichTextEditorValue) {
  if (value.mode === 'html' || value.mode === 'rich') {
    return normalizeNewForumQuotesForLegacyStorage(value.content);
  }

  return splitTextIntoParagraphs(stripMarkdownText(value.content))
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function splitTextIntoParagraphs(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(normalizeParagraphText)
    .filter(Boolean);
}

function normalizeParagraphText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripMarkdownText(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[>\-*#]+\s*/gm, '')
    .replace(/[*_`]/g, '');
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '发布失败，请稍后重试。';
}

function makeLocalTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function makeQuestionId() {
  return `question-${Date.now().toString(36)}`;
}
