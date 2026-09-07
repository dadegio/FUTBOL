import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import {
  deleteMediaItem,
  updateMediaItem,
} from "@/modules/media/application/media-service";

export async function PATCH(req: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await ctx.params;

  try {
    const input = await readJsonBody<Record<string, unknown>>(req);
    const updated = await updateMediaItem({ mediaId, input });
    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile aggiornare il contenuto media");
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await ctx.params;

  try {
    const result = await deleteMediaItem({ mediaId });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile eliminare il contenuto media");
  }
}
