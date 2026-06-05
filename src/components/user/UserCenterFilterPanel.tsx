import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { UserCenterFilterResult } from '../../types/userCenter';

type UserCenterFilterPanelProps = {
  activePanelLabel: string;
  endDate: string;
  filterKeyword: string;
  filteredResult: UserCenterFilterResult;
  startDate: string;
  onEndDateChange: (value: string) => void;
  onFilterKeywordChange: (value: string) => void;
  onReset: () => void;
  onStartDateChange: (value: string) => void;
};

export function UserCenterFilterPanel({
  activePanelLabel,
  endDate,
  filterKeyword,
  filteredResult,
  startDate,
  onEndDateChange,
  onFilterKeywordChange,
  onReset,
  onStartDateChange,
}: UserCenterFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeFilterCount = [
    filterKeyword.trim().length > 0,
    startDate.length > 0,
    endDate.length > 0,
  ].filter(Boolean).length;
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#385772] dark:text-white">筛选器</span>
            <span className="rounded-full border border-emerald-700/20 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:border-white/10 dark:text-emerald-100">
              {activePanelLabel}
            </span>
            {activeFilterCount > 0 && (
              <span className="rounded-full border border-[#875A41]/20 px-2 py-0.5 text-xs font-semibold text-[#875A41] dark:border-white/10 dark:text-zinc-200">
                {activeFilterCount} 项
              </span>
            )}
          </span>
          <span className="mt-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            显示 {filteredResult.records.length} / {filteredResult.limitedCount} 条
            {filteredResult.limitedCount < filteredResult.matchedCount ? `，筛中 ${filteredResult.matchedCount} 条` : ''}
          </span>
        </span>
        <ChevronIcon size={17} className="shrink-0 text-[#385772] dark:text-white" />
      </button>

      {isExpanded && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            关键词
            <input
              value={filterKeyword}
              onChange={(event) => onFilterKeywordChange(event.target.value)}
              placeholder={`筛选${activePanelLabel}内容`}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              起始时间
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              结束时间
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => onEndDateChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-4 h-9 w-full rounded-md border border-zinc-200 bg-white/70 text-sm font-semibold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
          >
            重置筛选
          </button>
        </div>
      )}
    </section>
  );
}
