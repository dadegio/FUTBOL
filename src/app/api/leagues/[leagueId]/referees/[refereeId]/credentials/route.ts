import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLeagueAdmin } from "@/lib/server-auth";
import { hashPassword } from "@/lib/session";
import {
  generateTemporaryPassword,
  slugifyUsername,
} from "@/lib/credentials";

type Ctx = {
  params: Promise<{ leagueId: string; refereeId: string }>;
};

export async function POST(_: Request, ctx: Ctx) {
  const { leagueId, refereeId } = await ctx.params;
  const denied = await requireLeagueAdmin(leagueId);
  if (denied) return denied;
  const referee = await prisma.referee.findFirst({
    where: {
      id: refereeId,
      leagueId,
    },
    select: {
      id: true,
      name: true,
      account: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!referee) {
    return NextResponse.json(
      { error: "Arbitro non trovato" },
      { status: 404 }
    );
  }

  if (referee.account) {
    return NextResponse.json(
      {
        error: `L'arbitro ha già l'account ${referee.account.username}`,
      },
      { status: 409 }
    );
  }

  const base = `arbitro.${
    slugifyUsername(referee.name) || referee.id.slice(0, 8)
  }`;
  let username = base;
  let suffix = 2;

  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}.${suffix++}`;
  }

  const password = generateTemporaryPassword();
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      role: "REFEREE",
      refereeId: referee.id,
    },
    select: {
      id: true,
      username: true,
    },
  });

  return NextResponse.json(
    {
      account: user,
      password,
      passwordShownOnce: true,
    },
    { status: 201 }
  );
}
