export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { FUTPOLI_RULES, isPlayerEligibleForMatchSheet } from "@/lib/tournament-rules";

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { leagueId } = await ctx.params;

  const [league, teams, players, sheetCount, matches] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, name: true } }),
    prisma.team.findMany({ where: { leagueId }, select: { id: true, name: true } }),
    prisma.player.findMany({
      where: { team: { leagueId } },
      select: {
        id: true,
        teamId: true,
        status: true,
        documentSigned: true,
        mediaConsent: true,
        wildcardUsed: true,
      },
    }),
    prisma.matchSheetPlayer.count({ where: { match: { leagueId } } }),
    prisma.match.findMany({
      where: { leagueId, seriesId: null },
      select: { id: true, homeGoals: true, awayGoals: true, refereeCostCents: true },
    }),
  ]);

  if (!league) return NextResponse.json({ error: "Lega non trovata" }, { status: 404 });

  const authorized = players.filter((p) => isPlayerEligibleForMatchSheet(p)).length;

  const playedMatches = matches.filter((m) => m.homeGoals !== null && m.awayGoals !== null).length;

  const byTeam = teams.map((team) => {
    const teamPlayers = players.filter((p) => p.teamId === team.id);
    const teamAuthorized = teamPlayers.filter((p) => isPlayerEligibleForMatchSheet(p)).length;

    return {
      teamId: team.id,
      teamName: team.name,
      players: teamPlayers.length,
      authorized: teamAuthorized,
      blocked: teamPlayers.length - teamAuthorized,
      wildcards: teamPlayers.filter((p) => p.wildcardUsed).length,
    };
  });

  return NextResponse.json({
    league,
    rules: FUTPOLI_RULES,
    totals: {
      teams: teams.length,
      players: players.length,
      authorized,
      blocked: players.length - authorized,
      wildcards: players.filter((p) => p.wildcardUsed).length,
      sheetAppearances: sheetCount,
      playerFeesCents: sheetCount * FUTPOLI_RULES.playerFeeCentsPerAppearance,
      matches: matches.length,
      playedMatches,
      refereeFeesCents: playedMatches * FUTPOLI_RULES.refereeCostCentsPerMatch,
    },
    byTeam,
  });
}
