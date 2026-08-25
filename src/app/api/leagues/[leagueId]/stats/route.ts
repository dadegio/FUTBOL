export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayerLookup = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  photoZoom: number;
  photoPositionX: number;
  photoPositionY: number;
  teamId: string;
  team: {
    name: string;
    badgeUrl: string | null;
  } | null;
};

type StatRow = {
  playerId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  photoZoom: number;
  photoPositionX: number;
  photoPositionY: number;
  teamName: string;
  teamBadgeUrl: string | null;
  value: number;
};

function toRow(player: PlayerLookup | undefined, value: number, playerId: string): StatRow {
  return {
    playerId,
    firstName: player?.firstName ?? "",
    lastName: player?.lastName ?? "",
    photoUrl: player?.photoUrl ?? null,
    photoZoom: player?.photoZoom ?? 1,
    photoPositionX: player?.photoPositionX ?? 50,
    photoPositionY: player?.photoPositionY ?? 50,
    teamName: player?.team?.name ?? "",
    teamBadgeUrl: player?.team?.badgeUrl ?? null,
    value,
  };
}

export async function GET(
  _: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params;

  const [scorersAgg, assistsAgg, players] = await Promise.all([
    prisma.matchPlayerStat.groupBy({
      by: ["playerId"],
      _sum: { goals: true },
      where: {
        match: { leagueId },
        player: { team: { activeInLeague: true } },
      },
      orderBy: { _sum: { goals: "desc" } },
      take: 10,
    }),

    prisma.matchPlayerStat.groupBy({
      by: ["playerId"],
      _sum: { assists: true },
      where: {
        match: { leagueId },
        player: { team: { activeInLeague: true } },
      },
      orderBy: { _sum: { assists: "desc" } },
      take: 10,
    }),

    prisma.player.findMany({
      where: { team: { leagueId, activeInLeague: true } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        photoZoom: true,
        photoPositionX: true,
        photoPositionY: true,
        teamId: true,
        team: {
          select: {
            name: true,
            badgeUrl: true,
          },
        },
      },
    }),
  ]);

  const byId = new Map<string, PlayerLookup>(players.map((p) => [p.id, p]));

  const scorers: StatRow[] = scorersAgg
    .map((x) => toRow(byId.get(x.playerId), x._sum.goals ?? 0, x.playerId))
    .filter((x) => x.value > 0);

  const assists: StatRow[] = assistsAgg
    .map((x) => toRow(byId.get(x.playerId), x._sum.assists ?? 0, x.playerId))
    .filter((x) => x.value > 0);

  return NextResponse.json({
    scorers,
    assists,
  });
}
