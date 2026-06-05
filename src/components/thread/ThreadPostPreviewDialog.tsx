import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Avatar } from '../common/Avatar';
import type { ThreadFloor } from '../../types/forum';
import { formatPostTimestamp } from '../../utils/formatPostTimestamp';
import { ThreadFloorContentFrame, ThreadFloorSignatureFrame } from './ThreadFloorContentFrame';

type ThreadPostPreviewDialogProps = {
  currentAccountId: number | null;
  floor: ThreadFloor;
  onClose: () => void;
  subtitle: string;
  threadTitle?: string;
  title: string;
};

export function ThreadPostPreviewDialog({
  currentAccountId,
  floor,
  onClose,
  subtitle,
  threadTitle,
  title,
}: ThreadPostPreviewDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="thread-post-preview-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 dark:bg-black/80"
    >
      <div className="max-h-[min(90vh,52rem)] w-full max-w-5xl overflow-y-auto rounded-lg border border-zinc-200 bg-[#f7f3ea] shadow-2xl dark:border-white/10 dark:bg-zinc-950">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200/80 p-4 dark:border-white/10 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#875A41] dark:text-white/60">{subtitle}</p>
            <h2 id="thread-post-preview-dialog-title" className="capubbs-title-wrap mt-2 text-xl font-bold text-[#385772] dark:text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭预览"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-4 sm:p-5">
          {threadTitle ? (
            <h3 className="capubbs-title-wrap mb-4 text-2xl font-bold leading-tight text-zinc-900 dark:text-white">
              {threadTitle}
            </h3>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white/80 shadow-panel dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="grid min-w-0 grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
              <aside className="border-b border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:border-b-0 sm:border-r">
                <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                  <Avatar
                    alt={`${floor.author.name} 头像`}
                    cacheKey={floor.author.id.trim() ? `username:${floor.author.id.trim()}` : undefined}
                    className="h-14 w-14"
                    src={floor.author.avatarSrc}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#385772] dark:text-white">{floor.author.name}</p>
                    {floor.author.role ? (
                      <p className="mt-1 text-xs font-semibold text-[#875A41] dark:text-emerald-100">{floor.author.role}</p>
                    ) : null}
                  </div>
                </div>
              </aside>

              <div className="min-w-0 p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <span>#{floor.floor}</span>
                  <span>{formatPostTimestamp(floor.time)}</span>
                </div>

                <ThreadFloorContentFrame
                  currentAccountId={currentAccountId}
                  floor={floor}
                  isActivitySignupCanceled={false}
                />

                {floor.attachments && floor.attachments.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {floor.attachments.map((attachment, attachmentIndex) => (
                      <a
                        key={`${attachment.href}-${attachment.name}-${attachmentIndex}`}
                        href={attachment.href}
                        className="min-w-0 truncate rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm font-semibold text-[#385772] hover:underline dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                      >
                        {attachment.name}
                      </a>
                    ))}
                  </div>
                ) : null}

                {hasFloorSignature(floor) ? (
                  <div className="mt-5 border-t border-dashed border-zinc-300/80 pt-3 dark:border-white/15">
                    <ThreadFloorSignatureFrame currentAccountId={currentAccountId} floor={floor} />
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function hasFloorSignature(floor: ThreadFloor) {
  return Boolean(floor.signatureHtml?.trim() || floor.signature?.some((line) => line.trim().length > 0));
}
