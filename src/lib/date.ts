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

export function todayISODate() {
  return toISODate(new Date());
}
