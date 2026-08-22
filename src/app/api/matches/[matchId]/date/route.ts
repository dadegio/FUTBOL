export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { getSlotWeekWindow } from "@/lib/field-slots";
import { effectiveMatchEnd, matchOverlapsWindow, refereeAllowsStart, refereeHasConflict } from "@/lib/referee-availability";

type Ctx = { params: Promise<{ matchId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireAdmin(); if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const rawDate = body?.date;
  let date: Date | null;
  if (rawDate === null || rawDate === "") date = null;
  else if (typeof rawDate === "string") { date = new Date(rawDate); if (isNaN(date.getTime())) return NextResponse.json({ error: "Data non valida" }, { status: 400 }); }
  else return NextResponse.json({ error: "Parametro 'date' mancante o non valido" }, { status: 400 });

  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, leagueId: true, homeTeamId: true, awayTeamId: true, refereeId: true, homeGoals: true, awayGoals: true },
  });
  if (!existing) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  if (existing.homeGoals !== null || existing.awayGoals !== null) return NextResponse.json({ error: "Non puoi spostare una partita già conclusa" }, { status: 400 });

  if (!date) {
    await prisma.match.update({ where: { id: matchId }, data: { date: null, slotEnd: null, venueKey: null, venueName: null, venueAddress: null, bookedByUserId: null, bookedAt: null, refereeId: null } });
    return NextResponse.json({ ok: true, referee: null });
  }

  const startsAt = date; const endsAt = effectiveMatchEnd(startsAt, null);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [referees, otherMatches] = await Promise.all([
        tx.referee.findMany({ where: { leagueId: existing.leagueId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, teamId: true, availabilities: { select: { weekday: true, hour: true, minute: true } } } }),
        tx.match.findMany({ where: { leagueId: existing.leagueId, id: { not: matchId }, date: { not: null } }, select: { id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true, refereeId: true } }),
      ]);
      const teamConflict = otherMatches.some((m) =>
        (m.homeTeamId === existing.homeTeamId || m.awayTeamId === existing.homeTeamId || m.homeTeamId === existing.awayTeamId || m.awayTeamId === existing.awayTeamId) && matchOverlapsWindow(m, startsAt, endsAt));
      if (teamConflict) throw new Error("TEAM_CONFLICT");

      const affiliated = new Set(referees.filter((r) => r.teamId === existing.homeTeamId || r.teamId === existing.awayTeamId).map((r) => r.id));
      const releaseIds = otherMatches.filter((m) => Boolean(m.refereeId) && affiliated.has(m.refereeId!) && matchOverlapsWindow(m, startsAt, endsAt)).map((m) => m.id);
      if (releaseIds.length) {
        await tx.match.updateMany({ where: { id: { in: releaseIds } }, data: { refereeId: null } });
        for (const m of otherMatches) if (releaseIds.includes(m.id)) m.refereeId = null;
      }
      const load = new Map<string, number>(); for (const m of otherMatches) if (m.refereeId) load.set(m.refereeId, (load.get(m.refereeId) ?? 0) + 1);
      const ordered = [...referees].sort((a,b) => ((load.get(a.id) ?? 0) - (load.get(b.id) ?? 0)) || a.name.localeCompare(b.name));
      const compatible = (r: (typeof referees)[number]) => r.teamId !== existing.homeTeamId && r.teamId !== existing.awayTeamId && refereeAllowsStart(r.availabilities, startsAt) && !refereeHasConflict({ refereeId: r.id, teamId: r.teamId, startsAt, endsAt, otherMatches });
      const current = ordered.find((r) => r.id === existing.refereeId && compatible(r)); const assigned = current ?? ordered.find(compatible) ?? null;
      const updated = await tx.match.update({
        where: { id: matchId },
        data: { date: startsAt, slotEnd: endsAt, venueKey: null, venueName: null, venueAddress: null, bookedByUserId: null, bookedAt: null, slotWeekStart: getSlotWeekWindow(startsAt).startsAt, refereeId: assigned?.id ?? null },
        select: { referee: { select: { id: true, name: true } } },
      });
      return { referee: updated.referee, releasedRefereeAssignments: releaseIds.length };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_CONFLICT") return NextResponse.json({ error: "Una delle due squadre ha già una partita in questo intervallo" }, { status: 409 });
    throw error;
  }
}
