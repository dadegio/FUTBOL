export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireLeagueAdmin } from "@/lib/server-auth";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import {
  createPlayoffs,
  deletePlayoffs,
  getPlayoffs,
} from "@/modules/playoffs/application/playoff-service";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;

  try {
    return NextResponse.json(await getPlayoffs(leagueId));
  } catch (error) {
    return apiErrorResponse(error, "Errore caricamento playoff");
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;

  try {
    const body = await readJsonBody(req);
    return NextResponse.json(await createPlayoffs(leagueId, body));
  } catch (error) {
    return apiErrorResponse(error, "Errore creazione playoff");
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;

  try {
    return NextResponse.json(await deletePlayoffs(leagueId));
  } catch (error) {
    return apiErrorResponse(error, "Errore eliminazione playoff");
  }
}
