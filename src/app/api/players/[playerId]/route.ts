export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireAdminOrCaptainOfTeam } from "@/lib/server-auth";
import { canEditAdminPlayerDetails, sanitizePlayerForRole } from "@/lib/player-visibility";

const PLAYER_STATUSES = new Set(["PENDING", "IN_REVIEW", "AUTHORIZED", "BLOCKED", "SUSPENDED", "RETIRED"]);

function asNullableDate(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function asBool(value: unknown) {
  return value === true;
}

function asClampedNumber(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

function asClampedInt(value: unknown, min: number, max: number) {
  const n = asClampedNumber(value, min, max);
  return n === undefined ? undefined : Math.round(n);
}

export async function GET(
  _: Request,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const session = await getServerSession();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      number: true,
      position: true,
      photoUrl: true,
      photoZoom: true,
      photoPositionX: true,
      photoPositionY: true,
      fiscalCode: true,
      birthDate: true,
      documentSigned: true,
      signedAt: true,
      privacyConsent: true,
      internalPhotoConsent: true,
      publicPhotoConsent: true,
      mediaConsent: true,
      healthDeclaration: true,
      wildcardUsed: true,
      status: true,
      statusNote: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
          leagueId: true,
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!player) {
    return NextResponse.json(
      { error: "Giocatore non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json(sanitizePlayerForRole(player, session));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;

  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Giocatore non trovato" },
      { status: 404 }
    );
  }

  const authErr = await requireAdminOrCaptainOfTeam(existing.teamId);
  if (authErr) return authErr;

  const session = await getServerSession();
  const canEditAdminFields = canEditAdminPlayerDetails(session);

  const body = await req.json().catch(() => ({}));

  const firstName =
    body?.firstName !== undefined ? String(body.firstName).trim() : undefined;

  const lastName =
    body?.lastName !== undefined ? String(body.lastName).trim() : undefined;

  const number =
    body?.number !== undefined ? Number(body.number) : undefined;

  const position =
    body?.position === undefined
      ? undefined
      : body.position === null
        ? null
        : String(body.position).trim() || null;

  const photoUrl =
    body?.photoUrl === undefined
      ? undefined
      : body.photoUrl === null
        ? null
        : String(body.photoUrl).trim() || null;

  const photoZoom = body?.photoZoom === undefined
    ? undefined
    : asClampedNumber(body.photoZoom, 0.75, 2);
  const photoPositionX = body?.photoPositionX === undefined
    ? undefined
    : asClampedInt(body.photoPositionX, 0, 100);
  const photoPositionY = body?.photoPositionY === undefined
    ? undefined
    : asClampedInt(body.photoPositionY, 0, 100);

  const fiscalCode =
    body?.fiscalCode === undefined
      ? undefined
      : String(body.fiscalCode).trim() || null;

  const birthDate = asNullableDate(body?.birthDate);
  const signedAt = asNullableDate(body?.signedAt);

  const documentSigned = body?.documentSigned === undefined ? undefined : asBool(body.documentSigned);
  const privacyConsent = body?.privacyConsent === undefined ? undefined : asBool(body.privacyConsent);
  const internalPhotoConsent = body?.internalPhotoConsent === undefined ? undefined : asBool(body.internalPhotoConsent);
  const publicPhotoConsent = body?.publicPhotoConsent === undefined ? undefined : asBool(body.publicPhotoConsent);
  const mediaConsent = body?.mediaConsent === undefined ? undefined : asBool(body.mediaConsent);
  const healthDeclaration = body?.healthDeclaration === undefined ? undefined : asBool(body.healthDeclaration);
  const wildcardUsed = body?.wildcardUsed === undefined ? undefined : asBool(body.wildcardUsed);

  const status =
    body?.status === undefined ? undefined : String(body.status).trim().toUpperCase();

  const statusNote =
    body?.statusNote === undefined
      ? undefined
      : String(body.statusNote).trim() || null;

  if (firstName !== undefined && !firstName) {
    return NextResponse.json(
      { error: "Nome non valido" },
      { status: 400 }
    );
  }

  if (lastName !== undefined && !lastName) {
    return NextResponse.json(
      { error: "Cognome non valido" },
      { status: 400 }
    );
  }

  if (
    number !== undefined &&
    (!Number.isInteger(number) || number <= 0 || number > 99)
  ) {
    return NextResponse.json(
      { error: "Numero maglia non valido" },
      { status: 400 }
    );
  }

  if (body?.photoZoom !== undefined && photoZoom === undefined) {
    return NextResponse.json({ error: "Zoom foto non valido" }, { status: 400 });
  }

  if (body?.photoPositionX !== undefined && photoPositionX === undefined) {
    return NextResponse.json({ error: "Posizione orizzontale foto non valida" }, { status: 400 });
  }

  if (body?.photoPositionY !== undefined && photoPositionY === undefined) {
    return NextResponse.json({ error: "Posizione verticale foto non valida" }, { status: 400 });
  }

  if (body?.birthDate !== undefined && birthDate === undefined) {
    return NextResponse.json({ error: "Data di nascita non valida" }, { status: 400 });
  }

  if (body?.signedAt !== undefined && signedAt === undefined) {
    return NextResponse.json({ error: "Data firma non valida" }, { status: 400 });
  }

  if (status !== undefined && !PLAYER_STATUSES.has(status)) {
    return NextResponse.json({ error: "Stato giocatore non valido" }, { status: 400 });
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(number !== undefined ? { number } : {}),
      ...(position !== undefined ? { position } : {}),
      ...(photoUrl !== undefined ? { photoUrl } : {}),
      ...(photoZoom !== undefined ? { photoZoom } : {}),
      ...(photoPositionX !== undefined ? { photoPositionX } : {}),
      ...(photoPositionY !== undefined ? { photoPositionY } : {}),
      ...(canEditAdminFields && fiscalCode !== undefined ? { fiscalCode } : {}),
      ...(canEditAdminFields && birthDate !== undefined ? { birthDate } : {}),
      ...(canEditAdminFields && signedAt !== undefined ? { signedAt } : {}),
      ...(canEditAdminFields && documentSigned !== undefined ? { documentSigned } : {}),
      ...(canEditAdminFields && privacyConsent !== undefined ? { privacyConsent } : {}),
      ...(canEditAdminFields && internalPhotoConsent !== undefined ? { internalPhotoConsent } : {}),
      ...(canEditAdminFields && publicPhotoConsent !== undefined ? { publicPhotoConsent } : {}),
      ...(canEditAdminFields && mediaConsent !== undefined ? { mediaConsent } : {}),
      ...(canEditAdminFields && healthDeclaration !== undefined ? { healthDeclaration } : {}),
      ...(canEditAdminFields && wildcardUsed !== undefined ? { wildcardUsed } : {}),
      ...(canEditAdminFields && status !== undefined ? { status: status as any } : {}),
      ...(canEditAdminFields && statusNote !== undefined ? { statusNote } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      number: true,
      position: true,
      photoUrl: true,
      photoZoom: true,
      photoPositionX: true,
      photoPositionY: true,
      fiscalCode: true,
      birthDate: true,
      documentSigned: true,
      signedAt: true,
      privacyConsent: true,
      internalPhotoConsent: true,
      publicPhotoConsent: true,
      mediaConsent: true,
      healthDeclaration: true,
      wildcardUsed: true,
      status: true,
      statusNote: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          badgeUrl: true,
          leagueId: true,
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(sanitizePlayerForRole(updated, session));
}

export async function DELETE(
  _: Request,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;

  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Giocatore non trovato" },
      { status: 404 }
    );
  }

  const authErr = await requireAdminOrCaptainOfTeam(existing.teamId);
  if (authErr) return authErr;

  await prisma.player.delete({
    where: { id: playerId },
  });

  return NextResponse.json({ ok: true });
}