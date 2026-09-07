import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import { requireLeagueAdminForMatch } from "@/lib/server-auth";
import {
  getAdminRefereeState,
  updateMatchOfficials,
} from "@/modules/matches/application/match-officials";

type Ctx = { params: Promise<{ matchId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireLeagueAdminForMatch(matchId);
  if (authErr) return authErr;

  try {
    const state = await getAdminRefereeState(matchId);
    return NextResponse.json(state);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile caricare gli arbitri della partita");
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireLeagueAdminForMatch(matchId);
  if (authErr) return authErr;

  try {
    const input = await readJsonBody<Record<string, unknown>>(req);
    const state = await updateMatchOfficials({ matchId, input });
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile aggiornare l'arbitro della partita");
  }
}
