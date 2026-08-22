import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireAdmin } from "@/lib/server-auth";

type Ctx = { params: Promise<{ leagueId: string }> };

type SlotInput = {
  weekday: number;
  hour: number;
  minute: number;
  durationMinutes?: number;
};

function normalizeSlots(value: unknown): SlotInput[] | null {
  if (!Array.isArray(value)) return null;

  const normalized: SlotInput[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const raw = item as Record<string, unknown>;
    const weekday = Number(raw.weekday);
    const hour = Number(raw.hour);
    const minute = Number(raw.minute);
    const durationMinutes =
      raw.durationMinutes === undefined ? 60 : Number(raw.durationMinutes);

    if (
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6 ||
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59 ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 24 * 60
    ) {
      return null;
    }

    const key = `${weekday}:${hour}:${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({ weekday, hour, minute, durationMinutes });
  }

  return normalized;
}

const fieldSelect = {
  id: true,
  name: true,
  address: true,
  active: true,
  slots: {
    select: {
      id: true,
      weekday: true,
      hour: true,
      minute: true,
      durationMinutes: true,
    },
    orderBy: [{ weekday: "asc" as const }, { hour: "asc" as const }, { minute: "asc" as const }],
  },
};

export async function GET(_: Request, ctx: Ctx) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();
  const isAdmin = session?.role === "ADMIN";

  const fields = await prisma.field.findMany({
    where: {
      leagueId,
      ...(!isAdmin ? { active: true } : {}),
    },
    select: fieldSelect,
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
      },
      select: fieldSelect,
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
  const slots = body?.slots === undefined ? undefined : normalizeSlots(body.slots);

  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ error: "Nome campo non valido" }, { status: 400 });
  }

  if (address !== undefined && address.length < 3) {
    return NextResponse.json({ error: "Via del campo non valida" }, { status: 400 });
  }

  if (body?.slots !== undefined && slots === null) {
    return NextResponse.json({ error: "Uno o più slot non sono validi" }, { status: 400 });
  }

  try {
    const field = await prisma.$transaction(async (tx) => {
      await tx.field.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });

      if (slots !== undefined && slots !== null) {
        await tx.fieldSlot.deleteMany({ where: { fieldId: id } });
        if (slots.length > 0) {
          await tx.fieldSlot.createMany({
            data: slots.map((slot) => ({
              fieldId: id,
              weekday: slot.weekday,
              hour: slot.hour,
              minute: slot.minute,
              durationMinutes: slot.durationMinutes ?? 60,
            })),
          });
        }
      }

      return tx.field.findUniqueOrThrow({
        where: { id },
        select: fieldSelect,
      });
    });

    return NextResponse.json(field);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Esiste già un campo con questo nome o uno slot duplicato" },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { leagueId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Campo mancante" }, { status: 400 });
  }

  const field = await prisma.field.findFirst({
    where: { id, leagueId },
    select: { id: true, name: true },
  });

  if (!field) {
    return NextResponse.json({ error: "Campo non trovato" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Le gare concluse mantengono nome e indirizzo già salvati nel Match.
    // Le prenotazioni non ancora giocate vengono liberate perché il campo non esiste più.
    const released = await tx.match.updateMany({
      where: {
        leagueId,
        venueKey: id,
        homeGoals: null,
        awayGoals: null,
      },
      data: {
        date: null,
        slotEnd: null,
        venueKey: null,
        venueName: null,
        venueAddress: null,
        bookedByUserId: null,
        bookedAt: null,
      },
    });

    await tx.field.delete({ where: { id } });
    return released.count;
  });

  return NextResponse.json({ ok: true, releasedBookings: result });
}
