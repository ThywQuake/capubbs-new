import { callOptionalLegacyAsk } from './transport';
import type { LegacyBbsCalendarEvent } from './types';
import { isRecord, stringValue, toNumber } from './utils';

export async function fetchLegacyCalendarEvents(signal?: AbortSignal): Promise<LegacyBbsCalendarEvent[]> {
  const rows = await callOptionalLegacyAsk(
    {
      ask: 'calendar',
    },
    { includeToken: false, signal },
  );

  return rows.map(mapCalendarEndpointEvent).filter((event): event is LegacyBbsCalendarEvent => event !== null);
}

function mapCalendarEndpointEvent(value: unknown): LegacyBbsCalendarEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const year = toNumber(value.year ?? value[0]);
  const month = toNumber(value.month ?? value[1]);
  const day = toNumber(value.day ?? value[2]);

  if (year > 0 && month > 0 && day > 0) {
    return {
      content: stringValue(value.text ?? value.content ?? value.description ?? value[5]),
      day,
      month,
      time: normalizeCalendarEndpointTime(stringValue(value.time ?? value[3])),
      title: stringValue(value.title ?? value[4]),
      year,
    };
  }

  const date = stringValue(value.date);
  const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(.+)$/);

  if (!match) {
    return null;
  }
  const time = normalizeCalendarEndpointTime(match[4]);

  return {
    content: stringValue(value.description ?? value.text ?? value.content),
    day: Number(match[3]),
    month: Number(match[2]),
    time,
    title: stringValue(value.title ?? value[4]),
    year: Number(match[1]),
  };
}

function normalizeCalendarEndpointTime(value: string) {
  const trimmedValue = value.trim().replace(/:00$/, '');
  const timeMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    return trimmedValue || '全天';
  }

  return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
}
