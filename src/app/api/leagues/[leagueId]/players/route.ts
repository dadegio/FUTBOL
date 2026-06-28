export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-auth";
import { sanitizePlayerForRole } from "@/lib/player-visibility";

export async function GET(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();

  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const statusFilter = (url.searchParams.get("status") ?? "").trim();

  const qNum = Number(qRaw);
  const isNum = Number.isInteger(qNum) && qNum > 0;

  const players = await prisma.player.findMany({
    where: {
      team: { leagueId },
      ...(qRaw
        ? {
            OR: [
              { firstName: { contains: qRaw, mode: "insensitive" } },
              { lastName: { contains: qRaw, mode: "insensitive" } },
              { team: { name: { contains: qRaw, mode: "insensitive" } } },
              ...(isNum ? [{ number: qNum }] : []),
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      number: true,
      position: true,
      photoUrl: true,
      documentSigned: true,
      mediaConsent: true,
      wildcardUsed: true,
      status: true,
      statusNote: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
        },
      },
    },
  });

  const sanitized = players.map((player) => sanitizePlayerForRole(player, session));

  const filtered = statusFilter
    ? sanitized.filter((player: any) => {
        if (statusFilter === "ok") return player.isEligibleForMatchSheet === true;
        if (statusFilter === "todo") return player.isEligibleForMatchSheet !== true;
        return true;
      })
    : sanitized;

  return NextResponse.json(filtered);
}
