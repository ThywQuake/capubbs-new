import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  loadLegacyCalendarDateEvents,
  saveLegacyCalendarDateEvents,
} from '../api/legacyBbsClient/calendarAdmin';
import { getErrorMessage, isAbortError } from '../api/legacyBbsData/requestState';
import { weekdays } from '../components/panels/CalendarPanel.constants';
import {
  buildMonthCells,
  chunkWeeks,
  formatDateKey,
  formatDateLabel,
  groupEventsByDate,
  isSameDay,
  isSameMonth,
  shiftMonths,
  startOfDay,
  startOfMonth,
} from '../components/panels/CalendarPanel.utils';
import type { CalendarEvent } from '../types/forum';
import {
  sortCalendarEvents,
} from '../utils/calendarAdminStorage';
import { joinClassNames } from '../utils/classNames';

type CalendarAdminRouteProps = {
  initialEvents: CalendarEvent[];
  onEventsChange: (events: CalendarEvent[] | null) => void;
};

type CalendarAdminFormState = {
  date: string;
  displayText: string;
  endTime: string;
  isAllDay: boolean;
  startTime: string;
  title: string;
};

const CALENDAR_ADMIN_MIN_DATE = startOfDay(new Date(1995, 9, 25));
const CALENDAR_ADMIN_MAX_DATE = startOfDay(new Date(new Date().getFullYear() + 1, 11, 31));
const CALENDAR_ADMIN_MONTH_OPTIONS = Array.from({ length: 12 }, (_item, index) => ({
  label: `${String(index + 1).padStart(2, '0')}月`,
  value: index,
}));
const EMPTY_FORM: CalendarAdminFormState = {
  date: formatDateKey(new Date()),
  displayText: '',
  endTime: '',
  isAllDay: true,
  startTime: '',
  title: '',
};

