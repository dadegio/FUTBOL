import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebalanceLeagueReferees } from "@/lib/automatic-referees";
import {
  effectiveMatchEnd,
  refereeAllowsStart,
  refereeHasConflict,
} from "@/lib/referee-availability";
import { requireLeagueAdminForMatch } from "@/lib/server-auth";

type Ctx = { params: Promise<{ matchId: string }> };

async function getAdminRefereeState(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      leagueId: true,
      date: true,
      slotEnd: true,
      homeTeamId: true,
      awayTeamId: true,
      refereeId: true,
      refereeManualOverride: true,
      homeGoals: true,
      awayGoals: true,
      referee: { select: { id: true, name: true, active: true } },
    },
  });

  if (!match) return null;

  const referees = await prisma.referee.findMany({
    where: { leagueId: match.leagueId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      availabilities: {
        select: { weekday: true, hour: true, minute: true },
      },
    },
  });

  const otherMatches = match.date
    ? await prisma.match.findMany({
        where: {
          leagueId: match.leagueId,
          id: { not: match.id },
          date: { not: null },
        },
        select: {
          id: true,
          date: true,
          slotEnd: true,
          homeTeamId: true,
          awayTeamId: true,
          refereeId: true,
        },
      })
    : [];

  const startsAt = match.date;
  const endsAt = startsAt ? effectiveMatchEnd(startsAt, match.slotEnd) : null;

  const options = referees.map((referee) => {
    const warnings: string[] = [];
    if (!referee.active) warnings.push("Arbitro disattivato");
    if (referee.teamId === match.homeTeamId || referee.teamId === match.awayTeamId) {
      warnings.push(
        referee.team?.name
          ? `Gioca in ${referee.team.name}`
          : "Gioca in una delle due squadre"
      );
    }
    if (startsAt && endsAt) {
      if (!refereeAllowsStart(referee.availabilities, startsAt)) {
        warnings.push("Non disponibile in questo orario");
      }
      if (
        refereeHasConflict({
          refereeId: referee.id,
          teamId: referee.teamId,
          startsAt,
          endsAt,
          otherMatches,
        })
      ) {
        warnings.push("Ha un conflitto con un'altra gara o con la propria squadra");
      }
    }
    return {
      id: referee.id,
      name: referee.name,
      active: referee.active,
      warnings,
      compatible: warnings.length === 0,
    };
  });

  return {
    mode: match.refereeManualOverride ? "manual" : "automatic",
    referee: match.referee,
    refereeId: match.refereeId,
    completed: match.homeGoals !== null || match.awayGoals !== null,
    referees: options,
  };
}

export async function GET(_: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireLeagueAdminForMatch(matchId);
  if (authErr) return authErr;
  const state = await getAdminRefereeState(matchId);
  if (!state) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }
  return NextResponse.json(state);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireLeagueAdminForMatch(matchId);
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "manual" ? "manual" : "automatic";

  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      leagueId: true,
      refereeId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  if (mode === "manual") {
    const refereeId = body?.refereeId ? String(body.refereeId).trim() : null;
    if (refereeId) {
      const referee = await prisma.referee.findFirst({
        where: { id: refereeId, leagueId: existing.leagueId },
        select: { id: true },
      });
      if (!referee) {
        return NextResponse.json({ error: "Arbitro non valido per questo torneo" }, { status: 400 });
      }
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        refereeManualOverride: true,
        refereeId,
      },
    });
  } else {
    const completed = existing.homeGoals !== null || existing.awayGoals !== null;
    await prisma.match.update({
      where: { id: matchId },
      data: {
        refereeManualOverride: false,
        ...(completed ? {} : { refereeId: null }),
      },
    });
    if (!completed) {
      await rebalanceLeagueReferees(existing.leagueId);
    }
  }

  // Anche in modalità manuale ribilanciamo le altre gare: la partita corrente
  // viene ignorata dall'automatismo ma occupa comunque l'arbitro scelto.
  if (mode === "manual") {
    await rebalanceLeagueReferees(existing.leagueId);
  }

  const state = await getAdminRefereeState(matchId);
  return NextResponse.json({ ok: true, ...state });
}
