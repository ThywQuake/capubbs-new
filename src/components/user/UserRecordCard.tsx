import { Link2, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { parseSignatureFloorLink, useSignatureSourcePreview } from '../../hooks/useSignatureSourcePreview';
import type { SignatureDraft, UserRecord, UserRecordVariant } from '../../types/userCenter';
import { getBoardPath } from '../../utils/boardRoutes';
import { joinClassNames } from '../../utils/classNames';
import { formatPostTimestamp } from '../../utils/formatPostTimestamp';
import { getThreadPath, getThreadPathFromHref } from '../../utils/threadRoutes';
import { RichTextEditor, type RichTextEditorValue } from '../editor/RichTextEditor';

type UserRecordCardProps = {
  compact?: boolean;
  record: UserRecord;
  variant: UserRecordVariant;
  signatureIndex?: number;
  isEditing?: boolean;
  signatureDraft?: SignatureDraft;
  onDraftDelete?: (record: UserRecord) => void;
  onSignatureEdit?: (record: UserRecord) => void;
  onSignatureDraftChange?: <Field extends keyof SignatureDraft>(field: Field, value: SignatureDraft[Field]) => void;
  onSignatureLink?: (record: UserRecord, linkedSignature: LinkedSignatureFloor) => void;
};

export function UserRecordCard({
  compact = false,
  record,
  variant,
  signatureIndex,
  isEditing = false,
  signatureDraft,
  onDraftDelete,
  onSignatureEdit,
  onSignatureDraftChange,
  onSignatureLink,
}: UserRecordCardProps) {
  const navigate = useNavigate();
  const disableNavigation = variant === 'signature';
  const showCompactRecord = compact && variant !== 'signature';
  const recordPath = getThreadPathFromHref(record.href);
  const openThread = () => {
    if (disableNavigation) {
      return;
    }

    navigate(recordPath);
  };

  return (
    <article
      role={disableNavigation ? undefined : 'link'}
      tabIndex={disableNavigation ? undefined : 0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a,button,input,textarea,select')) {
          return;
        }

        openThread();
      }}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest('a,button,input,textarea,select')) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openThread();
        }
      }}
      className={joinClassNames(
        'card-surface rounded-lg border border-zinc-200 shadow-panel outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800',
        showCompactRecord ? 'p-3' : 'p-4',
        disableNavigation
          ? 'cursor-default'
          : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-white/[0.96] hover:shadow-lg dark:hover:border-emerald-200/25 dark:hover:bg-zinc-900/[0.96]',
      )}
    >
      {showCompactRecord ? (
        <CompactUserRecordTitle record={record} variant={variant} />
      ) : (
        <>
          {variant === 'post' && <UserPostRecord record={record} />}
          {variant === 'favorite' && <UserFavoriteRecord record={record} />}
          {variant === 'reply' && <UserReplyRecord record={record} />}
          {variant === 'activity' && <UserActivityRecord record={record} />}
          {variant === 'draft' && <UserDraftRecord record={record} onDelete={onDraftDelete} />}
          {variant === 'signature' && (
            <UserSignatureRecord
              record={record}
              index={signatureIndex ?? 1}
              isEditing={isEditing}
              draft={isEditing ? signatureDraft : undefined}
              onEdit={onSignatureEdit}
              onDraftChange={onSignatureDraftChange}
              onLink={onSignatureLink}
            />
          )}
        </>
      )}
    </article>
  );
}

function CompactUserRecordTitle({ record, variant }: { record: UserRecord; variant: UserRecordVariant }) {
  const showTime = variant !== 'favorite';

  return (
    <>
      <h2 className="capubbs-title-wrap text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white sm:text-lg">
        <RecordTitleLink record={record}>{record.title}</RecordTitleLink>
      </h2>
      {showTime ? (
        <p className="mt-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white/75">
          {formatPostTimestamp(record.time)}
        </p>
      ) : null}
    </>
  );
}

function BoardPill({ record }: { record: UserRecord }) {
  return (
    <Link
      to={getBoardPath(record.board)}
      onClick={(event) => event.stopPropagation()}
      className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 outline-none transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 dark:bg-emerald-950 dark:text-white dark:hover:bg-emerald-900"
    >
      {record.board}
    </Link>
  );
}

function UserPostRecord({ record }: { record: UserRecord }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="capubbs-title-wrap min-w-0 text-lg font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
          <RecordTitleLink record={record}>{record.title}</RecordTitleLink>
        </h2>
        <BoardPill record={record} />
      </div>
      <div className="mt-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <span>{formatPostTimestamp(record.time)}</span>
      </div>
      <div className="mt-4 flex text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <RecordJumpLink record={record} />
      </div>
    </>
  );
}