export function CalendarAdminRoute({ initialEvents, onEventsChange }: CalendarAdminRouteProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => sortCalendarEvents(initialEvents));
  const [selectedDate, setSelectedDate] = useState(() => getInitialSelectedDate());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formState, setFormState] = useState<CalendarAdminFormState>(() => ({
    ...EMPTY_FORM,
    date: formatDateKey(selectedDate),
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectedDateLoading, setIsSelectedDateLoading] = useState(false);
  const yearOptions = useMemo(() => getCalendarAdminYearOptions(), []);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const monthCells = useMemo(
    () => buildMonthCells(visibleMonth, CALENDAR_ADMIN_MIN_DATE, CALENDAR_ADMIN_MAX_DATE),
    [visibleMonth],
  );
  const visibleWeeks = useMemo(
    () => chunkWeeks(monthCells).filter((week) => week.some((cell) => isSameMonth(cell.date, visibleMonth))),
    [monthCells, visibleMonth],
  );
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];

  useEffect(() => {
    setEvents(sortCalendarEvents(initialEvents));
  }, [initialEvents]);

  useEffect(() => {
    const controller = new AbortController();

    setIsSelectedDateLoading(true);
    loadLegacyCalendarDateEvents(selectedDateKey, controller.signal)
      .then((dateEvents) => {
        setEvents((currentEvents) => replaceEventsForDate(currentEvents, selectedDateKey, dateEvents));
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        setFormError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSelectedDateLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedDateKey]);

  const focusCalendarDate = (date: Date, shouldSyncForm = !editingKey) => {
    const nextDate = clampAdminDate(date);

    setSelectedDate(nextDate);
    setVisibleMonth(startOfMonth(nextDate));

    if (shouldSyncForm) {
      setFormState((current) => ({
        ...current,
        date: formatDateKey(nextDate),
      }));
    }

    setFormError(null);
  };

  const persistEvents = async (nextEvents: CalendarEvent[], changedDates: string[]) => {
    const sortedEvents = sortCalendarEvents(nextEvents);

    setIsSaving(true);
    setFormError(null);

    try {
      for (const date of getUniqueChangedDates(changedDates)) {
        await saveLegacyCalendarDateEvents(date, getEventsForDate(sortedEvents, date));
      }

      setEvents(sortedEvents);
      onEventsChange(sortedEvents);

      return true;
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setFormError(getErrorMessage(error));
      }

      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const selectDate = (date: Date) => {
    focusCalendarDate(date);
  };

  const moveMonth = (delta: number) => {
    focusCalendarDate(shiftMonths(visibleMonth, delta));
  };

  const selectYear = (event: ChangeEvent<HTMLSelectElement>) => {
    const year = Number(event.target.value);
    const monthIndex = isAdminMonthSelectable(year, visibleMonth.getMonth())
      ? visibleMonth.getMonth()
      : getClosestSelectableMonthIndex(year, visibleMonth.getMonth());

    focusCalendarDate(getSelectableMonthDate(year, monthIndex, selectedDate.getDate()));
  };

  const selectMonth = (event: ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = Number(event.target.value);

    focusCalendarDate(getSelectableMonthDate(visibleMonth.getFullYear(), monthIndex, selectedDate.getDate()));
  };

  const startCreate = () => {
    setEditingKey(null);
    setFormState({
      ...EMPTY_FORM,
      date: formatDateKey(selectedDate),
    });
    setFormError(null);
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingKey(getEventKey(event));
    setFormState({
      date: event.date,
      displayText: event.place,
      title: event.title,
      ...parseCalendarEventTime(event.time),
    });
    setSelectedDate(parseDate(event.date));
    setVisibleMonth(startOfMonth(parseDate(event.date)));
    setFormError(null);
  };

  const deleteEvent = async (event: CalendarEvent) => {
    const key = getEventKey(event);
    const nextEvents = events.filter((item) => getEventKey(item) !== key);

    const didPersist = await persistEvents(nextEvents, [event.date]);

    if (didPersist && editingKey === key) {
      startCreate();
    }
  };

  const submitForm = async () => {
    const title = formState.title.trim();
    const date = formState.date.trim();

    if (!title) {
      setFormError('请填写活动标题。');
      return;
    }

    if (!isDateInputValue(date)) {
      setFormError('请选择有效日期。');
      return;
    }

    const calendarTime = buildCalendarEventTime(formState);

    if (!calendarTime.ok) {
      setFormError(calendarTime.message);
      return;
    }

    const nextEvent: CalendarEvent = {
      date,
      title,
      time: calendarTime.value,
      place: formState.displayText.trim(),
    };

    const previousEvent = editingKey ? events.find((event) => getEventKey(event) === editingKey) ?? null : null;
    const nextEvents = editingKey
      ? events.map((event) => (getEventKey(event) === editingKey ? nextEvent : event))
      : [...events, nextEvent];

    const didPersist = await persistEvents(nextEvents, getChangedDateOrder(nextEvent, previousEvent));

    if (!didPersist) {
      return;
    }

    setEditingKey(getEventKey(nextEvent));
    setSelectedDate(parseDate(date));
    setVisibleMonth(startOfMonth(parseDate(date)));
    setFormState({
      date: nextEvent.date,
      displayText: nextEvent.place,
      title: nextEvent.title,
      ...parseCalendarEventTime(nextEvent.time),
    });
    setFormError(null);
  };

  const updateFormField =
    (field: keyof CalendarAdminFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setFormState((current) => ({
        ...current,
        [field]: value,
      }));

      if (field === 'date' && isDateInputValue(value)) {
        const nextDate = parseDate(value);
        setSelectedDate(nextDate);
        setVisibleMonth(startOfMonth(nextDate));
      }

      setFormError(null);
    };

  const updateAllDayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isAllDay = event.target.checked;

    setFormState((current) => ({
      ...current,
      endTime: isAllDay ? '' : current.endTime,
      isAllDay,
      startTime: isAllDay ? '' : current.startTime,
    }));
    setFormError(null);
  };

  const updateTimeField =
    (field: 'endTime' | 'startTime') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setFormState((current) => ({
        ...current,
        [field]: value,
        isAllDay: false,
      }));
      setFormError(null);
    };

  return (
    <article className="space-y-4">
      <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">日历管理</h1>
              <span className="inline-flex h-7 items-center rounded-md border border-[#A4C1AC]/70 bg-[#A4C1AC]/25 px-2.5 text-xs font-bold text-[#385772] dark:border-emerald-100/15 dark:bg-emerald-200/10 dark:text-emerald-100">
                管理员
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              配置首页右侧月历活动
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-3 text-sm font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <ArrowLeft size={15} />
              返回论坛
            </Link>
            <button
              type="button"
              disabled={isSaving}
              onClick={startCreate}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#385772] px-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#29445f] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
            >
              <Plus size={15} />
              新增活动
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(24rem,1.1fr)]">
          <div className="space-y-4">
            <section className="rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="上一月"
                  onClick={() => moveMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex min-w-0 flex-1 justify-center gap-2">
                  <select
                    aria-label="选择年份"
                    value={visibleMonth.getFullYear()}
                    onChange={selectYear}
                    className="h-9 min-w-0 rounded-md border border-zinc-200 bg-white/75 px-2 text-sm font-bold text-[#385772] outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="选择月份"
                    value={visibleMonth.getMonth()}
                    onChange={selectMonth}
                    className="h-9 min-w-0 rounded-md border border-zinc-200 bg-white/75 px-2 text-sm font-bold text-[#385772] outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  >
                    {CALENDAR_ADMIN_MONTH_OPTIONS.map((month) => (
                      <option
                        key={month.value}
                        value={month.value}
                        disabled={!isAdminMonthSelectable(visibleMonth.getFullYear(), month.value)}
                      >
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  aria-label="下一月"
                  onClick={() => moveMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {weekdays.map((day) => (
                  <div
                    key={day.label}
                    className={joinClassNames(
                      'h-7',
                      day.isWeekend && 'text-rose-700/60 dark:text-rose-200/70',
                    )}
                  >
                    {day.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {visibleWeeks.flat().map((cell) => {
                  const key = formatDateKey(cell.date);
                  const hasEvent = (eventsByDate.get(key) ?? []).length > 0;
                  const isCurrentMonth = isSameMonth(cell.date, visibleMonth);
                  const isSelected = isSameDay(cell.date, selectedDate);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={cell.disabled}
                      onClick={() => !cell.disabled && selectDate(cell.date)}
                      className={joinClassNames(
                        'relative flex aspect-square min-h-10 items-center justify-center rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
                        cell.disabled && 'cursor-not-allowed opacity-30',
                        !cell.disabled && !isSelected && 'border border-zinc-200 bg-white/60 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.1]',
                        isCurrentMonth ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600',
                        isSelected && 'bg-[#385772] text-white shadow-sm dark:bg-emerald-200 dark:text-zinc-950',
                      )}
                    >
                      {cell.date.getDate()}
                      {hasEvent ? (
                        <span
                          className={joinClassNames(
                            'absolute bottom-1.5 h-1.5 w-1.5 rounded-full',
                            isSelected ? 'bg-white dark:bg-zinc-950' : 'bg-emerald-500',
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#385772] dark:text-white">
                  <CalendarDays size={17} />
                  {formatDateLabel(selectedDate)}
                </h2>
                <span className="rounded-md border border-zinc-200 bg-white/70 px-2.5 py-1 text-xs font-bold text-[#875A41] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
                  {isSelectedDateLoading ? '读取中' : `${selectedEvents.length} 项`}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {selectedEvents.length > 0 ? (
                  selectedEvents.map((event) => (
                    <div
                      key={getEventKey(event)}
                      className="rounded-lg border border-zinc-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-zinc-950 dark:text-white">{event.title}</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {formatCalendarEventMeta(event)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label="编辑活动"
                            disabled={isSaving}
                            onClick={() => startEdit(event)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="删除活动"
                            disabled={isSaving}
                            onClick={() => deleteEvent(event)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    选中日期暂无活动
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-zinc-200 bg-white/45 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#385772] dark:text-white">
                {editingKey ? '编辑日历活动' : '新增日历活动'}
              </h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">标题</span>
                <input
                  value={formState.title}
                  onChange={updateFormField('title')}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white/75 px-3 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
                  placeholder="请输入活动名"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">日期</span>
                <input
                  type="date"
                  value={formState.date}
                  onChange={updateFormField('date')}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white/75 px-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </label>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">时间</span>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#385772] dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={formState.isAllDay}
                      onChange={updateAllDayChange}
                      className="h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] dark:border-white/20 dark:bg-white/[0.06]"
                    />
                    全天
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">开始时间</span>
                    <input
                      type="time"
                      step={300}
                      value={formState.startTime}
                      disabled={formState.isAllDay}
                      onChange={updateTimeField('startTime')}
                      className="h-10 w-full rounded-lg border border-zinc-200 bg-white/75 px-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">结束时间</span>
                    <input
                      type="time"
                      step={300}
                      value={formState.endTime}
                      disabled={formState.isAllDay}
                      onChange={updateTimeField('endTime')}
                      className="h-10 w-full rounded-lg border border-zinc-200 bg-white/75 px-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    />
                  </label>
                </div>
              </div>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">显示文本</span>
                <input
                  value={formState.displayText}
                  onChange={updateFormField('displayText')}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white/75 px-3 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
                  placeholder="地点、备注或展示说明"
                />
              </label>
            </div>

            {formError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100">
                {formError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={submitForm}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#29445f] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
              >
                <Save size={16} />
                {isSaving ? '保存中' : '保存'}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={startCreate}
                className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white/70 px-4 text-sm font-bold text-[#385772] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
              >
                取消
              </button>
            </div>
          </section>
        </div>
      </section>
    </article>
  );
}

function getInitialSelectedDate() {
  return clampAdminDate(new Date());
}

function replaceEventsForDate(events: CalendarEvent[], date: string, dateEvents: CalendarEvent[]) {
  return sortCalendarEvents([
    ...events.filter((event) => event.date !== date),
    ...dateEvents,
  ]);
}

function getEventsForDate(events: CalendarEvent[], date: string) {
  return sortCalendarEvents(events.filter((event) => event.date === date));
}

function getChangedDateOrder(nextEvent: CalendarEvent, previousEvent: CalendarEvent | null) {
  return previousEvent ? [nextEvent.date, previousEvent.date] : [nextEvent.date];
}

function getUniqueChangedDates(dates: string[]) {
  return dates.reduce<string[]>((result, date) => {
    if (date && !result.includes(date)) {
      result.push(date);
    }

    return result;
  }, []);
}

function getCalendarAdminYearOptions() {
  const minYear = CALENDAR_ADMIN_MIN_DATE.getFullYear();
  const maxYear = CALENDAR_ADMIN_MAX_DATE.getFullYear();

  return Array.from({ length: maxYear - minYear + 1 }, (_item, index) => maxYear - index);
}

function getSelectableMonthDate(year: number, monthIndex: number, preferredDay: number) {
  const day = Math.min(preferredDay, getDaysInMonth(year, monthIndex));

  return clampAdminDate(new Date(year, monthIndex, day));
}

function getClosestSelectableMonthIndex(year: number, preferredMonthIndex: number) {
  if (year <= CALENDAR_ADMIN_MIN_DATE.getFullYear()) {
    return Math.max(preferredMonthIndex, CALENDAR_ADMIN_MIN_DATE.getMonth());
  }

  if (year >= CALENDAR_ADMIN_MAX_DATE.getFullYear()) {
    return Math.min(preferredMonthIndex, CALENDAR_ADMIN_MAX_DATE.getMonth());
  }

  return preferredMonthIndex;
}

function isAdminMonthSelectable(year: number, monthIndex: number) {
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const monthEnd = startOfDay(new Date(year, monthIndex + 1, 0));

  return monthEnd.getTime() >= CALENDAR_ADMIN_MIN_DATE.getTime() && monthStart.getTime() <= CALENDAR_ADMIN_MAX_DATE.getTime();
}

function clampAdminDate(date: Date) {
  const target = startOfDay(date);

  if (target.getTime() < CALENDAR_ADMIN_MIN_DATE.getTime()) {
    return CALENDAR_ADMIN_MIN_DATE;
  }

  if (target.getTime() > CALENDAR_ADMIN_MAX_DATE.getTime()) {
    return CALENDAR_ADMIN_MAX_DATE;
  }

  return target;
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseCalendarEventTime(value: string): Pick<CalendarAdminFormState, 'endTime' | 'isAllDay' | 'startTime'> {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === '全天') {
    return {
      endTime: '',
      isAllDay: true,
      startTime: '',
    };
  }

  const rangeMatch = trimmedValue.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);

  if (rangeMatch) {
    return {
      endTime: rangeMatch[2],
      isAllDay: false,
      startTime: rangeMatch[1],
    };
  }

  const singleTimeMatch = trimmedValue.match(/^(\d{2}:\d{2})$/);

  if (singleTimeMatch) {
    return {
      endTime: '',
      isAllDay: false,
      startTime: singleTimeMatch[1],
    };
  }

  return {
    endTime: '',
    isAllDay: true,
    startTime: '',
  };
}

function buildCalendarEventTime(formState: CalendarAdminFormState):
  | { ok: true; value: string }
  | { message: string; ok: false } {
  if (formState.isAllDay) {
    return {
      ok: true,
      value: '全天',
    };
  }

  if (!isTimeInputValue(formState.startTime)) {
    return {
      message: '请选择开始时间，或勾选全天。',
      ok: false,
    };
  }

  if (formState.endTime && !isTimeInputValue(formState.endTime)) {
    return {
      message: '请选择有效结束时间。',
      ok: false,
    };
  }

  if (formState.endTime && formState.endTime < formState.startTime) {
    return {
      message: '结束时间不能早于开始时间。',
      ok: false,
    };
  }

  return {
    ok: true,
    value: formState.endTime ? `${formState.startTime} - ${formState.endTime}` : formState.startTime,
  };
}

function formatCalendarEventMeta(event: CalendarEvent) {
  return [event.time, event.place].filter((value) => value.trim()).join(' · ');
}

function getEventKey(event: CalendarEvent) {
  return `${event.date}-${event.time}-${event.title}-${event.place}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return startOfDay(new Date(year, month - 1, day));
}

function isDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeInputValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
