import { joinClassNames } from '../../utils/classNames';

type CalendarYearPickerProps = {
  selectedYear: number;
  years: number[];
  onSelectYear: (year: number) => void;
};

export function CalendarYearPicker({
  selectedYear,
  years,
  onSelectYear,
}: CalendarYearPickerProps) {
  return (
    <div className="absolute right-4 top-14 z-30 w-60 rounded-lg border border-white/30 bg-white/[0.92] p-2 shadow-2xl backdrop-blur-[18px] dark:border-white/15 dark:bg-zinc-950/[0.9]">
      <div className="scrollbar-none flex h-72 flex-wrap content-start gap-2 overflow-y-auto pr-1">
        {years.map((year) => {
          const isSelectedYear = year === selectedYear;

          return (
            <button
              key={year}
              type="button"
              aria-label={year === 1995 ? '1995，协会伊始' : String(year)}
              onClick={() => onSelectYear(year)}
              className={joinClassNames(
                'rounded-md border px-3 py-1.5 text-sm font-semibold transition',
                isSelectedYear
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                  : 'border-zinc-200 bg-white/80 text-zinc-700 hover:border-zinc-400 hover:bg-white dark:border-zinc-800 dark:bg-white/[0.04] dark:text-white dark:hover:border-zinc-500 dark:hover:bg-white/[0.08]',
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}
