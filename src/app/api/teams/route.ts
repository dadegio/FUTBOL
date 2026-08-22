import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

export async function GET() {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const teams = await prisma.team.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      badgeUrl: true,
      description: true,
      colorHex: true,
      activeInLeague: true,
      league: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          players: true,
        },
      },
    },
  });

  return NextResponse.json(
    teams.map(({ _count, ...team }) => ({
      ...team,
      playersCount: _count.players,
    }))
  );
}
