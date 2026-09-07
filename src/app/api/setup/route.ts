/**
 * One-time setup endpoint.
 * Creates the admin account and one captain account per existing team.
 * Only works if no users exist yet (idempotent / safe to re-run check).
 *
 * Call once:  POST /api/setup   (no body needed)
 * Response:   table of created credentials
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/session";
import { ipRateLimit } from "@/modules/core/security/rate-limit";
import {
  generateTemporaryPassword,
  slugifyUsername,
} from "@/lib/credentials";

export async function POST(req: Request) {
  const limited = ipRateLimit(req, "setup", {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    message: "Troppi tentativi di setup. Riprova più tardi.",
  });
  if (limited) return limited;

  // Guard: only run if no users exist
  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "Setup già eseguito. Utenti esistenti trovati." },
      { status: 409 }
    );
  }

  const teams = await prisma.team.findMany({
    where: { activeInLeague: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: {
    username: string;
    password: string;
    role: string;
    team: string;
  }[] = [];

  // Create admin
  const adminPassword = generateTemporaryPassword();
  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: hashPassword(adminPassword),
      role: "ADMIN",
      teamId: null,
    },
  });
  results.push({ username: "admin", password: adminPassword, role: "ADMIN", team: "—" });

  // Create one captain per team
  const seen = new Set<string>();
  for (const team of teams) {
    const base =
      slugifyUsername(team.name) || `squadra_${team.id.slice(0, 6)}`;
    let username = base;
    let i = 2;
    while (seen.has(username)) {
      username = `${base}_${i++}`;
    }
    seen.add(username);

    const password = generateTemporaryPassword();
    await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "CAPTAIN",
        teamId: team.id,
      },
    });
    results.push({ username, password, role: "CAPTAIN", team: team.name });
  }

  const referees = await prisma.referee.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  for (const referee of referees) {
    const base = `arbitro.${slugifyUsername(referee.name) || referee.id.slice(0, 6)}`;
    let username = base;
    let suffix = 2;

    while (seen.has(username)) {
      username = `${base}.${suffix++}`;
    }
    seen.add(username);

    const password = generateTemporaryPassword();
    await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "REFEREE",
        refereeId: referee.id,
      },
    });
    results.push({
      username,
      password,
      role: "REFEREE",
      team: `Arbitro: ${referee.name}`,
    });
  }

  return NextResponse.json({ ok: true, accounts: results });
}
