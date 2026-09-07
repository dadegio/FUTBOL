import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import { getServerSession, isLeagueAdminSession, requireLeagueAdmin } from "@/lib/server-auth";
import {
  createSponsor,
  listSponsors,
} from "@/modules/sponsors/application/sponsor-service";

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();
  const canAdmin = isLeagueAdminSession(session, leagueId);

  const sponsors = await listSponsors({ leagueId, includeHidden: canAdmin });
  return NextResponse.json(sponsors);
}

export async function POST(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;

  try {
    const input = await readJsonBody<Record<string, unknown>>(req);
    const sponsor = await createSponsor({ leagueId, input });
    return NextResponse.json(sponsor, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile creare lo sponsor");
  }
}
