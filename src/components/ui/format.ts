/**
 * Date formatting helpers with a fixed locale (en-US) so server and client
 * output match.
 *
 *   formatDate(assignment.dueAt)                 → "Nov 17, 2026"
 *   formatDate(d, { withTime: true })            → "Nov 17, 2026, 3:05 PM"
 *   formatRelativeTime(attempt.submittedAt)      → "3 hours ago" / "in 2 days"
 *
 * Note: relative times depend on "now"; when rendering inside a Client
 * Component prefer passing a server-computed string to avoid hydration drift.
 */

export type DateInput = Date | string | number;

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value));

export interface FormatDateOptions {
  withTime?: boolean;
  /** Omit the year when it's the current year. */
  short?: boolean;
  /** IANA time zone; defaults to the runtime's zone. */
  timeZone?: string;
}

export function formatDate(value: DateInput | null | undefined, options: FormatDateOptions = {}): string {
  if (value === null || value === undefined) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: options.short && sameYear ? undefined : "numeric",
    hour: options.withTime ? "numeric" : undefined,
    minute: options.withTime ? "2-digit" : undefined,
    timeZone: options.timeZone,
  });
  return fmt.format(date);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function formatRelativeTime(value: DateInput | null | undefined, now: DateInput = new Date()): string {
  if (value === null || value === undefined) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffSeconds = Math.round((date.getTime() - toDate(now).getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 45) return "just now";
  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds || unit === "minute") {
      return relative.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return relative.format(diffSeconds, "second");
}

/** "1 skill" / "3 skills" */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
