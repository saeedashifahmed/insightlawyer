const TZ = import.meta.env.DEFAULT_TIMEZONE ?? "Asia/Kolkata";
const LOCALE = import.meta.env.DEFAULT_LOCALE ?? "en-IN";

const longFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const datetimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDateLong(input: string | Date | undefined | null): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return longFormatter.format(d);
}

export function formatDateShort(input: string | Date | undefined | null): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return shortFormatter.format(d);
}

export function formatDateTime(input: string | Date | undefined | null): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return datetimeFormatter.format(d);
}

export function isoDate(input: string | Date | undefined | null): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function relativeTime(input: string | Date | undefined | null): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  if (sec < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (day < 7) return rtf.format(-day, "day");
  return formatDateShort(d);
}

export function isFresh(input: string | Date | undefined | null, hours = 24): boolean {
  if (!input) return false;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < hours * 60 * 60 * 1000;
}
