import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

const PLAYOFF_FORMATS = new Set(["SINGLE_ELIM", "TWO_LEG"]);
const PLAYOFF_COUNTS = new Set([2, 4, 8, 16]);

export async function GET() {
  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teams: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          badgeUrl: true,
          players: {
            orderBy: { number: "asc" },
            select: {
              firstName: true,
              lastName: true,
              number: true,
              position: true,
              photoUrl: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(leagues);
}

export async function POST(req: Request) {
  const err = await requireAdmin();
  if (err) return err;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Nome lega mancante" }, { status: 400 });
  }

  const playoffEnabled = body?.playoffEnabled === true;
  const playoffFormat = String(body?.playoffFormat ?? "SINGLE_ELIM");
  const playoffTeamCount = Number(body?.playoffTeamCount ?? 8);
  const playoffSeeded = body?.playoffSeeded !== false;

  if (playoffEnabled && !PLAYOFF_FORMATS.has(playoffFormat)) {
    return NextResponse.json({ error: "Formato playoff non valido" }, { status: 400 });
  }

  if (playoffEnabled && !PLAYOFF_COUNTS.has(playoffTeamCount)) {
    return NextResponse.json({ error: "Numero squadre playoff non valido" }, { status: 400 });
  }

  const teamIdsToCopy = Array.isArray(body?.teamIdsToCopy)
    ? body.teamIdsToCopy.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  const league = await prisma.$transaction(async (tx) => {
    const createdLeague = await tx.league.create({
      data: {
        name,
        ...(playoffEnabled
          ? {
              playoffFormat: playoffFormat as "SINGLE_ELIM" | "TWO_LEG",
              playoffTeamCount,
              playoffSeeded,
            }
          : {}),
      },
    });

    if (teamIdsToCopy.length > 0) {
      const sourceTeams = await tx.team.findMany({
        where: { id: { in: teamIdsToCopy } },
        include: {
          players: {
            orderBy: { number: "asc" },
          },
        },
      });

      for (const sourceTeam of sourceTeams) {
        const copiedTeam = await tx.team.create({
          data: {
            name: sourceTeam.name,
            badgeUrl: sourceTeam.badgeUrl,
            leagueId: createdLeague.id,
          },
        });

        if (sourceTeam.players.length > 0) {
          await tx.player.createMany({
            data: sourceTeam.players.map((player) => ({
              firstName: player.firstName,
              lastName: player.lastName,
              number: player.number,
              position: player.position,
              photoUrl: player.photoUrl,
              teamId: copiedTeam.id,
            })),
          });
        }
      }
    }

    return createdLeague;
  });

  return NextResponse.json(league);
}