import type { CalendarEvent } from '../../types/forum';
import { LegacyBbsError } from './errors';
import { callLegacyAsk } from './transport';
import type { LegacyRow } from './types';
import { stringValue } from './utils';

const LEGACY_EMPTY_RESULT_CODE = 2006;

type CalendarDateParts = {
  day: string;
  month: string;
  year: string;
};

export async function saveLegacyCalendarDateEvents(
  date: string,
  events: CalendarEvent[],
  signal?: AbortSignal,
) {
  const parts = parseCalendarDateParts(date);

  if (!parts) {
    throw new Error('请选择有效日期。');
  }

  await callLegacyAsk(
    {
      ask: 'savecalendar',
      ...parts,
      content: JSON.stringify(events.map(serializeCalendarEventForLegacyApi)),
    },
    { signal },
  );
}

export async function loadLegacyCalendarDateEvents(date: string, signal?: AbortSignal) {
  const parts = parseCalendarDateParts(date);

  if (!parts) {
    throw new Error('请选择有效日期。');
  }

  const rows = await loadLegacyCalendarDateRows(parts, signal);

  return mapLegacyCalendarAdminRows(date, rows);
}

async function loadLegacyCalendarDateRows(parts: CalendarDateParts, signal?: AbortSignal) {
  try {
    return await callLegacyAsk(
      {
        ask: 'loadcalendar',
        ...parts,
      },
      { signal },
    );
  } catch (error) {
    if (error instanceof LegacyBbsError && error.code === LEGACY_EMPTY_RESULT_CODE) {
      return [];
    }

    throw error;
  }
}

function serializeCalendarEventForLegacyApi(event: CalendarEvent) {
  return {
    content: event.place,
    time: event.time,
    title: event.title,
  };
}

function parseCalendarDateParts(date: string): CalendarDateParts | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    day: match[3],
    month: match[2],
    year: match[1],
  };
}

export function mapLegacyCalendarAdminRows(date: string, rows: LegacyRow[]) {
  return rows
    .map((row) => {
      const title = stringValue(row.title);

      if (!title) {
        return null;
      }

      return {
        date,
        place: stringValue(row.text ?? row.content),
        time: stringValue(row.time) || '全天',
        title,
      };
    })
    .filter((event): event is CalendarEvent => event !== null);
}
