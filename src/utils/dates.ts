/** Utility functions for ISO week-based date arithmetic (YYYY-MM-DD). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const toDate = (isoDate: string): Date => {
  const result = new Date(isoDate);
  if (Number.isNaN(result.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  return result;
};

export const toIsoDate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDays = (isoDate: string, days: number): string => {
  const date = toDate(isoDate);
  const updated = new Date(date.getTime() + days * MS_PER_DAY);
  return toIsoDate(updated);
};

export const addWeeks = (isoDate: string, weeks: number): string => addDays(isoDate, weeks * 7);

export const diffInWeeks = (start: string, end: string): number => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / (MS_PER_DAY * 7));
};

export const currentIsoDate = (): string => toIsoDate(new Date());
