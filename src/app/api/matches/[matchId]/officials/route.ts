import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMatchEnd, refereeAllowsStart, refereeHasConflict } from "@/lib/referee-availability";
import { requireAdmin } from "@/lib/server-auth";

type Ctx = { params: Promise<{ matchId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const { matchId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const refereeId = body?.refereeId ? String(body.refereeId).trim() : null;

  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, leagueId: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true },
  });
  if (!existing) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  if (refereeId) {
    const referee = await prisma.referee.findFirst({
      where: {
        id: refereeId, leagueId: existing.leagueId, active: true,
        OR: [{ teamId: null }, { teamId: { notIn: [existing.homeTeamId, existing.awayTeamId] } }],
      },
      select: { id: true, teamId: true, availabilities: { select: { weekday: true, hour: true, minute: true } } },
    });
    if (!referee) return NextResponse.json({ error: "Arbitro non disponibile per questa partita" }, { status: 400 });

    if (existing.date) {
      const startsAt = existing.date;
      const endsAt = effectiveMatchEnd(startsAt, existing.slotEnd);
      if (!refereeAllowsStart(referee.availabilities, startsAt)) {
        return NextResponse.json({ error: "L'arbitro non è disponibile in questo giorno/orario" }, { status: 409 });
      }
      const otherMatches = await prisma.match.findMany({
        where: { leagueId: existing.leagueId, id: { not: existing.id }, date: { not: null } },
        select: { id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true, refereeId: true },
      });
      if (refereeHasConflict({ refereeId: referee.id, teamId: referee.teamId, startsAt, endsAt, otherMatches })) {
        return NextResponse.json({ error: "L'arbitro è già impegnato oppure la sua squadra gioca contemporaneamente" }, { status: 409 });
      }
    }
  }

  const officials = await prisma.match.update({
    where: { id: matchId }, data: { refereeId },
    select: { referee: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ok: true, officials });
}
