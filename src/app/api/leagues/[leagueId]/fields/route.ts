import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireAdmin } from "@/lib/server-auth";
import { FIXED_FIELD_SLOTS } from "@/lib/field-slots";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();
  const isAdmin = session?.role === "ADMIN";

  const fields = await prisma.field.findMany({
    where: {
      leagueId,
      ...(!isAdmin ? { active: true } : {}),
    },
    select: {
      id: true,
      name: true,
      address: true,
      active: true,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(fields);
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { leagueId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
  const address = String(body?.address ?? "").trim().replace(/\s+/g, " ");

  if (name.length < 2) {
    return NextResponse.json({ error: "Inserisci il nome del campo" }, { status: 400 });
  }

  if (address.length < 3) {
    return NextResponse.json({ error: "Inserisci la via del campo" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }

  try {
    const field = await prisma.field.create({
      data: {
        leagueId,
        name,
        address,
        slotKeys: FIXED_FIELD_SLOTS.map((slot) => slot.key),
      },
      select: { id: true, name: true, address: true, active: true },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Esiste già un campo con questo nome" },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { leagueId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Campo mancante" }, { status: 400 });
  }

  const existing = await prisma.field.findFirst({
    where: { id, leagueId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Campo non trovato" }, { status: 404 });
  }

  const name =
    body?.name === undefined
      ? undefined
      : String(body.name).trim().replace(/\s+/g, " ");
  const address =
    body?.address === undefined
      ? undefined
      : String(body.address).trim().replace(/\s+/g, " ");
  const active = body?.active === undefined ? undefined : Boolean(body.active);

  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ error: "Nome campo non valido" }, { status: 400 });
  }

  if (address !== undefined && address.length < 3) {
    return NextResponse.json({ error: "Via del campo non valida" }, { status: 400 });
  }

  try {
    const field = await prisma.field.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      select: { id: true, name: true, address: true, active: true },
    });

    return NextResponse.json(field);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Esiste già un campo con questo nome" },
        { status: 409 }
      );
    }
    throw error;
  }
}
