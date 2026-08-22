import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebalanceLeagueReferees } from "@/lib/automatic-referees";
import { requireAdmin } from "@/lib/server-auth";

type Ctx = { params: Promise<{ matchId: string }> };

export async function PATCH(_: Request, ctx: Ctx) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { matchId } = await ctx.params;
  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, leagueId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  const automatic = await rebalanceLeagueReferees(existing.leagueId);
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { referee: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    ok: true,
    automatic,
    officials: { referee: match?.referee ?? null },
  });
}
