import { useState } from 'react';
import type { ReactNode } from 'react';
import { joinClassNames } from '../../utils/classNames';

type MetricProps = {
  icon: ReactNode;
  label: number;
};

export function Metric({ icon, label }: MetricProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="shrink-0 text-emerald-700/80 dark:text-emerald-200/80">{icon}</span>
      <span className="text-zinc-950 dark:text-white">{label}</span>
    </span>
  );
}

type ToggleMetricProps = {
  icon: ReactNode;
  label: number;
  activeLabel: string;
  inactiveLabel: string;
  isActive?: boolean;
  isBusy?: boolean;
  onActiveChange?: (isActive: boolean) => void;
};

export function ToggleMetric({
  icon,
  label,
  activeLabel,
  inactiveLabel,
  isActive,
  isBusy = false,
  onActiveChange,
}: ToggleMetricProps) {
  const [localIsActive, setLocalIsActive] = useState(false);
  const currentIsActive = isActive ?? localIsActive;
  const visibleLabel = isActive === undefined && currentIsActive ? label + 1 : label;

  return (
    <button
      type="button"
      aria-pressed={currentIsActive}
      aria-label={currentIsActive ? activeLabel : inactiveLabel}
      disabled={isBusy}
      onClick={(event) => {
        event.stopPropagation();
        if (isBusy) {
          return;
        }

        const nextIsActive = !currentIsActive;

        if (isActive === undefined) {
          setLocalIsActive(nextIsActive);
        }

        onActiveChange?.(nextIsActive);
      }}
      className="inline-flex items-center gap-1.5 rounded-md outline-none transition hover:bg-emerald-50/70 focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-emerald-950/40"
    >
      <span
        className={joinClassNames(
          'shrink-0 text-emerald-700/80 dark:text-emerald-200/80',
          currentIsActive && '[&_svg]:fill-current',
        )}
      >
        {icon}
      </span>
      <span className="text-zinc-950 dark:text-white">{visibleLabel}</span>
    </button>
  );
}
