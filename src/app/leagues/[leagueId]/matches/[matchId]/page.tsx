export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MatchResultForm from "./result-form";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ leagueId: string; matchId: string }>;
}) {
  const { leagueId, matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      stats: true,
    },
  });

  if (!match || match.leagueId !== leagueId) return notFound();

  const safeMatch = JSON.parse(JSON.stringify(match));
  return <MatchResultForm match={safeMatch} />;
}