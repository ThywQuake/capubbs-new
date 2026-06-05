import type { CalendarEvent } from '../../types/forum';
import type { CalendarCell } from './CalendarPanel.types';

export function groupEventsByDate(events: CalendarEvent[]) {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = formatDateKey(parseDate(event.date));
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  return grouped;
}

export function collectEventsInRange(events: CalendarEvent[], start: Date, end: Date) {
  return events
    .filter((event) => {
      const eventDate = parseDate(event.date);
      return isWithinRange(eventDate, start, end);
    })
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
}

export function buildMonthCells(monthStart: Date, minDate: Date, maxDate: Date) {
  const start = startOfWeek(startOfMonth(monthStart));

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      disabled: isBefore(date, minDate) || isAfter(date, maxDate),
    };
  });
}

export function chunkWeeks(cells: CalendarCell[]) {
  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

export function clampDateToRange(date: Date, minDate: Date, maxDate: Date) {
  if (isBefore(date, minDate)) {
    return new Date(minDate);
  }

  if (isAfter(date, maxDate)) {
    return new Date(maxDate);
  }

  return startOfDay(date);
}

export function shiftMonths(date: Date, delta: number) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const totalMonths = year * 12 + month + delta;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;
  const day = Math.min(date.getDate(), daysInMonth(targetYear, targetMonth));

  return startOfDay(new Date(targetYear, targetMonth, day));
}

export function getMaxDate(reference: Date) {
  return startOfDay(new Date(reference.getFullYear() + 1, reference.getMonth(), reference.getDate()));
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function getWeekNumber(date: Date) {
  const firstWeekStart = startOfWeek(new Date(date.getFullYear(), 0, 1));
  const diffMs = startOfWeek(date).getTime() - firstWeekStart.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function isWithinRange(date: Date, start: Date, end: Date) {
  return !isBefore(date, start) && !isAfter(date, end);
}

export function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

export function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatMonthLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}月`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isBefore(left: Date, right: Date) {
  return left.getTime() < right.getTime();
}

function isAfter(left: Date, right: Date) {
  return left.getTime() > right.getTime();
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}
