import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { parseToken, type SessionUser } from "./session";
import { prisma } from "./prisma";

export async function getServerSession(): Promise<SessionUser | null> {
  const headersList = await headers();
  const auth = headersList.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return parseToken(auth.slice(7));
}

export function isSuperAdminSession(session: SessionUser | null): boolean {
  return session?.role === "ADMIN";
}

export function isLeagueAdminSession(
  session: SessionUser | null,
  leagueId: string
): boolean {
  return Boolean(
    session &&
      (session.role === "ADMIN" ||
        (session.role === "LEAGUE_ADMIN" && session.leagueId === leagueId))
  );
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Accesso riservato al Super Admin" }, { status: 403 });
  return null;
}

export async function requireLeagueAdmin(
  leagueId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
  if (!isLeagueAdminSession(session, leagueId))
    return NextResponse.json(
      { error: "Non sei amministratore di questo torneo" },
      { status: 403 }
    );
  return null;
}

async function leagueIdForTeam(teamId: string): Promise<string | null> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { leagueId: true } });
  return team?.leagueId ?? null;
}

async function leagueIdForMatch(matchId: string): Promise<string | null> {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { leagueId: true } });
  return match?.leagueId ?? null;
}

export async function requireLeagueAdminForTeam(teamId: string): Promise<NextResponse | null> {
  const leagueId = await leagueIdForTeam(teamId);
  if (!leagueId) return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });
  return requireLeagueAdmin(leagueId);
}

export async function requireLeagueAdminForMatch(matchId: string): Promise<NextResponse | null> {
  const leagueId = await leagueIdForMatch(matchId);
  if (!leagueId) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  return requireLeagueAdmin(leagueId);
}

export async function requireAdminOrCaptainOfTeam(
  teamId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { leagueId: true } });
  if (!team) return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });
  if (isLeagueAdminSession(session, team.leagueId)) return null;
  if (session.role === "CAPTAIN" && session.teamId === teamId) return null;
  return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
}

export async function requireAdminOrCaptainOfMatch(
  matchId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { leagueId: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  if (isLeagueAdminSession(session, match.leagueId)) return null;
  if (
    session.role === "CAPTAIN" &&
    (session.teamId === match.homeTeamId || session.teamId === match.awayTeamId)
  ) return null;

  return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
}

export async function requireMatchEditor(
  matchId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { leagueId: true, homeTeamId: true, awayTeamId: true, refereeId: true },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  if (isLeagueAdminSession(session, match.leagueId)) return null;
  const isCaptain = session.role === "CAPTAIN" &&
    (session.teamId === match.homeTeamId || session.teamId === match.awayTeamId);
  const isAssignedReferee = session.role === "REFEREE" && Boolean(session.refereeId) && session.refereeId === match.refereeId;
  if (isCaptain || isAssignedReferee) return null;

  return NextResponse.json({ error: "Puoi modificare soltanto le partite che ti sono assegnate" }, { status: 403 });
}

export async function requireAdminOrCaptainOfPlayer(
  playerId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true, team: { select: { leagueId: true } } },
  });
  if (!player) return NextResponse.json({ error: "Giocatore non trovato" }, { status: 404 });
  if (isLeagueAdminSession(session, player.team.leagueId)) return null;
  if (session.role === "CAPTAIN" && session.teamId === player.teamId) return null;
  return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
}

export async function requireAdminOrCaptainOfPlayoffSeries(
  seriesId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });

  const series = await prisma.playoffSeries.findUnique({
    where: { id: seriesId },
    select: { leagueId: true, homeTeamId: true, awayTeamId: true },
  });
  if (!series) return NextResponse.json({ error: "Serie non trovata" }, { status: 404 });
  if (isLeagueAdminSession(session, series.leagueId)) return null;
  if (session.role === "CAPTAIN" && (session.teamId === series.homeTeamId || session.teamId === series.awayTeamId)) return null;
  return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
}

export function isCreatorSession(
  session: SessionUser | null,
  leagueId: string
): boolean {
  return Boolean(session?.role === "CREATOR" && session.leagueId === leagueId);
}

export async function requireCreatorOrLeagueAdmin(
  leagueId: string
): Promise<NextResponse | null> {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
  }
  if (isLeagueAdminSession(session, leagueId) || isCreatorSession(session, leagueId)) {
    return null;
  }
  return NextResponse.json(
    { error: "Accesso riservato a creator o admin del torneo" },
    { status: 403 }
  );
}
