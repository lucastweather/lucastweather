export function parseCalendarDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());

  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 12);
  }

  const fallback = new Date(dateStr);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return new Date();
}