const TIME_ZONE = "Europe/Rome";

type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsInRome(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function romeLocalToDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const observed = partsInRome(guess);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const observedUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
  return new Date(guess.getTime() + (desiredUtc - observedUtc));
}

function addCalendarDays(parts: Pick<DateParts, "year" | "month" | "day">, days: number) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function getCaptainBookingWindow(matchWeekAnchor: Date) {
  const p = partsInRome(matchWeekAnchor);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const monday = addCalendarDays(p, -daysSinceMonday);
  const previousWednesday = addCalendarDays(monday, -5);
  const previousSunday = addCalendarDays(monday, -1);
  return {
    opensAt: romeLocalToDate(previousWednesday.year, previousWednesday.month, previousWednesday.day, 0, 0, 0),
    closesAt: romeLocalToDate(previousSunday.year, previousSunday.month, previousSunday.day, 0, 0, 0),
  };
}

export function getCaptainBookingWindowStatus(matchWeekAnchor: Date, now = new Date()) {
  const { opensAt, closesAt } = getCaptainBookingWindow(matchWeekAnchor);
  return {
    opensAt,
    closesAt,
    isOpen: now.getTime() >= opensAt.getTime() && now.getTime() < closesAt.getTime(),
  };
}
