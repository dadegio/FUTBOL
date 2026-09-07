export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import { requireLeagueAdminForMatch } from "@/lib/server-auth";
import { updateMatchDate } from "@/modules/matches/application/match-scheduling";

type Ctx = { params: Promise<{ matchId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireLeagueAdminForMatch(matchId);
  if (authErr) return authErr;

  const body = await readJsonBody<Record<string, unknown>>(req);
  const rawDate = body?.date;
  let date: Date | null;

  if (rawDate === null || rawDate === "") {
    date = null;
  } else if (typeof rawDate === "string") {
    date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Data non valida" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Parametro 'date' mancante o non valido" }, { status: 400 });
  }

  try {
    const result = await updateMatchDate({ matchId, date });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile aggiornare la data della partita");
  }
}
