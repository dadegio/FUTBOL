import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, isCreatorSession, isLeagueAdminSession } from "@/lib/server-auth";
import { isHexColor } from "@/lib/league-branding";

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

function socialUrl(value: unknown, platform: "instagram" | "tiktok" | "youtube") {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(new RegExp(`^(www\\.)?${platform}\\.com/`, "i"), "").split(/[/?#]/)[0].replace(/^@/, "");
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(handle)) return undefined;
  if (platform === "instagram") return `https://instagram.com/${handle}`;
  if (platform === "tiktok") return `https://tiktok.com/@${handle}`;
  return `https://youtube.com/@${handle}`;
}

function parseProfile(body: Record<string, unknown>) {
  const displayName = text(body.displayName, 120);
  if (!displayName) return { error: "Nome pubblico obbligatorio" } as const;

  const avatarUrl = url(body.avatarUrl);
  if (avatarUrl === undefined) return { error: "URL avatar non valido" } as const;
  const websiteUrl = url(body.websiteUrl);
  if (websiteUrl === undefined) return { error: "Sito/portfolio non valido" } as const;
  const instagramUrl = socialUrl(body.instagramUrl, "instagram");
  if (instagramUrl === undefined) return { error: "Instagram non valido" } as const;
  const tiktokUrl = socialUrl(body.tiktokUrl, "tiktok");
  if (tiktokUrl === undefined) return { error: "TikTok non valido" } as const;
  const youtubeUrl = socialUrl(body.youtubeUrl, "youtube");
  if (youtubeUrl === undefined) return { error: "YouTube non valido" } as const;
  const email = text(body.email, 180);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Email non valida" } as const;
  const primaryColor = text(body.primaryColor, 20);
  if (primaryColor && !isHexColor(primaryColor)) return { error: "Colore profilo non valido" } as const;

  return {
    data: {
      displayName,
      roleLabel: text(body.roleLabel, 80),
      avatarUrl,
      bio: text(body.bio, 700),
      instagramUrl,
      tiktokUrl,
      youtubeUrl,
      email,
      phone: text(body.phone, 80),
      websiteUrl,
      primaryColor,
      showEmail: body.showEmail === true,
      showInstagram: body.showInstagram !== false,
      showTikTok: body.showTikTok !== false,
      showYoutube: body.showYoutube !== false,
      showPhone: body.showPhone === true,
      active: body.active !== false,
    },
  } as const;
}

async function getProfile(leagueId: string) {
  const session = await getServerSession();
  if (!session) return { error: NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 }) } as const;

  if (isCreatorSession(session, leagueId)) {
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: session.userId },
      update: {},
      create: { userId: session.userId, leagueId, displayName: session.username, roleLabel: "Creator" },
    });
    return { session, profile, canAdmin: false } as const;
  }

  if (isLeagueAdminSession(session, leagueId)) {
    return { session, profile: null, canAdmin: true } as const;
  }

  return { error: NextResponse.json({ error: "Accesso riservato a creator o admin" }, { status: 403 }) } as const;
}

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const result = await getProfile(leagueId);
  if ("error" in result) return result.error;

  const [league, teams, matches, media] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, name: true } }),
    prisma.team.findMany({ where: { leagueId, activeInLeague: true }, orderBy: { name: "asc" }, select: { id: true, name: true, players: { orderBy: { number: "asc" }, select: { id: true, firstName: true, lastName: true, number: true } } } }),
    prisma.match.findMany({ where: { leagueId }, orderBy: [{ round: "asc" }, { date: "asc" }], select: { id: true, round: true, date: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } } }),
    prisma.mediaItem.findMany({ where: { leagueId, ...(result.profile ? { creatorId: result.profile.id } : {}) }, orderBy: { createdAt: "desc" }, take: 80 }),
  ]);

  return NextResponse.json({ profile: result.profile, canAdmin: result.canAdmin, league, teams, matches, media });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const result = await getProfile(leagueId);
  if ("error" in result) return result.error;
  if (!result.profile) return NextResponse.json({ error: "Seleziona un profilo creator specifico" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseProfile(body as Record<string, unknown>);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await prisma.creatorProfile.update({ where: { id: result.profile.id }, data: parsed.data });
  return NextResponse.json(updated);
}
