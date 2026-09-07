/**
 * Admin-only user management endpoints.
 *
 * GET  /api/users          — list all users (passwords excluded)
 * POST /api/users          — create a new user
 * DELETE /api/users?id=…   — delete a user by id (admin account is protected)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireAdmin } from "@/lib/server-auth";
import { hashPassword } from "@/lib/session";
import { writeAuditLog } from "@/modules/audit/application/audit-service";

// ── GET /api/users ────────────────────────────────────────────────────────────
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      teamId: true,
      refereeId: true,
      leagueId: true,
      adminLeague: { select: { name: true } },
      team: { select: { name: true } },
      referee: {
        select: {
          name: true,
          league: { select: { name: true } },
        },
      },
      creatorProfile: {
        select: {
          displayName: true,
          roleLabel: true,
          league: { select: { name: true } },
        },
      },
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  return NextResponse.json(users);
}

// ── POST /api/users ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { username, password, role, teamId, refereeId, leagueId } = body as {
    username?: string;
    password?: string;
    role?: string;
    teamId?: string | null;
    refereeId?: string | null;
    leagueId?: string | null;
  };

  if (!username?.trim()) {
    return NextResponse.json({ error: "Username obbligatorio" }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Password minimo 4 caratteri" }, { status: 400 });
  }
  if (
    role !== "ADMIN" &&
    role !== "LEAGUE_ADMIN" &&
    role !== "CAPTAIN" &&
    role !== "REFEREE" &&
    role !== "CREATOR"
  ) {
    return NextResponse.json(
      { error: "Ruolo non valido" },
      { status: 400 }
    );
  }
  if ((role === "LEAGUE_ADMIN" || role === "CREATOR") && !leagueId) {
    return NextResponse.json({ error: role === "CREATOR" ? "Seleziona il torneo del creator" : "Seleziona il torneo da amministrare" }, { status: 400 });
  }
  if (role === "CAPTAIN" && !teamId) {
    return NextResponse.json({ error: "Specifica teamId per un capitano" }, { status: 400 });
  }
  if (role === "REFEREE" && !refereeId) {
    return NextResponse.json(
      { error: "Seleziona l'arbitro da collegare all'account" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username già in uso" }, { status: 409 });
  }

  try {
    const session = await getServerSession();
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash: hashPassword(password),
        role: role as "ADMIN" | "LEAGUE_ADMIN" | "CAPTAIN" | "REFEREE" | "CREATOR",
        leagueId: role === "LEAGUE_ADMIN" || role === "CREATOR" ? leagueId : null,
        teamId: role === "CAPTAIN" ? teamId : null,
        refereeId: role === "REFEREE" ? refereeId : null,
        creatorProfile: role === "CREATOR" && leagueId
          ? {
              create: {
                leagueId,
                displayName: username.trim(),
                roleLabel: "Creator",
              },
            }
          : undefined,
      },
      select: {
        id: true,
        username: true,
        role: true,
        teamId: true,
        refereeId: true,
        leagueId: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      leagueId: user.leagueId ?? null,
      actor: session,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      summary: `Creato utente ${user.username} (${user.role})`,
      metadata: { role: user.role, teamId: user.teamId, refereeId: user.refereeId, leagueId: user.leagueId },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        {
          error:
            role === "REFEREE"
              ? "Questo arbitro ha già un account"
              : "Squadra o username già associati a un account",
        },
        { status: 409 }
      );
    }
    throw error;
  }
}

// ── PATCH /api/users?id=… ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parametro id mancante" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password minimo 8 caratteri" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const session = await getServerSession();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(password) },
  });

  await writeAuditLog({
    leagueId: user.leagueId ?? null,
    actor: session,
    action: "user.password_updated",
    entityType: "user",
    entityId: id,
    summary: `Aggiornata password utente ${user.username}`,
  });

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/users?id=… ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parametro id mancante" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // Prevent deleting the last admin
  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Impossibile eliminare l'unico account admin" },
        { status: 400 }
      );
    }
  }

  const session = await getServerSession();
  await prisma.user.delete({ where: { id } });
  await writeAuditLog({
    leagueId: user.leagueId ?? null,
    actor: session,
    action: "user.deleted",
    entityType: "user",
    entityId: id,
    summary: `Eliminato utente ${user.username}`,
    metadata: { role: user.role },
  });
  return NextResponse.json({ ok: true });
}
