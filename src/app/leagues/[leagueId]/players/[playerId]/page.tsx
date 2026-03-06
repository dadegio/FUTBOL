export const runtime = "nodejs";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ leagueId: string; playerId: string }>;
}) {
  const { leagueId, playerId } = await params;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      number: true,
      team: { select: { id: true, name: true, leagueId: true } },
    },
  });

  if (!player || player.team.leagueId !== leagueId) return notFound();

  const totals = await prisma.matchPlayerStat.aggregate({
    where: { playerId, match: { leagueId } },
    _sum: { goals: true, assists: true },
  });

  const goals = totals._sum.goals ?? 0;
  const assists = totals._sum.assists ?? 0;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>
        #{player.number} {player.firstName} {player.lastName}
      </h1>

      <div style={{ opacity: 0.8, marginBottom: 12 }}>
        Squadra: <b>{player.team.name}</b>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div>Gol torneo: <b>{goals}</b></div>
        <div>Assist torneo: <b>{assists}</b></div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link href={`/leagues/${leagueId}/teams/${player.team.id}`} style={{ textDecoration: "none" }}>
          ← Vai alla squadra
        </Link>
      </div>
    </div>
  );
}