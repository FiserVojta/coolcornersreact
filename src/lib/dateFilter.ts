const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
};

/** Local start of day for a `YYYY-MM-DD` date input value, as an ISO string with offset. */
export const toLocalStartOfDayIso = (date: string) => {
  if (!date) return undefined;
  const { year, month, day } = parseLocalDate(date);
  const value = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
};

/** Local end of day for a `YYYY-MM-DD` date input value, as an ISO string with offset. */
export const toLocalEndOfDayIso = (date: string) => {
  if (!date) return undefined;
  const { year, month, day } = parseLocalDate(date);
  const value = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
};

export const formatDateChip = (value: string) => {
  if (!value) return '';
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};
