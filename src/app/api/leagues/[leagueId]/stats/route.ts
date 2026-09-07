export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/modules/core/api";
import { getLeagueStats } from "@/modules/stats/application/league-stats-service";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;

  try {
    return NextResponse.json(await getLeagueStats(leagueId));
  } catch (error) {
    return apiErrorResponse(error, "Errore caricamento statistiche");
  }
}
