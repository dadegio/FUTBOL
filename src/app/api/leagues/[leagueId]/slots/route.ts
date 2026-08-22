import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getFieldSlotOccurrences,
  getSlotWeekWindow,
} from "@/lib/field-slots";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId")?.trim() || null;

  if (!matchId) {
    return NextResponse.json(
      { error: "Specifica la partita per vedere gli slot della sua settimana" },
      { status: 400 }
    );
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }

  const currentMatch = await prisma.match.findFirst({
    where: { id: matchId, leagueId },
    select: {
      id: true,
      round: true,
      date: true,
      slotEnd: true,
      slotWeekStart: true,
      venueKey: true,
      venueName: true,
      venueAddress: true,
    },
  });

  if (!currentMatch) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  const weekAnchor = currentMatch.slotWeekStart ?? currentMatch.date;

  if (!weekAnchor) {
    return NextResponse.json(
      {
        error:
          "Questa partita non ha ancora una settimana assegnata. Rigenera il calendario impostando l'inizio della programmazione.",
      },
      { status: 409 }
    );
  }

  const matchWeek = getSlotWeekWindow(weekAnchor);
  const fields = await prisma.field.findMany({
    where: { leagueId, active: true },
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
    orderBy: { name: "asc" },
  });
  const occurrences = getFieldSlotOccurrences({
    from: matchWeek.startsAt,
    weeks: 1,
    fields,
  }).filter((slot) => slot.startsAt.getTime() < matchWeek.endsAt.getTime());

  const occupiedMatches = await prisma.match.findMany({
    where: {
      venueKey: { not: null },
      date: {
        gte: matchWeek.startsAt,
        lt: matchWeek.endsAt,
      },
    },
    select: {
      id: true,
      leagueId: true,
      date: true,
      venueKey: true,
    },
  });

  const occupiedBySlot = new Map(
    occupiedMatches
      .filter((match) => match.date && match.venueKey)
      .map((match) => [
        `${match.venueKey}:${match.date!.toISOString()}`,
        match,
      ])
  );

  const slots = occurrences.map((slot) => {
    const occupied = occupiedBySlot.get(
      `${slot.venueKey}:${slot.startsAt.toISOString()}`
    );
    const isCurrentMatch = occupied?.id === matchId;

    return {
      key: slot.key,
      venueKey: slot.venueKey,
      venueName: slot.venueName,
      address: slot.address,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      available: !occupied || isCurrentMatch,
      isCurrentMatch,
      occupiedByLeague: occupied?.leagueId ?? null,
    };
  });

  return NextResponse.json({
    timeZone: "Europe/Rome",
    fields,
    matchWeek: {
      round: currentMatch.round,
      startsAt: matchWeek.startsAt,
      endsAt: matchWeek.endsAt,
    },
    currentBooking:
      currentMatch?.date && currentMatch.venueKey
        ? {
            startsAt: currentMatch.date,
            endsAt: currentMatch.slotEnd,
            venueKey: currentMatch.venueKey,
            venueName: currentMatch.venueName,
            address: currentMatch.venueAddress,
          }
        : null,
    slots,
  });
}
