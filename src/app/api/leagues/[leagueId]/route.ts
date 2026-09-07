import { NextResponse } from "next/server";
import { requireAdmin, requireLeagueAdmin } from "@/lib/server-auth";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import {
  deleteLeague,
  getLeagueSettings,
  updateLeagueSettings,
} from "@/modules/leagues/application/league-service";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;

  try {
    return NextResponse.json(await getLeagueSettings(leagueId));
  } catch (error) {
    return apiErrorResponse(error, "Errore caricamento torneo");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;

  try {
    const body = await readJsonBody(req);
    return NextResponse.json(await updateLeagueSettings(leagueId, body));
  } catch (error) {
    return apiErrorResponse(error, "Errore aggiornamento torneo");
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  try {
    return NextResponse.json(await deleteLeague(leagueId));
  } catch (error) {
    return apiErrorResponse(error, "Errore eliminazione torneo");
  }
}
