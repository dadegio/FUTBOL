import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import { requireLeagueAdmin } from "@/lib/server-auth";
import {
  deleteSponsor,
  getSponsorLeagueId,
  updateSponsor,
} from "@/modules/sponsors/application/sponsor-service";

export async function PATCH(req: Request, ctx: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await ctx.params;

  try {
    const leagueId = await getSponsorLeagueId(sponsorId);
    const authErr = await requireLeagueAdmin(leagueId);
    if (authErr) return authErr;

    const input = await readJsonBody<Record<string, unknown>>(req);
    const updated = await updateSponsor({ sponsorId, input });
    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile aggiornare lo sponsor");
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await ctx.params;

  try {
    const leagueId = await getSponsorLeagueId(sponsorId);
    const authErr = await requireLeagueAdmin(leagueId);
    if (authErr) return authErr;

    const result = await deleteSponsor({ sponsorId });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile eliminare lo sponsor");
  }
}
