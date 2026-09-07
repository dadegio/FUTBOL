import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import { requireMatchEditor } from "@/lib/server-auth";
import { saveMatchResult } from "@/modules/matches/application/save-match-result";

type Body = {
  homeGoals?: number;
  awayGoals?: number;
  playerStats?: Array<{ playerId: string; goals: number; assists: number }>;
  sheetPlayerIds?: string[];
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await ctx.params;

  const authErr = await requireMatchEditor(matchId);
  if (authErr) return authErr;

  try {
    const input = await readJsonBody<Body>(req);
    const result = await saveMatchResult({ matchId, input });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile salvare il risultato");
  }
}
