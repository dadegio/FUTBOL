export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireAdminOrCaptainOfPlayoffSeries,
  requireLeagueAdmin,
} from "@/lib/server-auth";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import {
  assignPlayoffSeriesTeams,
  savePlayoffSeriesPenalties,
} from "@/modules/playoffs/application/playoff-service";

type Ctx = { params: Promise<{ leagueId: string; seriesId: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { leagueId, seriesId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;

  try {
    const body = await readJsonBody(req);
    return NextResponse.json(await assignPlayoffSeriesTeams(leagueId, seriesId, body));
  } catch (error) {
    return apiErrorResponse(error, "Errore aggiornamento serie playoff");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { leagueId, seriesId } = await ctx.params;

  const authError = await requireAdminOrCaptainOfPlayoffSeries(seriesId);
  if (authError) return authError;

  try {
    const body = await readJsonBody(req);
    return NextResponse.json(await savePlayoffSeriesPenalties(leagueId, seriesId, body));
  } catch (error) {
    return apiErrorResponse(error, "Errore salvataggio rigori");
  }
}
