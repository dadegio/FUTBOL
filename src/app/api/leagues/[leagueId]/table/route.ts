export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/modules/core/api";
import { getLeagueTable } from "@/modules/stats/application/league-table-service";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;

  try {
    return NextResponse.json(await getLeagueTable(leagueId));
  } catch (error) {
    return apiErrorResponse(error, "Errore caricamento classifica");
  }
}
