import type { ReactNode } from 'react';
import { joinClassNames } from '../../utils/classNames';

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  primary?: boolean;
  onClick?: () => void;
};

export function ActionButton({ icon, label, primary = false, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClassNames(
        'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
        primary
          ? 'bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-zinc-100 dark:hover:bg-white/[0.12]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
