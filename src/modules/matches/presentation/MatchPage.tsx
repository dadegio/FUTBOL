export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sanitizePlayerForRole } from "@/lib/player-visibility";
import MatchResultForm from "./MatchResultForm";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ leagueId: string; matchId: string }>;
}) {
  const { leagueId, matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      referee: {
        select: {
          id: true,
        },
      },
      homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
      awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
      stats: true,
      sheetPlayers: { select: { playerId: true, teamId: true } },
    },
  });

  if (!match || match.leagueId !== leagueId) return notFound();

  const safeMatch = {
    ...match,
    homeTeam: {
      ...match.homeTeam,
      players: match.homeTeam.players.map((player) => sanitizePlayerForRole(player, null)),
    },
    awayTeam: {
      ...match.awayTeam,
      players: match.awayTeam.players.map((player) => sanitizePlayerForRole(player, null)),
    },
  };

  return <MatchResultForm match={JSON.parse(JSON.stringify(safeMatch))} />;
}