function UserFavoriteRecord({ record }: { record: UserRecord }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="capubbs-title-wrap min-w-0 text-lg font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
          <RecordTitleLink record={record}>{record.title}</RecordTitleLink>
        </h2>
        <BoardPill record={record} />
      </div>
      <div className="mt-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <Link
          to={record.authorHref ?? '#'}
          onClick={(event) => event.stopPropagation()}
          className="rounded-sm font-medium outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#875A41]"
        >
          {record.author ?? '匿名'}
        </Link>
        <span> · {formatPostTimestamp(record.time)}</span>
      </div>
      <div className="mt-4 flex text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <RecordJumpLink record={record} />
      </div>
    </>
  );
}

function UserReplyRecord({ record }: { record: UserRecord }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="capubbs-title-wrap min-w-0 text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
          <RecordTitleLink record={record}>{record.title}</RecordTitleLink>
        </h2>
        <BoardPill record={record} />
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <span>{formatPostTimestamp(record.time)}</span>
        <RecordJumpLink record={record} />
      </div>
    </>
  );
}

function UserActivityRecord({ record }: { record: UserRecord }) {
  return (
    <>
      <h2 className="capubbs-title-wrap text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
        <RecordTitleLink record={record}>{record.title}</RecordTitleLink>
      </h2>
      <div className="mt-4 flex items-center gap-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <span>{record.status}</span>
        <span>{formatPostTimestamp(record.time)}</span>
      </div>
    </>
  );
}

function UserDraftRecord({ onDelete, record }: { onDelete?: (record: UserRecord) => void; record: UserRecord }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="capubbs-title-wrap min-w-0 text-base font-semibold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] dark:text-white">
          <RecordTitleLink record={record}>{record.title}</RecordTitleLink>
        </h2>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <BoardPill record={record} />
          {onDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(record);
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100 dark:hover:bg-rose-300/20 dark:focus-visible:ring-rose-200"
            >
              <Trash2 size={13} />
              删除
            </button>
          ) : null}
        </div>
      </div>
      <p className="mx-2 mt-3 line-clamp-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-500 dark:text-zinc-400">{record.excerpt}</p>
      <div className="mt-4 flex items-center gap-4 text-sm leading-[var(--capubbs-thread-card-line-height)] text-[#875A41] dark:text-white">
        <span>{formatPostTimestamp(record.time)}</span>
        <RecordJumpLink record={record} />
      </div>
    </>
  );
}

