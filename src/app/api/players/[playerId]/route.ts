export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;

  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const q = qRaw; // per SQLite, LIKE è spesso già case-insensitive (ASCII)

  if (!q) return NextResponse.json([]);

  const qNum = Number(q);
  const isNum = Number.isInteger(qNum) && qNum > 0;

  const players = await prisma.player.findMany({
    where: {
      team: { leagueId },
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { team: { name: { contains: q } } },
        ...(isNum ? [{ number: qNum }] : []),
      ],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 20,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      number: true,
      team: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(players);
}