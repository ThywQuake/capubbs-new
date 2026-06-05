import type { ReactNode } from 'react';
import { joinClassNames } from '../../utils/classNames';

export type SegmentedTabOption<TKey extends string> = {
  key: TKey;
  label: string;
  icon?: ReactNode;
};

type SegmentedTabsProps<TKey extends string> = {
  activeKey: TKey;
  options: Array<SegmentedTabOption<TKey>>;
  onChange: (key: TKey) => void;
  ariaLabel?: string;
  className?: string;
};

export function SegmentedTabs<TKey extends string>({
  activeKey,
  ariaLabel,
  className,
  options,
  onChange,
}: SegmentedTabsProps<TKey>) {
  return (
    <div
      aria-label={ariaLabel}
      className={joinClassNames(
        'segmented-tabs-surface scrollbar-none flex gap-1 overflow-x-auto rounded-lg border p-1 shadow-sm',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = activeKey === option.key;

        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.key)}
            className={joinClassNames(
              'flex h-10 min-w-[4.25rem] flex-1 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
              isActive
                ? 'card-surface border-zinc-200/80 text-zinc-950 shadow-sm dark:border-zinc-700/70 dark:text-white'
                : 'border-transparent bg-transparent text-zinc-700 hover:text-zinc-950 dark:text-white/[0.76] dark:hover:text-white',
            )}
          >
            {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
