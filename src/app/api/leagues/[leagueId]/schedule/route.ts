import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoundRobin } from "@/lib/scheduler";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params;

  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase") ?? "league";

  const seriesFilter =
    phase === "playoff"
      ? { seriesId: { not: null as unknown as string } }
      : phase === "all"
        ? {}
        : { seriesId: null };

  const matches = await prisma.match.findMany({
    where: { leagueId, ...seriesFilter },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      leagueId: true,
      round: true,
      date: true,
      homeGoals: true,
      awayGoals: true,
      seriesId: true,
      leg: true,
      homeTeam: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
        },
      },
    },
  });

  return NextResponse.json(matches);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { leagueId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const mode = String(body?.mode ?? "");

  if (mode === "manual") {
    const round = Number(body?.round);
    const homeTeamId = String(body?.homeTeamId ?? "").trim();
    const awayTeamId = String(body?.awayTeamId ?? "").trim();
    const dateRaw = body?.date ? String(body.date).trim() : null;

    if (!Number.isInteger(round) || round <= 0) {
      return NextResponse.json(
        { error: "Giornata non valida" },
        { status: 400 }
      );
    }

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json(
        { error: "Squadre mancanti" },
        { status: 400 }
      );
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: "Una squadra non può giocare contro se stessa" },
        { status: 400 }
      );
    }

    const teams = await prisma.team.findMany({
      where: {
        leagueId,
        id: { in: [homeTeamId, awayTeamId] },
      },
      select: { id: true },
    });

    if (teams.length !== 2) {
      return NextResponse.json(
        { error: "Squadre non valide per questa lega" },
        { status: 400 }
      );
    }

    const date = dateRaw ? new Date(dateRaw) : null;

    if (dateRaw && Number.isNaN(date?.getTime())) {
      return NextResponse.json(
        { error: "Data partita non valida" },
        { status: 400 }
      );
    }

    try {
      const match = await prisma.match.create({
        data: {
          leagueId,
          round,
          homeTeamId,
          awayTeamId,
          ...(date ? { date } : {}),
        },
      });

      return NextResponse.json(match);
    } catch {
      return NextResponse.json(
        { error: "Partita duplicata o dati non validi" },
        { status: 400 }
      );
    }
  }

  const random = body?.random !== false;
  const doubleRound = body?.doubleRound !== false;
  const replace = body?.replace === true;
  const alternateHomeAway = body?.alternateHomeAway !== false;

  const seed =
    body?.seed === undefined ||
    body?.seed === null ||
    String(body.seed).trim() === ""
      ? undefined
      : Number(body.seed);

  if (seed !== undefined && !Number.isFinite(seed)) {
    return NextResponse.json({ error: "Seed non valido" }, { status: 400 });
  }

  const firstDateTime =
    body?.firstDateTime === undefined || body?.firstDateTime === null
      ? null
      : String(body.firstDateTime).trim();

  const roundIntervalDays = Number(body?.roundIntervalDays ?? 7);
  const slotMinutes = Number(body?.slotMinutes ?? 70);
  const pitchCount = Number(body?.pitchCount ?? 1);

  if (
    !Number.isInteger(roundIntervalDays) ||
    roundIntervalDays < 1 ||
    roundIntervalDays > 30
  ) {
    return NextResponse.json(
      { error: "Intervallo tra giornate non valido" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(slotMinutes) || slotMinutes < 30 || slotMinutes > 240) {
    return NextResponse.json(
      { error: "Durata slot non valida" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(pitchCount) || pitchCount < 1 || pitchCount > 8) {
    return NextResponse.json(
      { error: "Numero campi non valido" },
      { status: 400 }
    );
  }

  let firstKickoff: Date | null = null;

  if (firstDateTime) {
    firstKickoff = new Date(firstDateTime);

    if (Number.isNaN(firstKickoff.getTime())) {
      return NextResponse.json(
        { error: "Data di inizio non valida" },
        { status: 400 }
      );
    }
  }

  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: { id: true },
  });

  const teamIds = teams.map((team) => team.id);

  if (teamIds.length < 2) {
    return NextResponse.json(
      { error: "Servono almeno 2 squadre" },
      { status: 400 }
    );
  }

  const existingMatches = await prisma.match.findMany({
    where: { leagueId, seriesId: null },
    select: {
      id: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  if (existingMatches.length > 0 && !replace) {
    return NextResponse.json(
      {
        error: "Calendario già presente: usa Rigenera calendario per sostituirlo",
        existing: existingMatches.length,
      },
      { status: 409 }
    );
  }

  const existingMatchIds = existingMatches.map((match) => match.id);

  const [statsCount, sheetPlayersCount] =
    existingMatchIds.length > 0
      ? await Promise.all([
          prisma.matchPlayerStat.count({
            where: { matchId: { in: existingMatchIds } },
          }),
          prisma.matchSheetPlayer.count({
            where: { matchId: { in: existingMatchIds } },
          }),
        ])
      : [0, 0];

  const lockedByResult = existingMatches.filter(
    (match) => match.homeGoals !== null || match.awayGoals !== null
  );

  const hasProtectedData =
    lockedByResult.length > 0 || statsCount > 0 || sheetPlayersCount > 0;

  if (replace && hasProtectedData) {
    return NextResponse.json(
      {
        error:
          "Non posso rigenerare: ci sono partite già compilate con risultati, statistiche o distinte",
        locked: lockedByResult.length,
        stats: statsCount,
        sheetPlayers: sheetPlayersCount,
      },
      { status: 400 }
    );
  }

  if (replace) {
    await prisma.match.deleteMany({
      where: { leagueId, seriesId: null },
    });
  }

  const pairings = generateRoundRobin(teamIds, {
    random,
    seed,
    alternateHomeAway,
    doubleRound,
  });

  const matchIndexByRound = new Map<number, number>();

  await prisma.match.createMany({
    data: pairings.map((pairing) => {
      const roundMatchIndex = matchIndexByRound.get(pairing.round) ?? 0;
      matchIndexByRound.set(pairing.round, roundMatchIndex + 1);

      let date: Date | undefined;

      if (firstKickoff) {
        date = new Date(firstKickoff);
        date.setDate(
          date.getDate() + (pairing.round - 1) * roundIntervalDays
        );
        date.setMinutes(
          date.getMinutes() +
            Math.floor(roundMatchIndex / pitchCount) * slotMinutes
        );
      }

      return {
        leagueId,
        round: pairing.round,
        homeTeamId: pairing.homeTeamId,
        awayTeamId: pairing.awayTeamId,
        ...(date ? { date } : {}),
      };
    }),
  });

  const rounds = pairings.length
    ? Math.max(...pairings.map((pairing) => pairing.round))
    : 0;

  return NextResponse.json({
    created: pairings.length,
    rounds,
    scheduled: Boolean(firstKickoff),
  });
}
