import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, isLeagueAdminSession, requireLeagueAdmin } from "@/lib/server-auth";

function normalizeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(raw)) return `https://${raw}`;
  return undefined;
}

function normalizeInstagram(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/^www\.instagram\.com\//i, "").split(/[/?#]/)[0];
  if (/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return `https://instagram.com/${handle}`;
  return undefined;
}

function normalizeText(value: unknown, max = 300) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function parseSponsorBody(body: Record<string, unknown>) {
  const name = String(body?.name ?? "").trim();
  if (!name) return { error: "Nome sponsor obbligatorio" } as const;

  const websiteUrl = normalizeUrl(body.websiteUrl);
  if (websiteUrl === undefined) return { error: "Link sito non valido" } as const;

  const instagramUrl = normalizeInstagram(body.instagramUrl);
  if (instagramUrl === undefined) return { error: "Link Instagram non valido" } as const;

  const logoUrl = normalizeUrl(body.logoUrl);
  if (logoUrl === undefined) return { error: "URL logo non valido" } as const;

  const sortOrder = Number(body.sortOrder ?? 0);
  if (!Number.isFinite(sortOrder)) return { error: "Ordine non valido" } as const;

  const email = normalizeText(body.email, 180);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Email non valida" } as const;

  return {
    data: {
      name: name.slice(0, 120),
      category: normalizeText(body.category, 80),
      description: normalizeText(body.description, 600),
      logoUrl,
      websiteUrl,
      instagramUrl,
      phone: normalizeText(body.phone, 80),
      email,
      address: normalizeText(body.address, 240),
      contactName: normalizeText(body.contactName, 120),
      sortOrder: Math.max(0, Math.min(999, Math.round(sortOrder))),
      active: body.active !== false,
    },
  } as const;
}

export async function GET(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();
  const canAdmin = isLeagueAdminSession(session, leagueId);

  const sponsors = await prisma.sponsor.findMany({
    where: {
      leagueId,
      ...(canAdmin ? {} : { active: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(sponsors);
}

export async function POST(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const parsed = parseSponsorBody(body as Record<string, unknown>);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const sponsor = await prisma.sponsor.create({
    data: { ...parsed.data, leagueId },
  });

  return NextResponse.json(sponsor, { status: 201 });
}
