import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import {
  getServerSession,
  requireAdminOrCaptainOfMatch,
} from "@/lib/server-auth";
import {
  bookMatchSlot,
  clearMatchBooking,
} from "@/modules/matches/application/match-scheduling";

type Ctx = { params: Promise<{ matchId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireAdminOrCaptainOfMatch(matchId);
  if (authErr) return authErr;

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
  }

  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const venueKey = String(body?.venueKey ?? "").trim();
    const startsAt = new Date(String(body?.startsAt ?? ""));
    const booking = await bookMatchSlot({ matchId, venueKey, startsAt, session });

    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile prenotare lo slot");
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const authErr = await requireAdminOrCaptainOfMatch(matchId);
  if (authErr) return authErr;

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
  }

  try {
    const result = await clearMatchBooking({ matchId, session });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Non è stato possibile liberare lo slot");
  }
}
