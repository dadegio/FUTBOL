import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getServerSession,
  requireAdmin,
} from "@/lib/server-auth";

type Ctx = { params: Promise<{ leagueId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();
  const isAdmin = session?.role === "ADMIN";

  const referees = await prisma.referee.findMany({
    where: {
      leagueId,
      ...(!isAdmin ? { active: true } : {}),
    },
    select: {
      id: true,
      name: true,
      active: true,
      ...(isAdmin
        ? {
            account: {
              select: {
                id: true,
                username: true,
              },
            },
          }
        : {}),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(referees);
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { leagueId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");

  if (name.length < 3) {
    return NextResponse.json(
      { error: "Inserisci nome e cognome dell'arbitro" },
      { status: 400 }
    );
  }

  try {
    const referee = await prisma.referee.create({
      data: {
        leagueId,
        name,
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    return NextResponse.json(referee, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Questo arbitro è già presente nell'elenco" },
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
    return NextResponse.json(
      { error: "Arbitro mancante" },
      { status: 400 }
    );
  }

  const referee = await prisma.referee.findFirst({
    where: { id, leagueId },
    select: { id: true },
  });

  if (!referee) {
    return NextResponse.json(
      { error: "Arbitro non trovato" },
      { status: 404 }
    );
  }

  const name =
    body?.name === undefined
      ? undefined
      : String(body.name).trim().replace(/\s+/g, " ");
  const active =
    body?.active === undefined ? undefined : Boolean(body.active);

  if (name !== undefined && name.length < 3) {
    return NextResponse.json(
      { error: "Inserisci nome e cognome dell'arbitro" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.referee.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      select: {
        id: true,
        name: true,
        active: true,
        account: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Esiste già un arbitro con questo nome" },
        { status: 409 }
      );
    }
    throw error;
  }
}
