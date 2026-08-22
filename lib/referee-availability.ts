const ROME_TIME_ZONE = "Europe/Rome";

export type RefereeAvailabilityDefinition = {
  weekday: number;
  hour: number;
  minute: number;
};

export type ScheduledMatchWindow = {
  id?: string;
  date: Date | null;
  slotEnd?: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  refereeId?: string | null;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getRomeWeekdayTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    weekday: WEEKDAY_INDEX[value("weekday")] ?? 0,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function refereeAllowsStart(
  availability: RefereeAvailabilityDefinition[],
  startsAt: Date | null
) {
  if (!startsAt || Number.isNaN(startsAt.getTime())) return true;
  if (availability.length === 0) return true;

  const wanted = getRomeWeekdayTime(startsAt);
  return availability.some(
    (slot) =>
      slot.weekday === wanted.weekday &&
      slot.hour === wanted.hour &&
      slot.minute === wanted.minute
  );
}

export function effectiveMatchEnd(startsAt: Date, slotEnd?: Date | null) {
  if (slotEnd && !Number.isNaN(slotEnd.getTime()) && slotEnd > startsAt) {
    return slotEnd;
  }
  return new Date(startsAt.getTime() + 60 * 60_000);
}

export function intervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date
) {
  return leftStart.getTime() < rightEnd.getTime() && rightStart.getTime() < leftEnd.getTime();
}

export function matchOverlapsWindow(
  match: ScheduledMatchWindow,
  startsAt: Date,
  endsAt: Date
) {
  if (!match.date || Number.isNaN(match.date.getTime())) return false;
  return intervalsOverlap(
    match.date,
    effectiveMatchEnd(match.date, match.slotEnd),
    startsAt,
    endsAt
  );
}

export function refereeHasConflict({
  refereeId,
  teamId,
  startsAt,
  endsAt,
  otherMatches,
}: {
  refereeId: string;
  teamId: string | null;
  startsAt: Date;
  endsAt: Date;
  otherMatches: ScheduledMatchWindow[];
}) {
  for (const match of otherMatches) {
    if (!matchOverlapsWindow(match, startsAt, endsAt)) continue;
    if (match.refereeId === refereeId) return true;
    if (teamId && (match.homeTeamId === teamId || match.awayTeamId === teamId)) {
      return true;
    }
  }
  return false;
}
