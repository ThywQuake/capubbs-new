import { CalendarDays, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLegacyBbs } from '../../api/LegacyBbsDataContext';
import type { CalendarEvent } from '../../types/forum';
import { joinClassNames } from '../../utils/classNames';
import { canManageCalendarEvents } from '../../utils/viewerPermissions';
import { CalendarEventList } from './CalendarEventList';
import { MIN_DATE, weekdays } from './CalendarPanel.constants';
import type { CalendarCell } from './CalendarPanel.types';
import {
  addDays,
  buildMonthCells,
  chunkWeeks,
  clampDateToRange,
  collectEventsInRange,
  formatDateKey,
  formatDateLabel,
  formatMonthLabel,
  getMaxDate,
  getWeekNumber,
  groupEventsByDate,
  isSameDay,
  isSameMonth,
  isWithinRange,
  shiftMonths,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './CalendarPanel.utils';
import { CalendarYearPicker } from './CalendarYearPicker';

type CalendarPanelProps = {
  events: CalendarEvent[];
};

export function CalendarPanel({ events }: CalendarPanelProps) {
  const legacyBbs = useLegacyBbs();
  const [today] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => clampDateToRange(today, MIN_DATE, getMaxDate(today)));
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(() => startOfWeek(today));
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const maxDate = useMemo(() => getMaxDate(today), [today]);
  const selectedMonth = startOfMonth(selectedDate);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const visibleCells = useMemo(
    () => buildMonthCells(selectedMonth, MIN_DATE, maxDate),
    [selectedMonth, maxDate],
  );
  const visibleWeeks = useMemo(
    () => chunkWeeks(visibleCells).filter((week) => week.some((cell) => isSameMonth(cell.date, selectedMonth))),
    [visibleCells, selectedMonth],
  );
  const years = useMemo(() => {
    const maxYear = maxDate.getFullYear();
    return Array.from({ length: maxYear - 1995 + 1 }, (_, index) => maxYear - index);
  }, [maxDate]);
  const selectedWeekEnd = selectedWeekStart ? addDays(selectedWeekStart, 6) : null;
  const selectedEvents =
    selectedWeekStart && selectedWeekEnd
      ? collectEventsInRange(events, selectedWeekStart, selectedWeekEnd)
      : eventsByDate.get(formatDateKey(selectedDate)) ?? [];
  const selectedDateLabel =
    selectedWeekStart && selectedWeekEnd
      ? `第${getWeekNumber(selectedWeekStart)}周 · ${formatDateLabel(selectedWeekStart)} - ${formatDateLabel(selectedWeekEnd)}`
      : formatDateLabel(selectedDate);
  const todayWeekStart = startOfWeek(today);
  const todayWeekEnd = addDays(todayWeekStart, 6);
  const isFocusedOnCurrentWeek = selectedWeekStart
    ? isSameDay(selectedWeekStart, todayWeekStart)
    : isWithinRange(selectedDate, todayWeekStart, todayWeekEnd);
  const shouldShowCurrentWeekButton = !isFocusedOnCurrentWeek;
  const canGoPrevMonth = startOfMonth(shiftMonths(selectedDate, -1)) >= startOfMonth(MIN_DATE);
  const canGoNextMonth = startOfMonth(shiftMonths(selectedDate, 1)) <= startOfMonth(maxDate);

  useEffect(() => {
    if (!isYearPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) {
        return;
      }
      setIsYearPickerOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsYearPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isYearPickerOpen]);

  const moveMonth = (delta: number) => {
    setSelectedWeekStart(null);
    setSelectedDate((current) => clampDateToRange(shiftMonths(current, delta), MIN_DATE, maxDate));
  };

  const selectYear = (year: number) => {
    setSelectedWeekStart(null);
    setSelectedDate((current) =>
      clampDateToRange(new Date(year, current.getMonth(), current.getDate()), MIN_DATE, maxDate),
    );
    setIsYearPickerOpen(false);
  };

  const returnToCurrentWeek = () => {
    setSelectedDate(today);
    setSelectedWeekStart(todayWeekStart);
    setIsYearPickerOpen(false);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(clampDateToRange(date, MIN_DATE, maxDate));
    setSelectedWeekStart(null);
  };

  const selectWeek = (week: CalendarCell[]) => {
    const firstSelectableCell = week.find((cell) => !cell.disabled);

    if (!firstSelectableCell) {
      return;
    }

    const weekStart = startOfWeek(firstSelectableCell.date);
    const weekEnd = addDays(weekStart, 6);
    const focusDate = isWithinRange(today, weekStart, weekEnd) ? today : firstSelectableCell.date;

    setSelectedDate(clampDateToRange(focusDate, MIN_DATE, maxDate));
    setSelectedWeekStart(weekStart);
    setIsYearPickerOpen(false);
  };

  return (
    <section
      ref={panelRef}
      className="card-surface relative rounded-lg border border-zinc-200 p-3 shadow-panel dark:border-zinc-800"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
          <CalendarDays size={15} className="text-emerald-700/80 dark:text-emerald-200/80" />
          <span>活动日历</span>
        </h2>
        {shouldShowCurrentWeekButton ? (
          <button
            type="button"
            onClick={returnToCurrentWeek}
            className="rounded-md border border-[#A4C1AC]/60 bg-[#A4C1AC]/28 px-2.5 py-1 text-xs font-semibold text-[#385772] shadow-sm transition hover:border-[#A4C1AC]/80 hover:bg-[#A4C1AC]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-[#A4C1AC]/20 dark:bg-[#A4C1AC]/12 dark:text-white dark:hover:border-[#A4C1AC]/35 dark:hover:bg-[#A4C1AC]/18"
          >
            回到本周
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={() => setIsYearPickerOpen((value) => !value)}
          className="justify-self-end rounded-md border border-white/25 bg-white/[0.38] px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
          aria-expanded={isYearPickerOpen}
        >
          {selectedDate.getFullYear()}
        </button>
      </div>

      {isYearPickerOpen ? (
        <CalendarYearPicker
          selectedYear={selectedDate.getFullYear()}
          years={years}
          onSelectYear={selectYear}
        />
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="上一月"
          disabled={!canGoPrevMonth}
          onClick={() => moveMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/[0.38] text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1 text-center text-sm font-semibold text-zinc-950 dark:text-white">
          {formatMonthLabel(selectedDate)}
        </div>
        <button
          type="button"
          aria-label="下一月"
          disabled={!canGoNextMonth}
          onClick={() => moveMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/[0.38] text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[1.4rem_repeat(7,minmax(0,1fr))] gap-1 text-center text-[0.68rem] text-zinc-500 dark:text-zinc-400">
        <div className="h-5">W</div>
        {weekdays.map((day) => (
          <div
            key={day.label}
            className={joinClassNames(
              'h-5',
              day.isWeekend && 'text-rose-700/55 dark:text-rose-200/55',
            )}
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.4rem_repeat(7,minmax(0,1fr))] gap-1">
        {visibleWeeks.map((week) => {
          const weekStart = startOfWeek(week[0].date);
          const weekNumber = getWeekNumber(weekStart);
          const isSelectableWeek = week.some((cell) => !cell.disabled);
          const isSelectedWeek =
            selectedWeekStart !== null && isSameDay(selectedWeekStart, weekStart);

          return (
            <div key={`week-row-${formatDateKey(weekStart)}`} className="contents">
              <button
                type="button"
                disabled={!isSelectableWeek}
                aria-label={`选择第${weekNumber}周`}
                onClick={() => selectWeek(week)}
                className={joinClassNames(
                  'm-auto flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border text-[0.54rem] font-semibold leading-none transition',
                  !isSelectableWeek && 'cursor-not-allowed opacity-30',
                  isSelectableWeek && !isSelectedWeek && 'card-option border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
                  isSelectedWeek && 'border-[#A4C1AC]/80 bg-[#A4C1AC]/36 text-[#385772] dark:border-[#A4C1AC]/35 dark:bg-[#A4C1AC]/14 dark:text-white',
                )}
              >
                {weekNumber}
              </button>
              {week.map((cell) => {
                const isCurrentMonth = isSameMonth(cell.date, selectedMonth);
                const isSelectedDate = selectedWeekStart === null && isSameDay(cell.date, selectedDate);
                const isToday = isSameDay(cell.date, today);
                const isInTodayWeek = !cell.disabled && isWithinRange(cell.date, todayWeekStart, todayWeekEnd);
                const isInSelectedWeek =
                  selectedWeekStart !== null &&
                  selectedWeekEnd !== null &&
                  !cell.disabled &&
                  isWithinRange(cell.date, selectedWeekStart, selectedWeekEnd);
                const hasEvent = (eventsByDate.get(formatDateKey(cell.date)) ?? []).length > 0;

                return (
                  <button
                    key={formatDateKey(cell.date)}
                    type="button"
                    disabled={cell.disabled}
                    onClick={() => !cell.disabled && selectDate(cell.date)}
                    className={joinClassNames(
                      'relative flex aspect-square items-center justify-center rounded-md text-xs transition',
                      cell.disabled && 'cursor-not-allowed opacity-30',
                      !cell.disabled && !isSelectedDate && !isInSelectedWeek && 'card-option',
                      isCurrentMonth ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600',
                      isInTodayWeek &&
                        selectedWeekStart === null &&
                        !isSelectedDate &&
                        !isToday &&
                        'bg-[#A4C1AC]/22 dark:bg-[#A4C1AC]/10',
                      isInSelectedWeek && !isToday && 'bg-[#A4C1AC]/36 font-semibold text-[#385772] ring-1 ring-[#A4C1AC]/55 dark:bg-[#A4C1AC]/14 dark:text-white dark:ring-[#A4C1AC]/24',
                      isSelectedDate && !isToday && 'bg-[#A4C1AC]/36 font-semibold text-[#385772] ring-1 ring-[#A4C1AC]/55 dark:bg-[#A4C1AC]/14 dark:text-white dark:ring-[#A4C1AC]/24',
                      isToday && 'bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:ring-teal-800/70',
                    )}
                  >
                    {cell.date.getDate()}
                    {hasEvent ? (
                      <span
                        className={joinClassNames(
                          'absolute bottom-0.5 h-1 w-1 rounded-full',
                          isToday ? 'bg-teal-700 dark:bg-teal-200' : isSelectedDate ? 'bg-[#385772] dark:bg-white' : 'bg-emerald-500',
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {canManageCalendarEvents(legacyBbs.viewer) ? (
        <Link
          to="/calendar-admin"
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#A4C1AC]/70 bg-[#A4C1AC]/24 px-3 text-xs font-bold text-[#385772] transition hover:border-[#A4C1AC]/90 hover:bg-[#A4C1AC]/36 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-[#A4C1AC]/20 dark:bg-[#A4C1AC]/10 dark:text-white dark:hover:border-[#A4C1AC]/35 dark:hover:bg-[#A4C1AC]/16"
        >
          <Settings size={14} />
          管理日历
        </Link>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{selectedDateLabel}</h3>
      </div>

      <div className="mt-2 space-y-2">
        <CalendarEventList events={selectedEvents} />
      </div>
    </section>
  );
}
