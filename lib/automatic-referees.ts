import { prisma } from "@/lib/prisma";
import {
  effectiveMatchEnd,
  refereeAllowsStart,
  refereeHasConflict,
  type ScheduledMatchWindow,
} from "@/lib/referee-availability";

export async function rebalanceLeagueReferees(leagueId: string) {
  const [referees, matches] = await Promise.all([
    prisma.referee.findMany({
      where: { leagueId, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        teamId: true,
        availabilities: {
          select: { weekday: true, hour: true, minute: true },
        },
      },
    }),
    prisma.match.findMany({
      where: { leagueId },
      orderBy: [{ date: "asc" }, { round: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        date: true,
        slotEnd: true,
        homeTeamId: true,
        awayTeamId: true,
        refereeId: true,
        refereeManualOverride: true,
        homeGoals: true,
        awayGoals: true,
      },
    }),
  ]);

  const completed = matches.filter(
    (match) => match.homeGoals !== null || match.awayGoals !== null
  );
  const pending = matches.filter(
    (match) => match.homeGoals === null && match.awayGoals === null
  );

  // Le assegnazioni manuali sono "bloccate": il ribilanciamento automatico
  // deve considerarle come occupazioni reali, ma non deve mai modificarle.
  const manualPending = pending.filter((match) => match.refereeManualOverride);
  const automaticPending = pending.filter((match) => !match.refereeManualOverride);
  const scheduledPending = automaticPending.filter((match) => Boolean(match.date));
  const unscheduledPending = automaticPending.filter((match) => !match.date);

  const fixedMatches: ScheduledMatchWindow[] = [
    ...completed,
    ...manualPending.filter((match) => Boolean(match.date)),
  ].map((match) => ({
    id: match.id,
    date: match.date,
    slotEnd: match.slotEnd,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    refereeId: match.refereeId,
  }));

  const load = new Map<string, number>();
  for (const match of [...completed, ...manualPending]) {
    if (match.refereeId) {
      load.set(match.refereeId, (load.get(match.refereeId) ?? 0) + 1);
    }
  }

  const assignments = new Map<string, string | null>();

  for (const match of scheduledPending) {
    const startsAt = match.date!;
    const endsAt = effectiveMatchEnd(startsAt, match.slotEnd);

    const otherPending: ScheduledMatchWindow[] = scheduledPending
      .filter((candidate) => candidate.id !== match.id)
      .map((candidate) => ({
        id: candidate.id,
        date: candidate.date,
        slotEnd: candidate.slotEnd,
        homeTeamId: candidate.homeTeamId,
        awayTeamId: candidate.awayTeamId,
        refereeId: assignments.get(candidate.id) ?? null,
      }));

    const conflictUniverse = [...fixedMatches, ...otherPending];
    const compatible = (referee: (typeof referees)[number]) =>
      referee.teamId !== match.homeTeamId &&
      referee.teamId !== match.awayTeamId &&
      refereeAllowsStart(referee.availabilities, startsAt) &&
      !refereeHasConflict({
        refereeId: referee.id,
        teamId: referee.teamId,
        startsAt,
        endsAt,
        otherMatches: conflictUniverse,
      });

    // Mantieni l'assegnazione corrente quando è ancora valida, così una nuova
    // prenotazione non cambia inutilmente gli arbitri delle altre partite.
    let selected = referees.find(
      (referee) => referee.id === match.refereeId && compatible(referee)
    );

    if (!selected) {
      selected = [...referees]
        .sort(
          (left, right) =>
            (load.get(left.id) ?? 0) - (load.get(right.id) ?? 0) ||
            left.name.localeCompare(right.name)
        )
        .find(compatible);
    }

    assignments.set(match.id, selected?.id ?? null);
    if (selected) {
      load.set(selected.id, (load.get(selected.id) ?? 0) + 1);
    }
  }

  const updates = [
    ...scheduledPending
      .filter((match) => match.refereeId !== (assignments.get(match.id) ?? null))
      .map((match) =>
        prisma.match.update({
          where: { id: match.id },
          data: { refereeId: assignments.get(match.id) ?? null },
        })
      ),
    ...unscheduledPending
      .filter((match) => match.refereeId !== null)
      .map((match) =>
        prisma.match.update({
          where: { id: match.id },
          data: { refereeId: null },
        })
      ),
  ];

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return {
    assigned: [...assignments.values()].filter(Boolean).length,
    unassigned: [...assignments.values()].filter((value) => !value).length,
    changed: updates.length,
  };
}
