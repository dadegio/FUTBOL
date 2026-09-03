import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  effectiveMatchEnd,
  refereeAllowsStart,
  refereeHasConflict,
} from "@/lib/referee-availability";
import { requireLeagueAdmin } from "@/lib/server-auth";
import { rebalanceLeagueReferees } from "@/lib/automatic-referees";

type Ctx = { params: Promise<{ leagueId: string }> };
type AvailabilityInput = { weekday: number; hour: number; minute: number };

function normalizeAvailability(value: unknown): AvailabilityInput[] | null {
  if (!Array.isArray(value)) return null;
  const normalized: AvailabilityInput[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const weekday = Number(raw.weekday);
    const hour = Number(raw.hour);
    const minute = Number(raw.minute);
    if (
      !Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59
    ) return null;
    const key = `${weekday}:${hour}:${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ weekday, hour, minute });
  }
  return normalized;
}

const availabilitySelect = { id: true, weekday: true, hour: true, minute: true };

export async function GET(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const denied = await requireLeagueAdmin(leagueId);
  if (denied) return denied;
  const isAdmin = true;
  const matchId = new URL(req.url).searchParams.get("matchId")?.trim() || null;

  const referees = await prisma.referee.findMany({
    where: { leagueId, ...(matchId || !isAdmin ? { active: true } : {}) },
    select: {
      id: true,
      name: true,
      active: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      availabilities: {
        select: availabilitySelect,
        orderBy: [{ weekday: "asc" }, { hour: "asc" }, { minute: "asc" }],
      },
      ...(isAdmin ? { account: { select: { id: true, username: true } } } : {}),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  if (!matchId) return NextResponse.json(referees);

  const match = await prisma.match.findFirst({
    where: { id: matchId, leagueId },
    select: { id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  const teamCompatible = referees.filter(
    (referee) => referee.teamId !== match.homeTeamId && referee.teamId !== match.awayTeamId
  );
  if (!match.date) return NextResponse.json(teamCompatible);

  const startsAt = match.date;
  const endsAt = effectiveMatchEnd(startsAt, match.slotEnd);
  const otherMatches = await prisma.match.findMany({
    where: { leagueId, id: { not: match.id }, date: { not: null } },
    select: {
      id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true, refereeId: true,
    },
  });

  return NextResponse.json(
    teamCompatible.filter(
      (referee) =>
        refereeAllowsStart(referee.availabilities, startsAt) &&
        !refereeHasConflict({
          refereeId: referee.id,
          teamId: referee.teamId,
          startsAt,
          endsAt,
          otherMatches,
        })
    )
  );
}

export async function POST(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const denied = await requireLeagueAdmin(leagueId);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const firstName = String(body?.firstName ?? "").trim().replace(/\s+/g, " ");
  const lastName = String(body?.lastName ?? "").trim().replace(/\s+/g, " ");
  const name = `${firstName} ${lastName}`.trim();
  const teamId = body?.teamId ? String(body.teamId).trim() : null;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Inserisci nome e cognome dell'arbitro" }, { status: 400 });
  }
  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, leagueId, activeInLeague: true }, select: { id: true },
    });
    if (!team) return NextResponse.json({ error: "Squadra di appartenenza non valida" }, { status: 400 });
  }

  try {
    const referee = await prisma.referee.create({
      data: { leagueId, name, teamId },
      select: {
        id: true, name: true, active: true, teamId: true,
        team: { select: { id: true, name: true } },
        availabilities: { select: availabilitySelect },
      },
    });
    await rebalanceLeagueReferees(leagueId);
    return NextResponse.json(referee, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Questo arbitro è già presente nell'elenco" }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const denied = await requireLeagueAdmin(leagueId);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Arbitro mancante" }, { status: 400 });

  const referee = await prisma.referee.findFirst({ where: { id, leagueId }, select: { id: true } });
  if (!referee) return NextResponse.json({ error: "Arbitro non trovato" }, { status: 404 });

  const name = body?.name === undefined ? undefined : String(body.name).trim().replace(/\s+/g, " ");
  const active = body?.active === undefined ? undefined : Boolean(body.active);
  const teamId = body?.teamId === undefined ? undefined : body.teamId ? String(body.teamId).trim() : null;
  const availability = body?.availability === undefined ? undefined : normalizeAvailability(body.availability);

  if (name !== undefined && name.length < 3) {
    return NextResponse.json({ error: "Inserisci nome e cognome dell'arbitro" }, { status: 400 });
  }
  if (body?.availability !== undefined && availability === null) {
    return NextResponse.json({ error: "Una o più disponibilità dell'arbitro non sono valide" }, { status: 400 });
  }
  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, leagueId, activeInLeague: true }, select: { id: true },
    });
    if (!team) return NextResponse.json({ error: "Squadra di appartenenza non valida" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.referee.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(active !== undefined ? { active } : {}),
          ...(teamId !== undefined ? { teamId } : {}),
        },
      });

      if (availability !== undefined && availability !== null) {
        await tx.refereeAvailability.deleteMany({ where: { refereeId: id } });
        if (availability.length > 0) {
          await tx.refereeAvailability.createMany({ data: availability.map((slot) => ({ refereeId: id, ...slot })) });
        }
      }

      const updated = await tx.referee.findUniqueOrThrow({
        where: { id },
        select: {
          id: true, name: true, active: true, teamId: true,
          team: { select: { id: true, name: true } },
          availabilities: {
            select: availabilitySelect,
            orderBy: [{ weekday: "asc" }, { hour: "asc" }, { minute: "asc" }],
          },
          account: { select: { id: true, username: true } },
        },
      });

      const assignedMatches = await tx.match.findMany({
        where: { leagueId, refereeId: id, refereeManualOverride: false, homeGoals: null, awayGoals: null },
        orderBy: [{ date: "asc" }, { round: "asc" }],
        select: { id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true, refereeId: true },
      });
      const invalidIds: string[] = [];

      if (!updated.active) {
        invalidIds.push(...assignedMatches.map((match) => match.id));
      } else {
        const assignedIds = assignedMatches.map((match) => match.id);
        const otherMatches = await tx.match.findMany({
          where: {
            leagueId,
            date: { not: null },
            ...(assignedIds.length ? { id: { notIn: assignedIds } } : {}),
          },
          select: { id: true, date: true, slotEnd: true, homeTeamId: true, awayTeamId: true, refereeId: true },
        });
        const acceptedAssigned: typeof otherMatches = [];

        for (const match of assignedMatches) {
          const playsThisMatch = Boolean(updated.teamId) &&
            (updated.teamId === match.homeTeamId || updated.teamId === match.awayTeamId);
          if (playsThisMatch) {
            invalidIds.push(match.id);
            continue;
          }
          if (!match.date) {
            acceptedAssigned.push(match);
            continue;
          }
          const startsAt = match.date;
          const endsAt = effectiveMatchEnd(startsAt, match.slotEnd);
          const invalidTime = !refereeAllowsStart(updated.availabilities, startsAt);
          const conflict = refereeHasConflict({
            refereeId: updated.id,
            teamId: updated.teamId,
            startsAt,
            endsAt,
            otherMatches: [...otherMatches, ...acceptedAssigned],
          });
          if (invalidTime || conflict) invalidIds.push(match.id);
          else acceptedAssigned.push(match);
        }
      }

      if (invalidIds.length > 0) {
        await tx.match.updateMany({ where: { id: { in: invalidIds } }, data: { refereeId: null } });
      }
      return { updated, releasedAssignments: invalidIds.length };
    });

    const automatic = await rebalanceLeagueReferees(leagueId);
    return NextResponse.json({ ...result.updated, releasedAssignments: result.releasedAssignments, automatic });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Esiste già un arbitro con questo nome o una disponibilità duplicata" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const denied = await requireLeagueAdmin(leagueId);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Arbitro mancante" }, { status: 400 });

  const referee = await prisma.referee.findFirst({ where: { id, leagueId }, select: { id: true, name: true } });
  if (!referee) return NextResponse.json({ error: "Arbitro non trovato" }, { status: 404 });

  const completedMatches = await prisma.match.count({
    where: { leagueId, refereeId: id, OR: [{ homeGoals: { not: null } }, { awayGoals: { not: null } }] },
  });
  if (completedMatches > 0) {
    return NextResponse.json({
      error: "Questo arbitro compare in partite già concluse. Per conservare lo storico puoi disattivarlo, ma non eliminarlo.",
    }, { status: 409 });
  }

  const releasedAssignments = await prisma.$transaction(async (tx) => {
    const released = await tx.match.updateMany({ where: { leagueId, refereeId: id }, data: { refereeId: null } });
    await tx.user.deleteMany({ where: { refereeId: id } });
    await tx.referee.delete({ where: { id } });
    return released.count;
  });
  const automatic = await rebalanceLeagueReferees(leagueId);
  return NextResponse.json({ ok: true, releasedAssignments, automatic });
}
