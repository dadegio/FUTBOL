import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLeagueAdmin } from "@/lib/server-auth";

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

function parsePatchBody(body: Record<string, unknown>) {
  const data: {
    name?: string;
    category?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contactName?: string | null;
    sortOrder?: number;
    active?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return { error: "Nome sponsor obbligatorio" } as const;
    data.name = name.slice(0, 120);
  }

  for (const key of ["category", "description", "phone", "address", "contactName"] as const) {
    if (body[key] !== undefined) data[key] = normalizeText(body[key], key === "description" ? 600 : 240);
  }

  if (body.logoUrl !== undefined) {
    const logoUrl = normalizeUrl(body.logoUrl);
    if (logoUrl === undefined) return { error: "URL logo non valido" } as const;
    data.logoUrl = logoUrl;
  }

  if (body.websiteUrl !== undefined) {
    const websiteUrl = normalizeUrl(body.websiteUrl);
    if (websiteUrl === undefined) return { error: "Link sito non valido" } as const;
    data.websiteUrl = websiteUrl;
  }

  if (body.instagramUrl !== undefined) {
    const instagramUrl = normalizeInstagram(body.instagramUrl);
    if (instagramUrl === undefined) return { error: "Link Instagram non valido" } as const;
    data.instagramUrl = instagramUrl;
  }

  if (body.email !== undefined) {
    const email = normalizeText(body.email, 180);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Email non valida" } as const;
    data.email = email;
  }

  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isFinite(sortOrder)) return { error: "Ordine non valido" } as const;
    data.sortOrder = Math.max(0, Math.min(999, Math.round(sortOrder)));
  }

  if (body.active !== undefined) data.active = body.active === true;

  return { data } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await ctx.params;

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { leagueId: true },
  });
  if (!sponsor) return NextResponse.json({ error: "Sponsor non trovato" }, { status: 404 });

  const authErr = await requireLeagueAdmin(sponsor.leagueId);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const parsed = parsePatchBody(body as Record<string, unknown>);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await prisma.sponsor.update({
    where: { id: sponsorId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await ctx.params;

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { leagueId: true },
  });
  if (!sponsor) return NextResponse.json({ error: "Sponsor non trovato" }, { status: 404 });

  const authErr = await requireLeagueAdmin(sponsor.leagueId);
  if (authErr) return authErr;

  await prisma.sponsor.delete({ where: { id: sponsorId } });
  return NextResponse.json({ ok: true });
}
