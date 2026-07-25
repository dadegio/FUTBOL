import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getServerSession,
  requireAdminOrCaptainOfMatch,
} from "@/lib/server-auth";
import { findFixedFieldSlot, isWithinSlotWeek } from "@/lib/field-slots";

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
  const slot = findFixedFieldSlot(venueKey, startsAt);

  if (!slot) {
    return NextResponse.json(
      { error: "Lo slot scelto non fa parte degli orari disponibili" },
      { status: 400 }
    );
  }

  if (slot.startsAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Non puoi prenotare uno slot già iniziato" },
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
          },
        });

        if (!match) throw new Error("MATCH_NOT_FOUND");
        if (match.homeGoals !== null || match.awayGoals !== null) {
          throw new Error("MATCH_ALREADY_PLAYED");
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

        return tx.match.update({
          where: { id: matchId },
          data: {
            date: slot.startsAt,
            slotEnd: slot.endsAt,
            venueKey: slot.venueKey,
            venueName: slot.venueName,
            venueAddress: slot.address,
            bookedByUserId: session.userId,
            bookedAt: new Date(),
          },
          select: {
            id: true,
            date: true,
            slotEnd: true,
            venueKey: true,
            venueName: true,
            venueAddress: true,
            bookedAt: true,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ ok: true, booking });
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
      venueKey: true,
      homeGoals: true,
      awayGoals: true,
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
    },
  });

  return NextResponse.json({ ok: true });
}
