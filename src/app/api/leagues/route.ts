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
        where: { activeInLeague: true },
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
              photoZoom: true,
              photoPositionX: true,
              photoPositionY: true,
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

  const teamIdsToCopy: string[] = Array.isArray(body?.teamIdsToCopy)
    ? Array.from(
        new Set<string>(
          body.teamIdsToCopy
            .map((id: unknown) => String(id).trim())
            .filter((id: string) => id.length > 0)
        )
      )
    : [];

  const sourceTeams = teamIdsToCopy.length
    ? await prisma.team.findMany({
        where: { id: { in: teamIdsToCopy } },
        include: {
          players: {
            orderBy: { number: "asc" },
          },
        },
      })
    : [];

  if (sourceTeams.length !== teamIdsToCopy.length) {
    return NextResponse.json(
      { error: "Una o più squadre selezionate non sono più disponibili" },
      { status: 400 }
    );
  }

  const normalizedNames = sourceTeams.map((team) => team.name.trim().toLocaleLowerCase("it"));
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return NextResponse.json(
      { error: "Seleziona una sola versione per ogni squadra con lo stesso nome" },
      { status: 400 }
    );
  }

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


    if (sourceTeams.length > 0) {
      for (const sourceTeam of sourceTeams) {
        const copiedTeam = await tx.team.create({
          data: {
            name: sourceTeam.name,
            badgeUrl: sourceTeam.badgeUrl,
            description: sourceTeam.description,
            colorHex: sourceTeam.colorHex,
            secondaryColorHex: sourceTeam.secondaryColorHex,
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
              photoZoom: player.photoZoom,
              photoPositionX: player.photoPositionX,
              photoPositionY: player.photoPositionY,
              fiscalCode: player.fiscalCode,
              birthDate: player.birthDate,
              documentSigned: player.documentSigned,
              signedAt: player.signedAt,
              privacyConsent: player.privacyConsent,
              internalPhotoConsent: player.internalPhotoConsent,
              publicPhotoConsent: player.publicPhotoConsent,
              mediaConsent: player.mediaConsent,
              healthDeclaration: player.healthDeclaration,
              wildcardUsed: player.wildcardUsed,
              status: player.status,
              statusNote: player.statusNote,
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
