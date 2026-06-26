export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FUTPOLI_RULES } from "@/lib/tournament-rules";

export async function GET(
  _: Request,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!player) {
    return NextResponse.json(
      { error: "Giocatore non trovato" },
      { status: 404 }
    );
  }

  const [agg, sheetEntries, recentStats] = await Promise.all([
    prisma.matchPlayerStat.aggregate({
      where: { playerId },
      _sum: {
        goals: true,
        assists: true,
      },
    }),

    prisma.matchSheetPlayer.findMany({
      where: { playerId },
      orderBy: [{ match: { date: "desc" } }, { createdAt: "desc" }],
      take: 8,
      select: {
        matchId: true,
        match: {
          select: {
            id: true,
            date: true,
            homeGoals: true,
            awayGoals: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
    }),

    prisma.matchPlayerStat.findMany({
      where: { playerId },
      select: {
        matchId: true,
        goals: true,
        assists: true,
      },
    }),
  ]);

  const statsByMatch = new Map<string, { goals: number; assists: number }>(
    recentStats.map((row) => [
      row.matchId,
      { goals: row.goals, assists: row.assists },
    ])
  );

  const appearances = await prisma.matchSheetPlayer.count({ where: { playerId } });

  return NextResponse.json({
    goals: agg._sum.goals ?? 0,
    assists: agg._sum.assists ?? 0,
    appearances,
    feeCents: appearances * FUTPOLI_RULES.playerFeeCentsPerAppearance,
    recentMatches: sheetEntries.map((entry) => {
      const stat = statsByMatch.get(entry.matchId);
      const match = entry.match;

      return {
        matchId: match.id,
        date: match.date,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        goals: stat?.goals ?? 0,
        assists: stat?.assists ?? 0,
      };
    }),
  });
}
