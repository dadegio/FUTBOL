import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true,
          players: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              number: true,
              teamId: true,
              status: true,
              documentSigned: true,
              privacyConsent: true,
              internalPhotoConsent: true,
              healthDeclaration: true,
            },
          },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          players: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              number: true,
              teamId: true,
              status: true,
              documentSigned: true,
              privacyConsent: true,
              internalPhotoConsent: true,
              healthDeclaration: true,
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

  return NextResponse.json(match);
}
