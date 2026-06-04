/**
 * Date helpers anchored to Asia/Jakarta (WIB, fixed UTC+7, no DST).
 * Pure functions — safe on server and client.
 */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

interface JakartaParts {
  y: number;
  m: number; // 0-based
  d: number;
  wd: number; // 0=Sun .. 6=Sat
}

export function jakartaParts(date: Date): JakartaParts {
  const s = new Date(date.getTime() + WIB_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth(),
    d: s.getUTCDate(),
    wd: s.getUTCDay(),
  };
}

/** The UTC instant corresponding to Jakarta midnight of the given Y/M/D. */
export function jakartaMidnightUTC(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - WIB_OFFSET_MS);
}

/** Start of today in Jakarta. */
export function startOfTodayJakarta(now = new Date()): Date {
  const p = jakartaParts(now);
  return jakartaMidnightUTC(p.y, p.m, p.d);
}

/** Start of this week (Monday) in Jakarta. */
export function startOfWeekJakarta(now = new Date()): Date {
  const p = jakartaParts(now);
  const daysFromMonday = (p.wd + 6) % 7;
  return jakartaMidnightUTC(p.y, p.m, p.d - daysFromMonday);
}

/** Start of this month in Jakarta. */
export function startOfMonthJakarta(now = new Date()): Date {
  const p = jakartaParts(now);
  return jakartaMidnightUTC(p.y, p.m, 1);
}

/** Start of this year in Jakarta. */
export function startOfYearJakarta(now = new Date()): Date {
  const p = jakartaParts(now);
  return jakartaMidnightUTC(p.y, 0, 1);
}

/** `monthsAgo` whole months back from today (rolling), at Jakarta midnight. */
export function monthsAgoJakarta(monthsAgo: number, now = new Date()): Date {
  const p = jakartaParts(now);
  return jakartaMidnightUTC(p.y, p.m - monthsAgo, p.d);
}

/** YYYY-MM-DD key in Jakarta. */
export function jakartaDateKey(date: Date): string {
  const p = jakartaParts(date);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** YYYY-MM key in Jakarta. */
export function jakartaMonthKey(date: Date): string {
  const p = jakartaParts(date);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}`;
}

/** Short day label like "Sen 03". */
export function dayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/** Short day+month label like "03 Jun". */
export function shortDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/** Month label like "Jun 25" from a YYYY-MM key. */
export function monthLabel(monthKey: string): string {
  const d = new Date(`${monthKey}-01T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}
