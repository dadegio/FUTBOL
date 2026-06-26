import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrCaptainOfMatch } from "@/lib/server-auth";
import { syncPlayoffSeriesWinner } from "@/lib/playoff-progress";
import { AUTHORIZED_PLAYER_STATUS, FUTPOLI_RULES } from "@/lib/tournament-rules";

type Body = {
  homeGoals?: number;
  awayGoals?: number;
  playerStats?: Array<{ playerId: string; goals: number; assists: number }>;
  sheetPlayerIds?: string[];
};

function asNonNegInt(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const i = Math.floor(x);
  if (i < 0) return null;
  return i;
}

function isEligiblePlayer(p: {
  status: string;
  documentSigned: boolean;
  privacyConsent: boolean;
  internalPhotoConsent: boolean;
  healthDeclaration: boolean;
}) {
  return (
    p.status === AUTHORIZED_PLAYER_STATUS &&
    p.documentSigned &&
    p.privacyConsent &&
    p.internalPhotoConsent &&
    p.healthDeclaration
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  const authErr = await requireAdminOrCaptainOfMatch(matchId);
  if (authErr) return authErr;

  const body = (await req.json().catch(() => ({}))) as Body;

  const homeGoals = body.homeGoals === undefined ? undefined : asNonNegInt(body.homeGoals);
  const awayGoals = body.awayGoals === undefined ? undefined : asNonNegInt(body.awayGoals);

  if (homeGoals === null) {
    return NextResponse.json({ error: "homeGoals non valido" }, { status: 400 });
  }

  if (awayGoals === null) {
    return NextResponse.json({ error: "awayGoals non valido" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      leagueId: true,
      homeTeamId: true,
      awayTeamId: true,
      seriesId: true,
      league: {
        select: {
          playoffFormat: true,
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  const rows = Array.isArray(body.playerStats) ? body.playerStats : [];

  for (const r of rows) {
    if (!r?.playerId) {
      return NextResponse.json({ error: "playerId mancante" }, { status: 400 });
    }

    const g = asNonNegInt(r.goals);
    const a = asNonNegInt(r.assists);

    if (g === null || a === null) {
      return NextResponse.json({ error: "goals/assists non validi" }, { status: 400 });
    }
  }

  const requestedSheetIds = Array.isArray(body.sheetPlayerIds)
    ? [...new Set(body.sheetPlayerIds.map((id) => String(id).trim()).filter(Boolean))]
    : [];

  if (requestedSheetIds.length === 0) {
    return NextResponse.json(
      { error: "Distinta gara mancante: seleziona i giocatori presenti" },
      { status: 400 }
    );
  }

  type EligiblePlayer = {
    id: string;
    teamId: string;
    status: string;
    documentSigned: boolean;
    privacyConsent: boolean;
    internalPhotoConsent: boolean;
    healthDeclaration: boolean;
    firstName: string;
    lastName: string;
  };

  const playerIds = [...new Set([...rows.map((r) => r.playerId), ...requestedSheetIds])];
  const players: EligiblePlayer[] = playerIds.length
    ? await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: {
          id: true,
          teamId: true,
          status: true,
          documentSigned: true,
          privacyConsent: true,
          internalPhotoConsent: true,
          healthDeclaration: true,
          firstName: true,
          lastName: true,
        },
      })
    : [];

  const playerById = new Map<string, EligiblePlayer>(players.map((p) => [p.id, p]));

  for (const pid of playerIds) {
    const p = playerById.get(pid);

    if (!p) {
      return NextResponse.json({ error: "Giocatore non valido" }, { status: 400 });
    }

    if (p.teamId !== match.homeTeamId && p.teamId !== match.awayTeamId) {
      return NextResponse.json(
        { error: "Un giocatore non appartiene alle squadre della partita" },
        { status: 400 }
      );
    }
  }

  const sheetPlayers = requestedSheetIds.map((pid) => playerById.get(pid)!);
  const homeSheet = sheetPlayers.filter((p) => p.teamId === match.homeTeamId);
  const awaySheet = sheetPlayers.filter((p) => p.teamId === match.awayTeamId);

  if (homeSheet.length < FUTPOLI_RULES.minPlayersInMatchSheet || awaySheet.length < FUTPOLI_RULES.minPlayersInMatchSheet) {
    return NextResponse.json(
      { error: `Ogni squadra deve avere almeno ${FUTPOLI_RULES.minPlayersInMatchSheet} giocatori autorizzati in distinta` },
      { status: 400 }
    );
  }

  const ineligible = sheetPlayers.find((p) => !isEligiblePlayer(p));
  if (ineligible) {
    return NextResponse.json(
      { error: `${ineligible.firstName} ${ineligible.lastName} non è autorizzato per la distinta` },
      { status: 400 }
    );
  }

  const sheetSet = new Set(requestedSheetIds);
  const statOutsideSheet = rows.find((r) => !sheetSet.has(r.playerId));
  if (statOutsideSheet) {
    return NextResponse.json(
      { error: "Gol e assist possono essere assegnati solo a giocatori presenti in distinta" },
      { status: 400 }
    );
  }

  let winnerId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: {
        refereeCostCents: FUTPOLI_RULES.refereeCostCentsPerMatch,
        ...(homeGoals !== undefined ? { homeGoals } : {}),
        ...(awayGoals !== undefined ? { awayGoals } : {}),
      },
    });

    await tx.matchSheetPlayer.deleteMany({ where: { matchId } });
    await tx.matchSheetPlayer.createMany({
      data: sheetPlayers.map((p) => ({
        matchId,
        playerId: p.id,
        teamId: p.teamId,
      })),
    });

    await tx.matchPlayerStat.deleteMany({ where: { matchId } });

    if (rows.length) {
      await tx.matchPlayerStat.createMany({
        data: rows.map((r) => ({
          matchId,
          playerId: r.playerId,
          goals: Math.floor(r.goals),
          assists: Math.floor(r.assists),
        })),
      });
    }

    if (match.seriesId && match.league.playoffFormat) {
      await tx.playoffSeries.update({
        where: { id: match.seriesId },
        data: {
          winnerId: null,
          penaltiesHome: null,
          penaltiesAway: null,
        },
      });

      winnerId = await syncPlayoffSeriesWinner(tx, {
        leagueId: match.leagueId,
        seriesId: match.seriesId,
        format: match.league.playoffFormat,
      });
    }
  });

  return NextResponse.json({ ok: true, winnerId });
}
