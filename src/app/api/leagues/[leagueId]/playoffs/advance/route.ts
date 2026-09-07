export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdminOrCaptainOfPlayoffSeries } from "@/lib/server-auth";
import { apiErrorResponse, readJsonBody, AppError } from "@/modules/core/api";
import { advancePlayoffSeries } from "@/modules/playoffs/application/playoff-service";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const body = await readJsonBody<any>(req);
  const seriesId = String(body?.seriesId ?? "").trim();

  if (!seriesId) {
    return NextResponse.json({ error: "seriesId mancante" }, { status: 400 });
  }

  const authErr = await requireAdminOrCaptainOfPlayoffSeries(seriesId);
  if (authErr) return authErr;

  try {
    return NextResponse.json(await advancePlayoffSeries(leagueId, body));
  } catch (error: any) {
    if (error instanceof AppError) return apiErrorResponse(error, "Errore avanzamento playoff");
    return NextResponse.json(
      { error: error?.message ?? "Errore avanzamento playoff" },
      { status: 500 }
    );
  }
}
