import { KeyRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type AccountSecurityDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (draft: { newPassword: string; oldPassword: string }) => Promise<void>;
};

export function AccountSecurityDialog({ open, onClose, onSubmit }: AccountSecurityDialogProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError('');
    setIsSubmitting(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');

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

  const canSubmit = oldPassword.length > 0 && newPassword.length > 0 && newPassword === confirmPassword && !isSubmitting;
  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit?.({ newPassword, oldPassword });
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 px-4 backdrop-blur-[3px]">
      <button type="button" aria-label="关闭账号安全窗口" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-security-title"
        className="card-surface relative w-full max-w-md rounded-lg border border-zinc-200 p-4 shadow-2xl dark:border-zinc-800"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
              <KeyRound size={18} />
            </span>
            <h2 id="account-security-title" className="text-base font-semibold text-[#385772] dark:text-white">
              修改密码
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            原密码
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            新密码
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            确认密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
          </label>
          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm font-semibold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white dark:hover:bg-white/[0.08]"
          >
            忘记密码
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-9 rounded-md bg-emerald-800 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
            >
              {isSubmitting ? '修改中' : '确认修改'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '修改失败，请稍后再试';
}
