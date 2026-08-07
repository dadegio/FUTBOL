import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoundRobin } from "@/lib/scheduler";
import { requireAdmin } from "@/lib/server-auth";
import {
  getFirstFullSlotWeek,
  getFixedFieldSlotOccurrences,
  getRoundSlotWeek,
  getSlotWeekWindow,
} from "@/lib/field-slots";
import { FUTPOLI_RULES } from "@/lib/tournament-rules";

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
      slotEnd: true,
      slotWeekStart: true,
      venueKey: true,
      venueName: true,
      venueAddress: true,
      referee: {
        select: {
          id: true,
          name: true,
        },
      },
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
        activeInLeague: true,
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

    const defaultReferee = await prisma.referee.upsert({
      where: {
        leagueId_name: {
          leagueId,
          name: "Sebastiano Marcato",
        },
      },
      update: { active: true },
      create: {
        leagueId,
        name: "Sebastiano Marcato",
      },
      select: { id: true },
    });

    try {
      const match = await prisma.match.create({
        data: {
          leagueId,
          round,
          homeTeamId,
          awayTeamId,
          refereeId: defaultReferee.id,
          ...(date
            ? {
                date,
                slotWeekStart: getSlotWeekWindow(date).startsAt,
              }
            : {}),
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
  const schedulingMode =
    body?.schedulingMode === "fixed_slots"
      ? "fixed_slots"
      : "captain_booking";

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

  if (!firstKickoff) {
    return NextResponse.json(
      {
        error:
          "Seleziona data e ora di inizio: serve per collegare ogni giornata alla propria settimana",
      },
      { status: 400 }
    );
  }

  const firstSlotWeek = getFirstFullSlotWeek(firstKickoff);

  const teams = await prisma.team.findMany({
    where: { leagueId, activeInLeague: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: { id: true },
  });

  const teamIds = teams.map((team) => team.id);

  if (teamIds.length !== FUTPOLI_RULES.teamCount) {
    return NextResponse.json(
      {
        error: `Il torneo richiede esattamente ${FUTPOLI_RULES.teamCount} squadre. Al momento ne risultano ${teamIds.length}.`,
      },
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

  const pairings = generateRoundRobin(teamIds, {
    random,
    seed,
    alternateHomeAway,
    doubleRound,
  });

  const assignedSlots = new Map<
    string,
    ReturnType<typeof getFixedFieldSlotOccurrences>[number]
  >();

  if (schedulingMode === "fixed_slots") {
    const rounds = [...new Set(pairings.map((pairing) => pairing.round))];

    for (const round of rounds) {
      const week = getRoundSlotWeek(firstSlotWeek.startsAt, round);
      const roundPairings = pairings
        .map((pairing, index) => ({ pairing, index }))
        .filter(({ pairing }) => pairing.round === round);
      const occurrences = getFixedFieldSlotOccurrences({
        from: week.startsAt,
        weeks: 1,
      }).filter((slot) => slot.startsAt.getTime() < week.endsAt.getTime());

      const occupied = await prisma.match.findMany({
        where: {
          venueKey: { not: null },
          date: {
            gte: week.startsAt,
            lt: week.endsAt,
          },
          ...(existingMatchIds.length
            ? { id: { notIn: existingMatchIds } }
            : {}),
        },
        select: { venueKey: true, date: true },
      });
      const occupiedKeys = new Set(
        occupied
          .filter((match) => match.venueKey && match.date)
          .map((match) => `${match.venueKey}:${match.date!.toISOString()}`)
      );
      const available = occurrences.filter(
        (slot) =>
          !occupiedKeys.has(`${slot.venueKey}:${slot.startsAt.toISOString()}`)
      );

      if (available.length < roundPairings.length) {
        return NextResponse.json(
          {
            error: `La settimana della giornata ${round} non ha abbastanza slot liberi (${available.length}/${roundPairings.length})`,
            round,
          },
          { status: 409 }
        );
      }

      roundPairings.forEach(({ pairing, index }, slotIndex) => {
        const pairingKey = `${pairing.round}:${pairing.homeTeamId}:${pairing.awayTeamId}:${index}`;
        assignedSlots.set(pairingKey, available[slotIndex]);
      });
    }
  }

  const defaultReferee = await prisma.referee.upsert({
    where: {
      leagueId_name: {
        leagueId,
        name: "Sebastiano Marcato",
      },
    },
    update: { active: true },
    create: {
      leagueId,
      name: "Sebastiano Marcato",
    },
    select: { id: true },
  });

  const matchData = pairings.map((pairing, index) => {
    const pairingKey = `${pairing.round}:${pairing.homeTeamId}:${pairing.awayTeamId}:${index}`;
    const slot = assignedSlots.get(pairingKey);
    const slotWeek = getRoundSlotWeek(firstSlotWeek.startsAt, pairing.round);

    return {
      leagueId,
      round: pairing.round,
      homeTeamId: pairing.homeTeamId,
      awayTeamId: pairing.awayTeamId,
      slotWeekStart: slotWeek.startsAt,
      refereeId: defaultReferee.id,
      ...(slot
        ? {
            date: slot.startsAt,
            slotEnd: slot.endsAt,
            venueKey: slot.venueKey,
            venueName: slot.venueName,
            venueAddress: slot.address,
            bookedAt: new Date(),
          }
        : {}),
    };
  });

  try {
    await prisma.$transaction([
      ...(replace
        ? [
            prisma.match.deleteMany({
              where: { leagueId, seriesId: null },
            }),
          ]
        : []),
      prisma.match.createMany({ data: matchData }),
    ]);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Uno degli slot è stato occupato durante la generazione. Riprova per ricalcolare il calendario.",
        },
        { status: 409 }
      );
    }

    throw error;
  }

  const rounds = pairings.length
    ? Math.max(...pairings.map((pairing) => pairing.round))
    : 0;

  return NextResponse.json({
    created: pairings.length,
    rounds,
    scheduled: assignedSlots.size === pairings.length && pairings.length > 0,
    schedulingMode,
    programStartsAt: firstSlotWeek.startsAt,
  });
}
