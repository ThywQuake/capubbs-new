import { Check } from 'lucide-react';
import type { ListPageSize } from '../../types/listDisplay';
import { listPageSizeOptions } from '../../types/listDisplay';
import { joinClassNames } from '../../utils/classNames';

type ListDisplayToolbarProps = {
  compact: boolean;
  compactLocked?: boolean;
  pageSize: ListPageSize;
  onCompactChange: (compact: boolean) => void;
  onPageSizeChange: (pageSize: ListPageSize) => void;
};

export function ListDisplayToolbar({
  compact,
  compactLocked = false,
  pageSize,
  onCompactChange,
  onPageSizeChange,
}: ListDisplayToolbarProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label
        className={joinClassNames(
          'inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white/65 px-3 text-sm font-semibold text-[#385772] shadow-sm backdrop-blur-[2px] transition dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
          compactLocked
            ? 'cursor-default opacity-75'
            : 'cursor-pointer hover:bg-zinc-100/80 hover:text-zinc-950 dark:hover:bg-white/[0.1] dark:hover:text-white',
        )}
      >
        <input
          type="checkbox"
          checked={compact}
          disabled={compactLocked}
          onChange={(event) => onCompactChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={joinClassNames(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#385772]',
            compact
              ? 'border-[#385772] bg-[#385772] text-white dark:border-emerald-100 dark:bg-emerald-100 dark:text-zinc-950'
              : 'border-zinc-300 bg-white/70 text-transparent dark:border-white/20 dark:bg-white/[0.06]',
          )}
          aria-hidden="true"
        >
          <Check size={14} strokeWidth={3} />
        </span>
        <span>紧凑模式</span>
      </label>

      <div className="inline-flex h-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white/65 p-1 shadow-sm backdrop-blur-[2px] dark:border-white/10 dark:bg-white/[0.06]">
        {listPageSizeOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onPageSizeChange(option)}
            className={joinClassNames(
              'min-w-10 rounded-md px-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
              pageSize === option
                ? 'bg-[#385772] text-white shadow-sm dark:bg-white dark:text-zinc-950'
                : 'text-[#385772] hover:bg-zinc-100/80 hover:text-zinc-950 dark:text-white/75 dark:hover:bg-white/[0.1] dark:hover:text-white',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
