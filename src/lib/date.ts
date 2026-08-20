// Dates here are calendar days in the user's own timezone, not instants, so
// they are formatted from local parts. toISOString would convert to UTC first,
// which in IST shifts every date back a day — pushing the month range onto the
// wrong days and dating anything logged before 5:30am to the day before.
function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end), monthKey: toISODate(start) };
}

// Weeks run Sunday to Saturday, since the weekly shop happens on Sunday and
// should count towards the week it starts.
export function getWeekRange(date = new Date()) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
}

// The last `count` months ending with the current one, oldest first, plus the
// overall range to query in one go.
export function getRecentMonths(count: number, date = new Date()) {
  const months = Array.from({ length: count }, (_, index) => {
    const start = new Date(date.getFullYear(), date.getMonth() - (count - 1 - index), 1);
    return {
      monthKey: toISODate(start),
      label: start.toLocaleDateString('en-IN', { month: 'short' }),
    };
  });

  return {
    months,
    start: months[0].monthKey,
    end: toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

// Stored dates are plain YYYY-MM-DD, so the owning month is the first of that
// month — no Date parsing needed.
export function monthKeyOf(isoDate: string) {
  return `${isoDate.slice(0, 7)}-01`;
}

export function todayISODate() {
  return toISODate(new Date());
}
