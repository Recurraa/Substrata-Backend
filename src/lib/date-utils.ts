export const addDays = (d: Date, n: number) =>
  new Date(d.getTime() + n * 86_400_000);

export const addWeeks = (d: Date, n: number) => addDays(d, n * 7);

export function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + n);
  return result;
}

export function addYears(d: Date, n: number): Date {
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + n);
  return result;
}
