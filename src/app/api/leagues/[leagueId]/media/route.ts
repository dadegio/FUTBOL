import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import {
  createMediaItem,
  listLeagueMedia,
} from "@/modules/media/application/media-service";

export async function GET(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;

  try {
    const { searchParams } = new URL(req.url);
    const media = await listLeagueMedia({ leagueId, searchParams });
    return NextResponse.json(media);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile caricare i contenuti media");
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;

  try {
    const input = await readJsonBody<Record<string, unknown>>(req);
    const media = await createMediaItem({ leagueId, input });
    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile creare il contenuto media");
  }
}
