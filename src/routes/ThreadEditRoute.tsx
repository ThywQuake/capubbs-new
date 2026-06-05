import { ArrowLeft, Eye, FileText, Paperclip, Save, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLegacyBbs, useLegacyBbsThreadDetail } from '../api/LegacyBbsDataContext';
import { legacyBbsPost, type LegacyBbsWritePostResponse } from '../api/legacyBbsClient';
import { ActivityCoverImageField } from '../components/activity/ActivityCoverImageField';
import { RichTextEditor, type RichTextEditorValue } from '../components/editor/RichTextEditor';
import {
  getSignatureOptionByIndex,
  SignatureSelector,
  useLegacySignatureOptions,
} from '../components/thread/SignatureSelector';
import { ThreadPostPreviewDialog } from '../components/thread/ThreadPostPreviewDialog';
import { getThreadDetail } from '../data/threadDetails';
import type { ThreadAttachment, ThreadFloor } from '../types/forum';
import { isActivitySignupThread, type ActivityCoverImage } from '../utils/activitySignup';
import { formatPostTimestamp } from '../utils/formatPostTimestamp';
import { normalizeNewForumQuotesForLegacyStorage } from '../utils/legacyQuote';
import { getPublishedThreadSignupSettings, saveActivitySignupSettings } from '../utils/threadComposeStorage';
import { saveThreadFloorEdit } from '../utils/threadEditStorage';
import { getThreadFloorPath, getThreadPath } from '../utils/threadRoutes';
import { isGuestViewer } from '../utils/viewerPermissions';

type ThreadEditRouteProps = {
  floorNumber: number;
  threadId: string | null;
};

