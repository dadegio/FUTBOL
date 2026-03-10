export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;

  const agg = await prisma.matchPlayerStat.aggregate({
    where: { playerId },
    _sum: {
      goals: true,
      assists: true,
    },
  });

  return NextResponse.json({
    goals: agg._sum.goals ?? 0,
    assists: agg._sum.assists ?? 0,
  });
}