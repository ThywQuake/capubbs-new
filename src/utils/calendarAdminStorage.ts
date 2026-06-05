import type { CalendarEvent } from '../types/forum';

const CALENDAR_ADMIN_EVENTS_STORAGE_KEY = 'capubbs-calendar-admin-events';

export function readCalendarAdminEventsOverride() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedEvents = window.localStorage.getItem(CALENDAR_ADMIN_EVENTS_STORAGE_KEY);

    if (!storedEvents) {
      return null;
    }

    const parsedEvents: unknown = JSON.parse(storedEvents);

    if (!Array.isArray(parsedEvents)) {
      return null;
    }

    return sortCalendarEvents(parsedEvents.map(normalizeCalendarEvent).filter(isCalendarEvent));
  } catch {
    return null;
  }
}

export function saveCalendarAdminEventsOverride(events: CalendarEvent[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      CALENDAR_ADMIN_EVENTS_STORAGE_KEY,
      JSON.stringify(sortCalendarEvents(events).map(normalizeCalendarEvent).filter(isCalendarEvent)),
    );
  } catch {
    return;
  }
}

export function clearCalendarAdminEventsOverride() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(CALENDAR_ADMIN_EVENTS_STORAGE_KEY);
  } catch {
    return;
  }
}

export function sortCalendarEvents(events: CalendarEvent[]) {
  return [...events].sort((left, right) => getCalendarEventSortKey(left).localeCompare(getCalendarEventSortKey(right)));
}

function normalizeCalendarEvent(value: unknown): CalendarEvent | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const date = normalizeString(value.date);
  const title = normalizeString(value.title);

  if (!isDateInputValue(date) || title.length === 0) {
    return null;
  }

  return {
    date,
    title,
    time: normalizeString(value.time) || '全天',
    place: normalizeString(value.place) || normalizeString(value.content),
  };
}

function isCalendarEvent(value: CalendarEvent | null): value is CalendarEvent {
  return value !== null;
}

function getCalendarEventSortKey(event: CalendarEvent) {
  return `${event.date} ${event.time} ${event.title}`;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
