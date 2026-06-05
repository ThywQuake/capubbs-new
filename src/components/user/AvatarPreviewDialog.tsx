import { X } from 'lucide-react';
import { useEffect } from 'react';

type AvatarPreviewDialogProps = {
  avatarSrc: string;
  open: boolean;
  userId: string;
  onClose: () => void;
};

export function AvatarPreviewDialog({ avatarSrc, open, userId, onClose }: AvatarPreviewDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 backdrop-blur-[3px]">
      <button type="button" aria-label="关闭头像详情" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-preview-title"
        className="card-surface relative w-full max-w-sm rounded-lg border border-zinc-200 p-4 shadow-2xl dark:border-zinc-800"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-white/10">
          <h2 id="avatar-preview-title" className="text-base font-semibold text-[#385772] dark:text-white">
            {userId}的头像
          </h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg bg-zinc-100 p-3 dark:bg-white/[0.06]">
          <img src={avatarSrc} alt={`${userId}的头像`} className="mx-auto aspect-square w-full max-w-72 rounded-md object-cover" />
        </div>
      </section>
    </div>
  );
}
