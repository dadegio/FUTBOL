import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, isCreatorSession, isLeagueAdminSession } from "@/lib/server-auth";

const MEDIA_TYPES = new Set(["PHOTO", "VIDEO", "REEL", "HIGHLIGHT", "INTERVIEW", "BACKSTAGE", "OTHER"]);
const STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "APPROVED", "HIDDEN", "REJECTED"]);

function text(value: unknown, max = 300) {
  const v = String(value ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function url(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(raw)) return `https://${raw}`;
  return undefined;
}

function instagram(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/^www\.instagram\.com\//i, "").split(/[/?#]/)[0];
  if (/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return `https://instagram.com/${handle}`;
  return undefined;
}

function parseMediaBody(body: Record<string, unknown>, canAdmin: boolean) {
  const fileUrl = url(body.fileUrl);
  if (!fileUrl) return { error: "Carica un file o inserisci un link valido" } as const;
  if (fileUrl === undefined) return { error: "Link file non valido" } as const;

  const socialUrl = url(body.socialUrl);
  if (socialUrl === undefined) return { error: "Link social non valido" } as const;

  const thumbnailUrl = url(body.thumbnailUrl);
  if (thumbnailUrl === undefined) return { error: "Thumbnail non valida" } as const;

  const creditInstagram = instagram(body.creditInstagram);
  if (creditInstagram === undefined) return { error: "Instagram credito non valido" } as const;

  const type = MEDIA_TYPES.has(String(body.type)) ? String(body.type) : "PHOTO";
  const status = canAdmin && STATUSES.has(String(body.status)) ? String(body.status) : "PENDING_REVIEW";
  const roundValue = body.round === null || body.round === undefined || body.round === "" ? null : Number(body.round);
  if (roundValue !== null && (!Number.isInteger(roundValue) || roundValue < 0 || roundValue > 999)) {
    return { error: "Giornata non valida" } as const;
  }

  const creditEmail = text(body.creditEmail, 180);
  if (creditEmail && !/^\S+@\S+\.\S+$/.test(creditEmail)) return { error: "Email credito non valida" } as const;

  return {
    data: {
      type: type as "PHOTO" | "VIDEO" | "REEL" | "HIGHLIGHT" | "INTERVIEW" | "BACKSTAGE" | "OTHER",
      status: status as "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "HIDDEN" | "REJECTED",
      title: text(body.title, 140),
      caption: text(body.caption, 900),
      fileUrl,
      thumbnailUrl,
      socialUrl,
      matchId: text(body.matchId, 80),
      teamId: text(body.teamId, 80),
      playerId: text(body.playerId, 80),
      round: roundValue,
      creditName: text(body.creditName, 120),
      creditInstagram,
      creditEmail,
      showCreditEmail: body.showCreditEmail === true,
      featured: canAdmin && body.featured === true,
    },
  } as const;
}

async function getSessionContext(leagueId: string) {
  const session = await getServerSession();
  const canAdmin = isLeagueAdminSession(session, leagueId);
  const isCreator = isCreatorSession(session, leagueId);
  let creatorId: string | null = null;

  if (session && isCreator) {
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: session.userId },
      update: {},
      create: {
        userId: session.userId,
        leagueId,
        displayName: session.username,
        roleLabel: "Creator",
      },
      select: { id: true },
    });
    creatorId = profile.id;
  }

  return { session, canAdmin, isCreator, creatorId };
}

export async function GET(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const { canAdmin, creatorId } = await getSessionContext(leagueId);
  const includeAll = canAdmin && searchParams.get("includeAll") === "1";
  const onlyMine = searchParams.get("mine") === "1";
  const type = searchParams.get("type");
  const creator = searchParams.get("creatorId");
  const matchId = searchParams.get("matchId");
  const teamId = searchParams.get("teamId");
  const playerId = searchParams.get("playerId");
  const roundParam = searchParams.get("round");

  const where: any = { leagueId };
  if (!includeAll) {
    if (onlyMine && creatorId) {
      where.creatorId = creatorId;
    } else {
      where.status = "APPROVED";
    }
  }
  if (type && MEDIA_TYPES.has(type)) where.type = type;
  if (creator) where.creatorId = creator;
  if (matchId) where.matchId = matchId;
  if (teamId) where.teamId = teamId;
  if (playerId) where.playerId = playerId;
  if (roundParam && /^\d+$/.test(roundParam)) where.round = Number(roundParam);

  const media = await prisma.mediaItem.findMany({
    where,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          roleLabel: true,
          avatarUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          youtubeUrl: true,
          email: true,
          showEmail: true,
          showInstagram: true,
          showTikTok: true,
          showYoutube: true,
        },
      },
    },
  });

  if (canAdmin) return NextResponse.json(media);

  return NextResponse.json(
    media.map((item) => ({
      ...item,
      creditEmail: item.showCreditEmail ? item.creditEmail : null,
      creator: item.creator
        ? {
            ...item.creator,
            email: item.creator.showEmail ? item.creator.email : null,
            instagramUrl: item.creator.showInstagram ? item.creator.instagramUrl : null,
            tiktokUrl: item.creator.showTikTok ? item.creator.tiktokUrl : null,
            youtubeUrl: item.creator.showYoutube ? item.creator.youtubeUrl : null,
          }
        : null,
    }))
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const { session, canAdmin, isCreator, creatorId } = await getSessionContext(leagueId);

  if (!session || (!canAdmin && !isCreator)) {
    return NextResponse.json({ error: "Accesso riservato a creator o admin" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseMediaBody(body as Record<string, unknown>, canAdmin);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const media = await prisma.mediaItem.create({
    data: {
      ...parsed.data,
      leagueId,
      creatorId,
      uploadedByUserId: session.userId,
      creditName: parsed.data.creditName || (creatorId ? undefined : session.username),
    },
  });

  return NextResponse.json(media, { status: 201 });
}
