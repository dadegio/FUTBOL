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

async function getAccess(mediaId: string) {
  const session = await getServerSession();
  if (!session) return { response: NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 }) } as const;

  const media = await prisma.mediaItem.findUnique({
    where: { id: mediaId },
    include: { creator: { select: { userId: true } } },
  });
  if (!media) return { response: NextResponse.json({ error: "Contenuto non trovato" }, { status: 404 }) } as const;

  const canAdmin = isLeagueAdminSession(session, media.leagueId);
  const canOwner = isCreatorSession(session, media.leagueId) && media.creator?.userId === session.userId;
  if (!canAdmin && !canOwner) {
    return { response: NextResponse.json({ error: "Non autorizzato" }, { status: 403 }) } as const;
  }
  return { session, media, canAdmin, canOwner } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await ctx.params;
  const access = await getAccess(mediaId);
  if ("response" in access) return access.response;

  const body = await req.json().catch(() => ({}));
  const data: any = {};

  if (body.title !== undefined) data.title = text(body.title, 140);
  if (body.caption !== undefined) data.caption = text(body.caption, 900);
  if (body.type !== undefined && MEDIA_TYPES.has(String(body.type))) data.type = String(body.type);
  if (body.socialUrl !== undefined) {
    const socialUrl = url(body.socialUrl);
    if (socialUrl === undefined) return NextResponse.json({ error: "Link social non valido" }, { status: 400 });
    data.socialUrl = socialUrl;
  }
  if (body.creditName !== undefined) data.creditName = text(body.creditName, 120);
  if (body.creditInstagram !== undefined) data.creditInstagram = text(body.creditInstagram, 120);
  if (body.creditEmail !== undefined) {
    const email = text(body.creditEmail, 180);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    data.creditEmail = email;
  }
  if (body.showCreditEmail !== undefined) data.showCreditEmail = body.showCreditEmail === true;

  // I creator possono modificare testi/link dei propri contenuti, ma non approvarli.
  if (access.canAdmin) {
    if (body.status !== undefined && STATUSES.has(String(body.status))) data.status = String(body.status);
    if (body.featured !== undefined) data.featured = body.featured === true;
  } else if (access.media.status === "APPROVED") {
    // Se il creator cambia un contenuto già approvato, torna in revisione.
    data.status = "PENDING_REVIEW";
    data.featured = false;
  }

  const updated = await prisma.mediaItem.update({ where: { id: mediaId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await ctx.params;
  const access = await getAccess(mediaId);
  if ("response" in access) return access.response;

  if (!access.canAdmin && access.media.status === "APPROVED") {
    return NextResponse.json({ error: "Un contenuto approvato può essere rimosso solo dall'admin" }, { status: 403 });
  }

  await prisma.mediaItem.delete({ where: { id: mediaId } });
  return NextResponse.json({ ok: true });
}
