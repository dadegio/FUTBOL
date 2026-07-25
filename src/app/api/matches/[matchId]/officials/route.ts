import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

type Ctx = { params: Promise<{ matchId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const { matchId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const refereeId = body?.refereeId
    ? String(body.refereeId).trim()
    : null;

  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, leagueId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  if (refereeId) {
    const referee = await prisma.referee.findFirst({
      where: {
        id: refereeId,
        leagueId: existing.leagueId,
        active: true,
      },
      select: { id: true },
    });

    if (!referee) {
      return NextResponse.json(
        { error: "Seleziona un arbitro attivo dell'elenco" },
        { status: 400 }
      );
    }
  }

  const officials = await prisma.match.update({
    where: { id: matchId },
    data: {
      refereeId,
    },
    select: {
      referee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, officials });
}
