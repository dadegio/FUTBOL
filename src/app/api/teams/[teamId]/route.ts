export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireAdminOrCaptainOfTeam } from "@/lib/server-auth";
import { FUTPOLI_RULES } from "@/lib/tournament-rules";
import { canSeeAdminPlayerDetails, sanitizePlayerForRole } from "@/lib/player-visibility";

export async function GET(_: Request, ctx: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await ctx.params;
  const session = await getServerSession();
  const showAdminDetails = canSeeAdminPlayerDetails(session);

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
      session
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

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nome squadra non valido" }, { status: 400 });
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
    },
    include: {
      league: { select: { id: true, name: true } },
      players: { orderBy: { number: "asc" } },
    },
  });

  return NextResponse.json(updated);
}