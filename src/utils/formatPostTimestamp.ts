export function formatPostTimestamp(timestamp: string, currentYear = new Date().getFullYear()) {
  const value = timestamp.trim();

  const monthDayTime = value.match(/^(\d{1,2})[-.](\d{1,2})(?:[-\s]+)(\d{1,2})[:.-](\d{2})(?:[:.-]\d{2})?$/);

  if (monthDayTime) {
    return `${padTimePart(monthDayTime[1])}.${padTimePart(monthDayTime[2])} ${padTimePart(monthDayTime[3])}:${monthDayTime[4]}`;
  }

  const fullDateTime = value.match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:[-\s]+)(\d{1,2})[:.-](\d{2})(?:[:.-]\d{2})?$/);

  if (fullDateTime) {
    const [, year, month, day, hour, minute] = fullDateTime;
    const prefix = Number(year) === currentYear ? '' : `${year}.`;

    return `${prefix}${padTimePart(month)}.${padTimePart(day)} ${padTimePart(hour)}:${minute}`;
  }

  const fullDate = value.match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/);

  if (fullDate) {
    const [, year, month, day] = fullDate;
    const prefix = Number(year) === currentYear ? '' : `${year}.`;

    return `${prefix}${padTimePart(month)}.${padTimePart(day)}`;
  }

  const isoDateTime = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);

  if (isoDateTime) {
    const [, year, month, day, hour, minute] = isoDateTime;
    const prefix = Number(year) === currentYear ? '' : `${year}.`;

    return `${prefix}${month}.${day} ${hour}:${minute}`;
  }

  return value;
}

function padTimePart(part: string) {
  return part.padStart(2, '0');
}
