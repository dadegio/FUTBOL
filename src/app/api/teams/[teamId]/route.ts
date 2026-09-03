export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireLeagueAdminForTeam, requireAdminOrCaptainOfTeam } from "@/lib/server-auth";
import { FUTPOLI_RULES } from "@/lib/tournament-rules";
import { canSeeAdminPlayerDetails, sanitizePlayerForRole } from "@/lib/player-visibility";

export async function GET(_: Request, ctx: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await ctx.params;
  const session = await getServerSession();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      league: { select: { id: true, name: true } },
      players: {
        orderBy: { number: "asc" },
        include: {
          stats: {
            select: { goals: true, assists: true },
          },
          sheetEntries: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!team) return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });

  const showAdminDetails = canSeeAdminPlayerDetails(session, team.league.id);
  const players = team.players.map(({ stats, sheetEntries, ...p }) => {
    const appearances = sheetEntries.length;
    const base = sanitizePlayerForRole(
      {
        ...p,
        goals: stats.reduce((s, r) => s + r.goals, 0),
        assists: stats.reduce((s, r) => s + r.assists, 0),
        appearances,
        ...(showAdminDetails
          ? { feeCents: appearances * FUTPOLI_RULES.playerFeeCentsPerAppearance }
          : {}),
      },
      session,
      team.league.id
    );

    return base;
  });

  return NextResponse.json({ ...team, players });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await ctx.params;
  const authErr = await requireAdminOrCaptainOfTeam(teamId);
  if (authErr) return authErr;


  const body = await req.json().catch(() => ({}));
  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  const badgeUrl =
    body?.badgeUrl === undefined ? undefined : body.badgeUrl === null ? null : String(body.badgeUrl).trim() || null;
  const description =
    body?.description === undefined ? undefined : body.description === null ? null : String(body.description).trim() || null;
  const colorHexRaw =
    body?.colorHex === undefined ? undefined : body.colorHex === null ? null : String(body.colorHex).trim();
  const colorHex = colorHexRaw === undefined || colorHexRaw === null
    ? colorHexRaw
    : colorHexRaw.toUpperCase();
  const secondaryColorHexRaw =
    body?.secondaryColorHex === undefined
      ? undefined
      : body.secondaryColorHex === null
        ? null
        : String(body.secondaryColorHex).trim();
  const secondaryColorHex =
    secondaryColorHexRaw === undefined || secondaryColorHexRaw === null
      ? secondaryColorHexRaw
      : secondaryColorHexRaw.toUpperCase();

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nome squadra non valido" }, { status: 400 });
  }

  if (colorHex !== undefined && colorHex !== null && !/^#[0-9A-F]{6}$/.test(colorHex)) {
    return NextResponse.json({ error: "Primo colore maglia non valido" }, { status: 400 });
  }

  if (secondaryColorHex !== undefined && secondaryColorHex !== null && !/^#[0-9A-F]{6}$/.test(secondaryColorHex)) {
    return NextResponse.json({ error: "Secondo colore maglia non valido" }, { status: 400 });
  }

  // verifica esistenza
  const existing = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, leagueId: true } });
  if (!existing) return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });

  // se cambia nome: assicurati che non esista già nella stessa lega
  if (name) {
    const dup = await prisma.team.findUnique({
      where: { leagueId_name: { leagueId: existing.leagueId, name } },
      select: { id: true },
    });
    if (dup && dup.id !== teamId) {
      return NextResponse.json({ error: "Squadra già esistente in questa lega" }, { status: 409 });
    }
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(badgeUrl !== undefined ? { badgeUrl } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(colorHex !== undefined ? { colorHex } : {}),
      ...(secondaryColorHex !== undefined ? { secondaryColorHex } : {}),
    },
    include: {
      league: { select: { id: true, name: true } },
      players: { orderBy: { number: "asc" } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await ctx.params;
  const authErr = await requireLeagueAdminForTeam(teamId);
  if (authErr) return authErr;
  const requestedLeagueId = new URL(req.url).searchParams.get("leagueId");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      leagueId: true,
      activeInLeague: true,
      badgeUrl: true,
      description: true,
      colorHex: true,
      secondaryColorHex: true,
      captain: { select: { id: true } },
      _count: {
        select: {
          players: true,
          sheetPlayers: true,
          homeSeries: true,
          awaySeries: true,
          wonSeries: true,
        },
      },
    },
  });

  if (!team || (requestedLeagueId && team.leagueId !== requestedLeagueId)) {
    return NextResponse.json({ error: "Squadra non trovata in questo torneo" }, { status: 404 });
  }

  if (!team.activeInLeague) {
    return NextResponse.json({ error: "La squadra è già stata rimossa dal torneo" }, { status: 409 });
  }

  const playoffReferences =
    team._count.homeSeries + team._count.awaySeries + team._count.wonSeries;

  if (playoffReferences > 0) {
    return NextResponse.json(
      {
        error:
          "La squadra è collegata al tabellone playoff. Elimina o reimposta prima i playoff, poi riprova.",
      },
      { status: 409 }
    );
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      id: true,
      homeGoals: true,
      awayGoals: true,
      _count: {
        select: {
          stats: true,
          sheetPlayers: true,
        },
      },
    },
  });

  const disposableMatchIds = matches
    .filter(
      (match) =>
        match.homeGoals === null &&
        match.awayGoals === null &&
        match._count.stats === 0 &&
        match._count.sheetPlayers === 0
    )
    .map((match) => match.id);

  const hasHistoricalMatches = disposableMatchIds.length !== matches.length;
  const hasStoredTeamData = Boolean(
    team.badgeUrl ||
      team.description ||
      team.colorHex ||
      team.secondaryColorHex ||
      team.captain ||
      team._count.players > 0 ||
      team._count.sheetPlayers > 0 ||
      hasHistoricalMatches
  );

  const result = await prisma.$transaction(async (tx) => {
    if (disposableMatchIds.length > 0) {
      await tx.match.deleteMany({ where: { id: { in: disposableMatchIds } } });
    }

    if (!hasStoredTeamData) {
      await tx.team.delete({ where: { id: teamId } });
      return {
        mode: "deleted" as const,
        message: "Squadra vuota eliminata definitivamente",
      };
    }

    await tx.team.update({
      where: { id: teamId },
      data: { activeInLeague: false },
    });

    return {
      mode: "removed" as const,
      message: "Squadra rimossa dal torneo; rosa e dati salvati restano disponibili",
    };
  });

  return NextResponse.json({ ok: true, ...result });
}
