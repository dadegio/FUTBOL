import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getServerSession,
  requireAdminOrCaptainOfMatch,
} from "@/lib/server-auth";
import { findFieldSlot, isWithinSlotWeek } from "@/lib/field-slots";
import { matchOverlapsWindow, refereeAllowsStart, refereeHasConflict } from "@/lib/referee-availability";
import { rebalanceLeagueReferees } from "@/lib/automatic-referees";

type Ctx = { params: Promise<{ matchId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireAdminOrCaptainOfMatch(matchId);
  if (authErr) return authErr;

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const venueKey = String(body?.venueKey ?? "").trim();
  const startsAt = new Date(String(body?.startsAt ?? ""));

  if (!venueKey || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json(
      { error: "Campo o orario non validi" },
      { status: 400 }
    );
  }

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const match = await tx.match.findUnique({
          where: { id: matchId },
          select: {
            id: true,
            leagueId: true,
            homeTeamId: true,
            awayTeamId: true,
            homeGoals: true,
            awayGoals: true,
            date: true,
            slotWeekStart: true,
            refereeId: true,
            refereeManualOverride: true,
            round: true,
          },
        });

        if (!match) throw new Error("MATCH_NOT_FOUND");
        if (match.homeGoals !== null || match.awayGoals !== null) {
          throw new Error("MATCH_ALREADY_PLAYED");
        }

        const field = await tx.field.findFirst({
          where: {
            id: venueKey,
            leagueId: match.leagueId,
            active: true,
          },
          select: {
            id: true,
            name: true,
            address: true,
            slots: {
              select: {
                id: true,
                weekday: true,
                hour: true,
                minute: true,
                durationMinutes: true,
              },
            },
          },
        });
        if (!field) throw new Error("FIELD_NOT_AVAILABLE");

        const slot = findFieldSlot(field, startsAt);
        if (!slot) throw new Error("INVALID_SLOT");
        if (slot.startsAt.getTime() <= Date.now()) {
          throw new Error("SLOT_ALREADY_STARTED");
        }

        const weekAnchor = match.slotWeekStart ?? match.date;
        if (!weekAnchor) throw new Error("MATCH_WEEK_MISSING");
        if (!isWithinSlotWeek(slot.startsAt, weekAnchor)) {
          throw new Error("SLOT_OUTSIDE_MATCH_WEEK");
        }

        const teamConflict = await tx.match.findFirst({
          where: {
            id: { not: matchId },
            date: slot.startsAt,
            OR: [
              { homeTeamId: { in: [match.homeTeamId, match.awayTeamId] } },
              { awayTeamId: { in: [match.homeTeamId, match.awayTeamId] } },
            ],
          },
          select: { id: true },
        });

        if (teamConflict) throw new Error("TEAM_CONFLICT");

        const [referees, otherMatches] = await Promise.all([
          tx.referee.findMany({
            where: { leagueId: match.leagueId, active: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true, teamId: true, availabilities: { select: { weekday: true, hour: true, minute: true } } },
          }),
          tx.match.findMany({
            where: { leagueId: match.leagueId, id: { not: matchId }, date: { not: null } },
            select: { id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true, refereeId: true, refereeManualOverride: true },
          }),
        ]);

        const overlappingTeamConflict = otherMatches.some((other) =>
          (other.homeTeamId === match.homeTeamId || other.awayTeamId === match.homeTeamId ||
           other.homeTeamId === match.awayTeamId || other.awayTeamId === match.awayTeamId) &&
          matchOverlapsWindow(other, slot.startsAt, slot.endsAt)
        );
        if (overlappingTeamConflict) throw new Error("TEAM_CONFLICT");

        const affiliatedRefereeIds = new Set(referees.filter((r) => r.teamId === match.homeTeamId || r.teamId === match.awayTeamId).map((r) => r.id));
        const assignmentsToRelease = otherMatches.filter((other) =>
          !other.refereeManualOverride && Boolean(other.refereeId) && affiliatedRefereeIds.has(other.refereeId!) && matchOverlapsWindow(other, slot.startsAt, slot.endsAt)
        ).map((other) => other.id);
        if (assignmentsToRelease.length) {
          await tx.match.updateMany({ where: { id: { in: assignmentsToRelease } }, data: { refereeId: null } });
          for (const other of otherMatches) if (assignmentsToRelease.includes(other.id)) other.refereeId = null;
        }

        const load = new Map<string, number>();
        for (const other of otherMatches) if (other.refereeId) load.set(other.refereeId, (load.get(other.refereeId) ?? 0) + 1);
        const ordered = [...referees].sort((a,b) => ((load.get(a.id) ?? 0) - (load.get(b.id) ?? 0)) || a.name.localeCompare(b.name));
        const compatible = (r: (typeof referees)[number]) =>
          r.teamId !== match.homeTeamId && r.teamId !== match.awayTeamId &&
          refereeAllowsStart(r.availabilities, slot.startsAt) &&
          !refereeHasConflict({ refereeId: r.id, teamId: r.teamId, startsAt: slot.startsAt, endsAt: slot.endsAt, otherMatches });
        const current = ordered.find((r) => r.id === match.refereeId && compatible(r));
        const assigned = current ?? ordered.find(compatible) ?? null;
        const assignedRefereeId = match.refereeManualOverride
          ? match.refereeId
          : assigned?.id ?? null;

        const updated = await tx.match.update({
          where: { id: matchId },
          data: {
            date: slot.startsAt, slotEnd: slot.endsAt, venueKey: slot.venueKey, venueName: slot.venueName, venueAddress: slot.address,
            bookedByUserId: session.userId, bookedAt: new Date(), refereeId: assignedRefereeId,
          },
          select: {
            id: true, leagueId: true, date: true, slotEnd: true, venueKey: true, venueName: true, venueAddress: true, bookedAt: true,
            referee: { select: { id: true } },
          },
        });
        return { ...updated, releasedRefereeAssignments: assignmentsToRelease.length };
      },
      { isolationLevel: "Serializable" }
    );

    await rebalanceLeagueReferees(booking.leagueId);
    const refreshed = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true, date: true, slotEnd: true, venueKey: true, venueName: true, venueAddress: true, bookedAt: true,
        referee: { select: { id: true } },
      },
    });

    return NextResponse.json({ ok: true, booking: refreshed ?? booking });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = error instanceof Error ? error.message : "";

    if (code === "P2002" || code === "P2034") {
      return NextResponse.json(
        {
          error:
            "La disponibilità è cambiata mentre prenotavi: aggiorna gli slot e riprova",
        },
        { status: 409 }
      );
    }

    if (message === "FIELD_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Il campo scelto non è più disponibile" },
        { status: 409 }
      );
    }

    if (message === "INVALID_SLOT") {
      return NextResponse.json(
        { error: "Lo slot scelto non fa parte degli orari disponibili" },
        { status: 400 }
      );
    }

    if (message === "SLOT_ALREADY_STARTED") {
      return NextResponse.json(
        { error: "Non puoi prenotare uno slot già iniziato" },
        { status: 400 }
      );
    }

    if (message === "TEAM_CONFLICT") {
      return NextResponse.json(
        { error: "Una delle due squadre ha già una partita in questo orario" },
        { status: 409 }
      );
    }

    if (message === "MATCH_ALREADY_PLAYED") {
      return NextResponse.json(
        { error: "Non puoi spostare una partita già conclusa" },
        { status: 400 }
      );
    }

    if (message === "MATCH_WEEK_MISSING") {
      return NextResponse.json(
        {
          error:
            "La partita non ha una settimana assegnata: rigenera il calendario impostando l'inizio della programmazione",
        },
        { status: 409 }
      );
    }

    if (message === "SLOT_OUTSIDE_MATCH_WEEK") {
      return NextResponse.json(
        {
          error:
            "Puoi prenotare soltanto uno slot della settimana assegnata a questa giornata",
        },
        { status: 400 }
      );
    }

    if (message === "MATCH_NOT_FOUND") {
      return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Non è stato possibile prenotare lo slot" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireAdminOrCaptainOfMatch(matchId);
  if (authErr) return authErr;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      leagueId: true,
      venueKey: true,
      homeGoals: true,
      awayGoals: true,
      refereeManualOverride: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  if (match.homeGoals !== null || match.awayGoals !== null) {
    return NextResponse.json(
      { error: "Non puoi liberare il campo di una partita già conclusa" },
      { status: 400 }
    );
  }

  if (!match.venueKey) {
    return NextResponse.json({ ok: true });
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      date: null,
      slotEnd: null,
      venueKey: null,
      venueName: null,
      venueAddress: null,
      bookedByUserId: null,
      bookedAt: null,
      ...(!match.refereeManualOverride ? { refereeId: null } : {}),
    },
  });
  await rebalanceLeagueReferees(match.leagueId);

  return NextResponse.json({ ok: true });
}
