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

/**
 * Parses a naive ISO timestamp (e.g. "2026-04-24T13:00") returned by
 * Open-Meteo when timezone=auto. The string represents the local wall-clock
 * time of the requested location with NO timezone offset. We must treat it
 * as the city's local time — not the browser's local time — otherwise users
 * in a different timezone see times shifted by their UTC offset.
 *
 * Returns the parsed components plus a Date constructed in the BROWSER's
 * local zone with the same wall-clock fields, which is safe for display
 * (label = "1 PM") but should NOT be used for "is this in the past" checks
 * across timezones.
 */
export function parseLocalDateTime(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Date in browser-local TZ with the same wall-clock fields. */
  date: Date;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim());
  if (match) {
    const [, y, mo, d, h, mi] = match;
    const year = Number(y);
    const month = Number(mo);
    const day = Number(d);
    const hour = Number(h);
    const minute = Number(mi);
    return {
      year,
      month,
      day,
      hour,
      minute,
      date: new Date(year, month - 1, day, hour, minute),
    };
  }
  const fallback = new Date(value);
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth() + 1,
    day: fallback.getDate(),
    hour: fallback.getHours(),
    minute: fallback.getMinutes(),
    date: fallback,
  };
}

/** "YYYY-MM-DD" key from a naive Open-Meteo timestamp. */
export function localDateKey(value: string): string {
  const { year, month, day } = parseLocalDateTime(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Returns the city's "now" wall-clock as a Date in browser-local TZ. */
export function cityNow(timezoneOffsetSeconds: number): Date {
  const nowUtcMs = Date.now();
  const cityMs = nowUtcMs + timezoneOffsetSeconds * 1000;
  const utc = new Date(cityMs);
  // Build a browser-local Date using the city's UTC fields so wall-clock matches.
  return new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds(),
  );
}