function UserSignatureRecord({
  record,
  index,
  isEditing,
  draft,
  onEdit,
  onDraftChange,
  onLink,
}: {
  record: UserRecord;
  index: number;
  isEditing: boolean;
  draft?: SignatureDraft;
  onEdit?: (record: UserRecord) => void;
  onDraftChange?: <Field extends keyof SignatureDraft>(field: Field, value: SignatureDraft[Field]) => void;
  onLink?: (record: UserRecord, linkedSignature: LinkedSignatureFloor) => void;
}) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const activeDraft = isEditing ? draft : undefined;
  const signatureHref = activeDraft?.sourceHref ?? record.sourceHref ?? '';
  const signatureSourceState = useSignatureSourcePreview(signatureHref);
  const signatureSource = signatureSourceState.preview;
  const signatureEditorValue = getSignatureEditorValue(activeDraft);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-white/10">
        <span className="text-xs font-semibold text-[#385772] dark:text-white">签名档{index}</span>
        <div className="flex flex-wrap justify-end gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsLinkDialogOpen(true);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-semibold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <Link2 size={14} />
              链接到楼层
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(record);
            }}
            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-semibold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            {isEditing ? '保存' : '编辑'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <>
          <div
            onClick={(event) => event.stopPropagation()}
          >
            <RichTextEditor
              ariaLabel={`签名档${index}内容`}
              placeholder="写下签名档..."
              value={signatureEditorValue}
              onChange={(nextValue) => {
                onDraftChange?.('content', nextValue.content);
                onDraftChange?.('contentMode', nextValue.mode);
              }}
            />
          </div>
          {signatureSource || signatureSourceState.isLoading || signatureSourceState.error ? (
            <div className="mt-3 text-xs font-semibold text-[#875A41] dark:text-white/70">
              已链接到：
              {signatureSource ? (
                <Link
                  to={signatureSource.path}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-sm text-teal-700 outline-none hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white"
                >
                  {signatureSource.title} #{signatureSource.floor}
                </Link>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">
                  {signatureSourceState.isLoading ? '读取链接楼层中' : '链接楼层暂时无法预览'}
                </span>
              )}
            </div>
          ) : null}
        </>
      ) : signatureSource ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/55 p-3 dark:border-emerald-200/15 dark:bg-emerald-300/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#875A41] dark:text-white/65">
              链接楼层 · {signatureSource.title} #{signatureSource.floor} · {signatureSource.author}
            </span>
            <Link
              to={signatureSource.path}
              onClick={(event) => event.stopPropagation()}
              className="rounded-sm text-sm font-semibold text-teal-700 outline-none hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white"
            >
              跳转到链接楼层 &gt;&gt;
            </Link>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300">
            {signatureSource.excerpt}
          </p>
        </div>
      ) : signatureSourceState.isLoading || signatureSourceState.error ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/55 p-3 dark:border-emerald-200/15 dark:bg-emerald-300/[0.06]">
          <span className="text-xs font-semibold text-[#875A41] dark:text-white/65">
            链接楼层
          </span>
          <p className="mt-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300">
            {signatureSourceState.isLoading ? '读取链接楼层中...' : '这个链接指向的楼层暂时无法预览。'}
          </p>
        </div>
      ) : (
        <p className="text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-500 dark:text-zinc-400">{record.excerpt}</p>
      )}

      {isLinkDialogOpen ? (
        <FloorLinkDialog
          onClose={() => setIsLinkDialogOpen(false)}
          onLink={(linkedSignature) => {
            onDraftChange?.('sourceHref', linkedSignature.href);
            onLink?.(record, linkedSignature);
            setIsLinkDialogOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function getSignatureEditorValue(draft: SignatureDraft | undefined): RichTextEditorValue {
  return {
    content: draft?.content ?? '',
    mode: draft?.contentMode ?? 'rich',
  };
}

type LinkedSignatureFloor = {
  href: string;
};

function FloorLinkDialog({
  onClose,
  onLink,
}: {
  onClose: () => void;
  onLink: (linkedSignature: LinkedSignatureFloor) => void;
}) {
  const [bidInput, setBidInput] = useState('');
  const [tidInput, setTidInput] = useState('');
  const [floorInput, setFloorInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bid = parsePositiveInteger(bidInput);
    const tid = parsePositiveInteger(tidInput);
    const floorNumber = parsePositiveInteger(floorInput);

    if (!bid || !tid || !floorNumber) {
      setErrorMessage('请填写有效的 bid、tid 和 floor。');
      return;
    }

    onLink({
      href: `${getThreadPath(`${bid}-${tid}`)}#floor-${floorNumber}`,
    });
  };

  const handleParseLink = () => {
    const target = parseSignatureFloorLink(linkInput);

    if (!target) {
      setErrorMessage('无法解析链接，请确认链接中包含 bid 和 tid。');
      return;
    }

    setBidInput(String(target.bid));
    setTidInput(String(target.tid));
    setFloorInput(target.floor ? String(target.floor) : '');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭链接到楼层"
        className="absolute inset-0 cursor-default border-0 bg-zinc-950/45 p-0 backdrop-blur-sm dark:bg-zinc-950/65"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="floor-link-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        className="card-surface relative w-full max-w-md rounded-xl border border-zinc-200 p-4 shadow-2xl dark:border-zinc-800 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-white/10">
          <div>
            <h2 id="floor-link-title" className="text-base font-bold text-[#385772] dark:text-white">
              链接到楼层
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              填写 bid、tid 和 floor，或粘贴新旧帖子链接自动解析。
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-4 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          链接解析
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={linkInput}
              onChange={(event) => {
                setLinkInput(event.target.value);
                setErrorMessage('');
              }}
              placeholder="粘贴 /threads/2-8#floor-4 或 /bbs/content/?bid=2&tid=8#pid4"
              className="h-10 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={handleParseLink}
              className="h-10 shrink-0 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
            >
              解析并填充
            </button>
          </div>
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            bid
            <input
              inputMode="numeric"
              value={bidInput}
              onChange={(event) => {
                setBidInput(event.target.value);
                setErrorMessage('');
              }}
              placeholder="例如 2"
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>

          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            tid
            <input
              inputMode="numeric"
              value={tidInput}
              onChange={(event) => {
                setTidInput(event.target.value);
                setErrorMessage('');
              }}
              placeholder="例如 8"
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>

          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            floor
            <input
              inputMode="numeric"
              value={floorInput}
              onChange={(event) => {
                setFloorInput(event.target.value);
                setErrorMessage('');
              }}
              placeholder="例如 4"
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>
        </div>

        <div className="mt-3 min-h-5 text-xs font-semibold text-rose-600 dark:text-rose-300">
          {errorMessage}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
          >
            取消
          </button>
          <button
            type="submit"
            className="h-9 rounded-md bg-emerald-800 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
          >
            链接
          </button>
        </div>
      </form>
    </div>
  );
}

function parsePositiveInteger(value: string) {
  const number = Number.parseInt(value.trim(), 10);

  return Number.isInteger(number) && number > 0 ? number : null;
}

function RecordTitleLink({ record, children }: { record: UserRecord; children: ReactNode }) {
  return (
    <Link
      to={getThreadPathFromHref(record.href)}
      onClick={(event) => event.stopPropagation()}
      className="capubbs-title-wrap rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#385772]"
    >
      {children}
    </Link>
  );
}

function RecordJumpLink({ record }: { record: UserRecord }) {
  return (
    <Link
      to={getThreadPathFromHref(record.href)}
      onClick={(event) => event.stopPropagation()}
      className="ml-auto rounded-sm font-semibold text-teal-700 outline-none hover:text-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white"
    >
      &gt;&gt;
    </Link>
  );
}
