import type { CalendarEvent } from '../../types/forum';

type CalendarEventListProps = {
  events: CalendarEvent[];
};

export function CalendarEventList({ events }: CalendarEventListProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-2.5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        当天暂无活动
      </div>
    );
  }

  return (
    <>
      {events.map((event) => (
        <div
          key={`${event.date}-${event.title}-${event.time}`}
          className="rounded-md border border-zinc-200 p-2.5 dark:border-zinc-800"
        >
          <div className="text-sm font-semibold text-zinc-950 dark:text-white">{event.title}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {formatCalendarEventMeta(event)}
          </div>
        </div>
      ))}
    </>
  );
}

function formatCalendarEventMeta(event: CalendarEvent) {
  return [event.time, event.place].filter((value) => value.trim()).join(' · ');
}
