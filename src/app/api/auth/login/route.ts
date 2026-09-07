import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/session";
import { rateLimit, getClientIp } from "@/modules/core/security/rate-limit";
import { normalizeUsername, isValidUsername } from "@/modules/core/security/user-input";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body?.username);
  const password = String(body?.password ?? "");

  const limited = rateLimit({
    key: `auth:login:${getClientIp(req)}:${username || "unknown"}`,
    limit: 12,
    windowMs: 15 * 60 * 1000,
    message: "Troppi tentativi di login. Riprova tra qualche minuto.",
  });
  if (limited) return limited;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username e password sono obbligatori" },
      { status: 400 }
    );
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Credenziali non valide" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Credenziali non valide" },
      { status: 401 }
    );
  }

  let token: string;
  try {
    token = createToken({
      userId: user.id,
      username: user.username,
      role: user.role as "ADMIN" | "LEAGUE_ADMIN" | "CAPTAIN" | "REFEREE" | "CREATOR",
      teamId: user.teamId ?? null,
      refereeId: user.refereeId ?? null,
      leagueId: user.leagueId ?? null,
    });
  } catch (e) {
    console.error("[login] createToken failed", e);
    return NextResponse.json(
      { error: "Errore interno di autenticazione" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token,
    user: {
      userId: user.id,
      username: user.username,
      role: user.role,
      teamId: user.teamId ?? null,
      refereeId: user.refereeId ?? null,
      leagueId: user.leagueId ?? null,
    },
  });
}
