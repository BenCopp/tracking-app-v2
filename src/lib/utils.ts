import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// V1 stored food dates as UTC ISO strings (e.g. "2026-05-23T10:00:00.000Z") using
// the UTC date of local midnight, which for UTC+ timezones is always local date - 1.
// This normalizes those legacy dates back to the correct local date string.
export function normalizeV1Date(dateStr: string): string {
  if (!dateStr || !dateStr.endsWith('Z')) return dateStr.split('T')[0];
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (offsetHours <= 0) return dateStr.split('T')[0];
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const corrected = new Date(Date.UTC(y, m - 1, d + 1));
  return corrected.toISOString().split('T')[0];
}
