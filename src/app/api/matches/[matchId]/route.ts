import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, isLeagueAdminSession } from "@/lib/server-auth";
import { sanitizePlayerForRole } from "@/lib/player-visibility";

export async function GET(_: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  const session = await getServerSession();

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      referee: {
        select: {
          id: true,
          name: true,
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
          players: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              number: true,
              position: true,
              photoUrl: true,
              photoZoom: true,
              photoPositionX: true,
              photoPositionY: true,
              teamId: true,
              status: true,
              documentSigned: true,
              mediaConsent: true,
            },
          },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
          players: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              number: true,
              position: true,
              photoUrl: true,
              photoZoom: true,
              photoPositionX: true,
              photoPositionY: true,
              teamId: true,
              status: true,
              documentSigned: true,
              mediaConsent: true,
            },
          },
        },
      },
      stats: {
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true, number: true, teamId: true },
          },
        },
        orderBy: [{ goals: "desc" }, { assists: "desc" }],
      },
      sheetPlayers: {
        select: { playerId: true, teamId: true },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  return NextResponse.json({
    ...match,
    referee: match.referee
      ? { id: match.referee.id, name: isLeagueAdminSession(session, match.leagueId) ? match.referee.name : null }
      : null,
    homeTeam: {
      ...match.homeTeam,
      players: match.homeTeam.players.map((player) => sanitizePlayerForRole(player, session, match.leagueId)),
    },
    awayTeam: {
      ...match.awayTeam,
      players: match.awayTeam.players.map((player) => sanitizePlayerForRole(player, session, match.leagueId)),
    },
  });
}
