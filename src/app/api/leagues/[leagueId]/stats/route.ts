export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;

  // top scorers
  const scorersAgg = await prisma.matchPlayerStat.groupBy({
    by: ["playerId"],
    _sum: { goals: true },
    where: { match: { leagueId } },
    orderBy: { _sum: { goals: "desc" } },
    take: 5,
  });

  // top assists
  const assistsAgg = await prisma.matchPlayerStat.groupBy({
    by: ["playerId"],
    _sum: { assists: true },
    where: { match: { leagueId } },
    orderBy: { _sum: { assists: "desc" } },
    take: 5,
  });

  const scorerIds = scorersAgg.map(x => x.playerId);
  const assistIds = assistsAgg.map(x => x.playerId);
  const allIds = Array.from(new Set([...scorerIds, ...assistIds]));

  const players = await prisma.player.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      team: { select: { name: true } },
    },
  });

  const byId = new Map(players.map(p => [p.id, p]));

  const scorers = scorersAgg.map(x => {
    const p = byId.get(x.playerId);
    return {
      playerId: x.playerId,
      firstName: p?.firstName ?? "",
      lastName: p?.lastName ?? "",
      teamName: p?.team?.name ?? "",
      value: x._sum.goals ?? 0,
    };
  });

  const assists = assistsAgg.map(x => {
    const p = byId.get(x.playerId);
    return {
      playerId: x.playerId,
      firstName: p?.firstName ?? "",
      lastName: p?.lastName ?? "",
      teamName: p?.team?.name ?? "",
      value: x._sum.assists ?? 0,
    };
  });

  return NextResponse.json({ scorers, assists });
}