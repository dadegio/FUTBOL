import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

const PLAYOFF_FORMATS = new Set(["SINGLE_ELIM", "TWO_LEG"]);
const PLAYOFF_COUNTS = new Set([2, 4, 8, 16]);

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      playoffFormat: true,
      playoffTeamCount: true,
      playoffSeeded: true,
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Campionato non trovato" }, { status: 404 });
  }

  return NextResponse.json(league);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { leagueId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, playoffFormat: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Campionato non trovato" }, { status: 404 });
  }

  const data: {
    name?: string;
    playoffFormat?: "SINGLE_ELIM" | "TWO_LEG" | null;
    playoffTeamCount?: number | null;
    playoffSeeded?: boolean;
  } = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Nome torneo non valido" }, { status: 400 });
    }
    data.name = name;
  }

  if (body?.playoffEnabled !== undefined) {
    const enabled = body.playoffEnabled === true;

    if (!enabled) {
      const seriesCount = await prisma.playoffSeries.count({ where: { leagueId } });
      if (seriesCount > 0) {
        return NextResponse.json(
          { error: "I playoff sono già stati creati. Eliminali dalla sezione Playoff prima di disattivarli." },
          { status: 400 }
        );
      }

      data.playoffFormat = null;
      data.playoffTeamCount = null;
      data.playoffSeeded = true;
    } else {
      const format = String(body?.playoffFormat ?? "SINGLE_ELIM").trim();
      const teamCount = Number(body?.playoffTeamCount ?? 8);
      const playoffSeeded = body?.playoffSeeded !== false;

      if (!PLAYOFF_FORMATS.has(format)) {
        return NextResponse.json({ error: "Formato playoff non valido" }, { status: 400 });
      }

      if (!PLAYOFF_COUNTS.has(teamCount)) {
        return NextResponse.json({ error: "Numero squadre playoff non valido" }, { status: 400 });
      }

      const teamsInLeague = await prisma.team.count({
        where: { leagueId, activeInLeague: true },
      });
      if (teamsInLeague < teamCount) {
        return NextResponse.json(
          { error: `Servono almeno ${teamCount} squadre per questo playoff, ora ce ne sono ${teamsInLeague}.` },
          { status: 400 }
        );
      }

      data.playoffFormat = format as "SINGLE_ELIM" | "TWO_LEG";
      data.playoffTeamCount = teamCount;
      data.playoffSeeded = playoffSeeded;
    }
  }

  const updated = await prisma.league.update({
    where: { id: leagueId },
    data,
    select: {
      id: true,
      name: true,
      playoffFormat: true,
      playoffTeamCount: true,
      playoffSeeded: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { leagueId } = await ctx.params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Campionato non trovato" }, { status: 404 });
  }

  await prisma.league.delete({ where: { id: leagueId } });
  return NextResponse.json({ ok: true });
}
