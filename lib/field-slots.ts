const ROME_TIME_ZONE = "Europe/Rome";

export type FixedFieldSlotDefinition = {
  key: string;
  venueKey: string;
  venueName: string;
  address: string;
  weekday: number;
  hour: number;
  minute: number;
  durationMinutes: number;
};

export type FixedFieldSlotOccurrence = FixedFieldSlotDefinition & {
  startsAt: Date;
  endsAt: Date;
};

export type SlotWeekWindow = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Gli intervalli 20–22 sono modellati come due partite da un'ora,
 * con calcio d'inizio alle 20:00 e alle 21:00.
 */
export const FIXED_FIELD_SLOTS: FixedFieldSlotDefinition[] = [
  {
    key: "anastasio-tue-21",
    venueKey: "anastasio-germonio",
    venueName: "Campo Anastasio Germonio",
    address: "Via Anastasio Germonio 6",
    weekday: 2,
    hour: 21,
    minute: 0,
    durationMinutes: 60,
  },
  {
    key: "anastasio-wed-20",
    venueKey: "anastasio-germonio",
    venueName: "Campo Anastasio Germonio",
    address: "Via Anastasio Germonio 6",
    weekday: 3,
    hour: 20,
    minute: 0,
    durationMinutes: 60,
  },
  {
    key: "anastasio-wed-21",
    venueKey: "anastasio-germonio",
    venueName: "Campo Anastasio Germonio",
    address: "Via Anastasio Germonio 6",
    weekday: 3,
    hour: 21,
    minute: 0,
    durationMinutes: 60,
  },
  {
    key: "sant-ignazio-wed-20",
    venueKey: "sant-ignazio",
    venueName: "Campo Sant'Ignazio",
    address: "Sant'Ignazio",
    weekday: 3,
    hour: 20,
    minute: 0,
    durationMinutes: 60,
  },
  {
    key: "sant-ignazio-wed-21",
    venueKey: "sant-ignazio",
    venueName: "Campo Sant'Ignazio",
    address: "Sant'Ignazio",
    weekday: 3,
    hour: 21,
    minute: 0,
    durationMinutes: 60,
  },
  {
    key: "circolo-stampa-wed-21",
    venueKey: "circolo-della-stampa",
    venueName: "Circolo della Stampa",
    address: "Circolo della Stampa",
    weekday: 3,
    hour: 21,
    minute: 0,
    durationMinutes: 60,
  },
  {
    key: "circolo-stampa-thu-21",
    venueKey: "circolo-della-stampa",
    venueName: "Circolo della Stampa",
    address: "Circolo della Stampa",
    weekday: 4,
    hour: 21,
    minute: 0,
    durationMinutes: 60,
  },
];

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
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

function getRomeParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second")),
    weekday: WEEKDAY_INDEX[value("weekday")] ?? 0,
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = wantedAsUtc;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = getRomeParts(new Date(candidate));
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    candidate -= representedAsUtc - wantedAsUtc;
  }

  return new Date(candidate);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number
) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

export function getSlotWeekWindow(anchor: Date): SlotWeekWindow {
  if (Number.isNaN(anchor.getTime())) {
    throw new Error("Data settimana non valida");
  }

  const parts = getRomeParts(anchor);
  const daysSinceMonday = (parts.weekday + 6) % 7;
  const monday = addCalendarDays(
    parts.year,
    parts.month,
    parts.day,
    -daysSinceMonday
  );
  const nextMonday = addCalendarDays(
    monday.year,
    monday.month,
    monday.day,
    7
  );

  return {
    startsAt: zonedDateTimeToUtc(
      monday.year,
      monday.month,
      monday.day,
      0,
      0
    ),
    endsAt: zonedDateTimeToUtc(
      nextMonday.year,
      nextMonday.month,
      nextMonday.day,
      0,
      0
    ),
  };
}

export function getFirstFullSlotWeek(from: Date): SlotWeekWindow {
  let week = getSlotWeekWindow(from);
  const firstSlot = getFixedFieldSlotOccurrences({
    from: week.startsAt,
    weeks: 1,
  }).find((slot) => slot.startsAt.getTime() < week.endsAt.getTime());

  if (firstSlot && firstSlot.startsAt.getTime() < from.getTime()) {
    week = getSlotWeekWindow(week.endsAt);
  }

  return week;
}

export function getRoundSlotWeek(
  firstWeekStart: Date,
  round: number
): SlotWeekWindow {
  const first = getSlotWeekWindow(firstWeekStart);
  const firstParts = getRomeParts(first.startsAt);
  const roundMonday = addCalendarDays(
    firstParts.year,
    firstParts.month,
    firstParts.day,
    Math.max(0, Math.trunc(round) - 1) * 7
  );

  return getSlotWeekWindow(
    zonedDateTimeToUtc(
      roundMonday.year,
      roundMonday.month,
      roundMonday.day,
      0,
      0
    )
  );
}

export function isWithinSlotWeek(date: Date, weekStart: Date) {
  const week = getSlotWeekWindow(weekStart);
  const timestamp = date.getTime();
  return (
    timestamp >= week.startsAt.getTime() &&
    timestamp < week.endsAt.getTime()
  );
}

export function getFixedFieldSlotOccurrences({
  from,
  weeks,
}: {
  from: Date;
  weeks: number;
}): FixedFieldSlotOccurrence[] {
  const safeWeeks = Math.min(Math.max(Math.trunc(weeks), 1), 60);
  const firstDay = getRomeParts(from);
  const occurrences: FixedFieldSlotOccurrence[] = [];

  for (let offset = 0; offset <= safeWeeks * 7; offset += 1) {
    const date = addCalendarDays(
      firstDay.year,
      firstDay.month,
      firstDay.day,
      offset
    );

    for (const definition of FIXED_FIELD_SLOTS) {
      if (definition.weekday !== date.weekday) continue;

      const startsAt = zonedDateTimeToUtc(
        date.year,
        date.month,
        date.day,
        definition.hour,
        definition.minute
      );

      if (startsAt.getTime() < from.getTime()) continue;

      occurrences.push({
        ...definition,
        startsAt,
        endsAt: new Date(
          startsAt.getTime() + definition.durationMinutes * 60_000
        ),
      });
    }
  }

  return occurrences.sort((left, right) => {
    const byDate = left.startsAt.getTime() - right.startsAt.getTime();
    return byDate || left.venueName.localeCompare(right.venueName);
  });
}

export function findFixedFieldSlot(
  venueKey: string,
  startsAt: Date
): FixedFieldSlotOccurrence | null {
  if (Number.isNaN(startsAt.getTime())) return null;

  const parts = getRomeParts(startsAt);
  const definition = FIXED_FIELD_SLOTS.find(
    (slot) =>
      slot.venueKey === venueKey &&
      slot.weekday === parts.weekday &&
      slot.hour === parts.hour &&
      slot.minute === parts.minute
  );

  if (
    !definition ||
    parts.second !== 0 ||
    startsAt.getUTCMilliseconds() !== 0
  ) {
    return null;
  }

  return {
    ...definition,
    startsAt,
    endsAt: new Date(
      startsAt.getTime() + definition.durationMinutes * 60_000
    ),
  };
}

export function fixedSlotsSummary() {
  return [
    "Martedì · 21:00 · Via Anastasio Germonio 6",
    "Mercoledì · 20:00 e 21:00 · Via Anastasio Germonio 6",
    "Mercoledì · 20:00 e 21:00 · Sant'Ignazio",
    "Mercoledì · 21:00 · Circolo della Stampa",
    "Giovedì · 21:00 · Circolo della Stampa",
  ];
}