export function ThreadEditRoute({ floorNumber, threadId }: ThreadEditRouteProps) {
  const navigate = useNavigate();
  const legacyBbs = useLegacyBbs();
  const legacyThreadState = useLegacyBbsThreadDetail(threadId, floorNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const staticThread = getThreadDetail(threadId);
  const thread = legacyThreadState.thread ?? staticThread;
  const threadTarget = parseThreadTarget(thread?.id ?? threadId);
  const isGuest = isGuestViewer(legacyBbs.viewer);
  const floor = thread
    ? floorNumber <= 1
      ? thread.mainPost
      : thread.floors.find((threadFloor) => threadFloor.floor === floorNumber)
    : null;
  const isMainPost = Boolean(thread && floor && floor.floor === thread.mainPost.floor);
  const isActivityMainPost = Boolean(thread && isMainPost && isActivitySignupThread(thread));
  const backHref = thread && floor ? getThreadFloorPath(thread.id, floor.floor) : '/';
  const floorContentKey = floor?.content.join('\n') ?? '';
  const activitySignupSettings = useMemo(
    () => (thread ? getPublishedThreadSignupSettings(thread.id) : null),
    [thread?.id],
  );
  const [titleDraft, setTitleDraft] = useState(thread?.title ?? '');
  const [editorValue, setEditorValue] = useState<RichTextEditorValue>(() =>
    floor ? getInitialEditorValue(floor) : getEmptyEditorValue(),
  );
  const [attachments, setAttachments] = useState<ThreadAttachment[]>(() => floor?.attachments ?? []);
  const [activityCoverImage, setActivityCoverImage] = useState<ActivityCoverImage | null>(
    activitySignupSettings?.coverImage ?? null,
  );
  const [signatureIndex, setSignatureIndex] = useState(() => floor?.signatureIndex ?? 0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { options: signatureOptions, status: signatureStatus } = useLegacySignatureOptions(
    isGuest ? null : legacyBbs.viewer?.username ?? null,
  );
  const previewParagraphs = useMemo(() => getEditorParagraphs(editorValue), [editorValue]);
  const canSave = Boolean(
    thread &&
      floor &&
      previewParagraphs.length > 0 &&
      (!isMainPost || titleDraft.trim().length > 0) &&
      !isSaving,
  );

  useEffect(() => {
    if (!thread || !floor) {
      return;
    }

    setTitleDraft(thread.title);
    setEditorValue(getInitialEditorValue(floor));
    setAttachments(floor.attachments ?? []);
    setActivityCoverImage(activitySignupSettings?.coverImage ?? null);
    setSignatureIndex(floor.signatureIndex ?? 0);
    setIsPreviewOpen(false);
    setStatusMessage('');
  }, [activitySignupSettings, floor?.id, floorContentKey, floor?.editedAt, thread?.title]);

  if (!thread && legacyThreadState.isLegacyThreadId && legacyThreadState.status === 'loading') {
    return (
      <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
        <h1 className="text-xl font-bold text-[#385772] dark:text-white">正在加载帖子</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">正在从真实 API 读取当前主题。</p>
      </section>
    );
  }

  if (!thread) {
    return <ThreadEditNotFound title="没有找到帖子" description={threadId ? `当前地址中的「${threadId}」还没有配置帖子详情。` : '当前地址缺少帖子编号。'} />;
  }

  if (!floor) {
    return (
      <ThreadEditNotFound
        title="没有找到楼层"
        description={`《${thread.title}》中没有 #${floorNumber} 楼。`}
        backHref={getThreadPath(thread.id)}
        backLabel="返回帖子"
      />
    );
  }

  if (isGuest) {
    return (
      <ThreadEditNotFound
        title="游客模式仅可浏览"
        description="登录后可以编辑帖子或回复。"
        backHref={getThreadPath(thread.id)}
        backLabel="返回帖子"
      />
    );
  }

  const pageTitle = isMainPost ? titleDraft.trim() || thread.title : `Re: ${thread.title}`;

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

  const handleCancel = () => {
    if (window.confirm('放弃当前修改？')) {
      navigate(backHref);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    if (threadTarget) {
      setIsSaving(true);
      setStatusMessage('正在保存...');

      try {
        const savedPost = await legacyBbsPost<LegacyBbsWritePostResponse>(
          `/threads/${threadTarget.bid}/${threadTarget.tid}/floors/${floor.floor}`,
          {
            text: getEditorStorageHtml(editorValue),
            sig: signatureIndex,
            title: isMainPost ? titleDraft.trim() : thread.title,
            type: 'web',
          },
        );

        navigate(savedPost.href ? getThreadFloorPath(savedPost.threadId, savedPost.pid || floor.floor) : backHref);
      } catch (error) {
        setStatusMessage(getErrorMessage(error));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    saveThreadFloorEdit(thread.id, floor.floor, {
      attachments,
      content: previewParagraphs,
      editedAt: makeLocalTimestamp(),
      ...(isMainPost ? { title: titleDraft.trim() } : {}),
    });

    if (isActivityMainPost) {
      saveActivitySignupSettings(thread.id, {
        coverImage: activityCoverImage,
      });
    }

    navigate(backHref);
  };

  const selectedSignatureOption = getSignatureOptionByIndex(signatureOptions, signatureIndex);
  const previewFloor: ThreadFloor = {
    ...floor,
    attachments,
    content: previewParagraphs.length > 0 ? previewParagraphs : ['暂无内容。'],
    htmlContent: previewParagraphs.length > 0 ? getEditorStorageHtml(editorValue) : '<p>暂无内容。</p>',
    id: `${floor.id}-preview`,
    signatureHtml: signatureIndex > 0 ? selectedSignatureOption?.html || floor.signatureHtml : '',
    signatureIndex: signatureIndex > 0 ? signatureIndex : undefined,
  };

  return (
    <article className="space-y-4">
      <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            to={backHref}
            aria-label="返回帖子"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#875A41] dark:text-white/60">
              {thread.board} / {isMainPost ? '编辑帖子' : '编辑回复'}
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">
              {pageTitle}
            </h1>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 rounded-lg border border-zinc-200/80 bg-white/45 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-2">
          <ThreadEditSourceItem label={isMainPost ? '原帖' : '所属帖子'}>
            <Link to={getThreadPath(thread.id)} className="font-bold text-[#385772] hover:underline dark:text-white">
              {thread.title}
            </Link>
          </ThreadEditSourceItem>
          <ThreadEditSourceItem label="楼层">#{floor.floor}</ThreadEditSourceItem>
          <ThreadEditSourceItem label="作者">{floor.author.name}</ThreadEditSourceItem>
          <ThreadEditSourceItem label="发布">{formatPostTimestamp(floor.time)}</ThreadEditSourceItem>
          <ThreadEditSourceItem label="最后编辑">
            {floor.editedAt ? formatPostTimestamp(floor.editedAt) : '未编辑'}
          </ThreadEditSourceItem>
        </dl>
      </section>

      <form className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4">
          {isMainPost ? (
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              标题
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
              />
            </label>
          ) : null}

          {isActivityMainPost ? (
            <ActivityCoverImageField value={activityCoverImage} onChange={setActivityCoverImage} />
          ) : null}

          <div>
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {isMainPost ? '正文' : '回复内容'}
            </h2>
            <div className="mt-2">
              <RichTextEditor
                ariaLabel={isMainPost ? `编辑《${thread.title}》正文` : `编辑《${thread.title}》#${floor.floor} 回复`}
                placeholder={isMainPost ? '修改主楼正文...' : '修改这一楼的回复内容...'}
                value={editorValue}
                onChange={setEditorValue}
              />
            </div>
          </div>

          <SignatureSelector
            id="thread-edit-signature"
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-10 items-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100 dark:hover:bg-rose-300/20"
          >
            放弃修改
          </button>
          {statusMessage ? <p className="text-sm font-semibold text-[#385772] dark:text-emerald-100">{statusMessage}</p> : null}
          <div className="ml-auto flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-4 text-sm font-bold text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <Eye size={16} />
              预览
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
            >
              <Save size={16} />
              {isSaving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </div>
      </form>

      {isPreviewOpen ? (
        <ThreadPostPreviewDialog
          currentAccountId={legacyBbs.viewer?.id ?? null}
          floor={previewFloor}
          subtitle={isMainPost ? '编辑帖子预览' : '编辑回复预览'}
          threadTitle={isMainPost ? titleDraft.trim() || thread.title : undefined}
          title="预览修改"
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </article>
  );
}

function ThreadEditSourceItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 min-w-0 break-words font-semibold text-zinc-800 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

function ThreadEditNotFound({
  backHref = '/',
  backLabel = '返回首页',
  description,
  title,
}: {
  backHref?: string;
  backLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
      <h1 className="text-xl font-bold text-[#385772] dark:text-white">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      <Link
        to={backHref}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        {backLabel}
      </Link>
    </section>
  );
}

function getInitialEditorValue(floor: ThreadFloor): RichTextEditorValue {
  return {
    content: floor.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join(''),
    mode: 'rich',
  };
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

function parseThreadTarget(threadId: string | null) {
  const match = threadId?.match(/^(\d+)-(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    bid: Number.parseInt(match[1], 10),
    tid: Number.parseInt(match[2], 10),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '保存失败，请稍后重试。';
}

function makeLocalTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
