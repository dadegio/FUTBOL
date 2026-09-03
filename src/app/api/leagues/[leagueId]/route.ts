import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireLeagueAdmin } from "@/lib/server-auth";
import { isHexColor } from "@/lib/league-branding";

const PLAYOFF_FORMATS = new Set(["SINGLE_ELIM", "TWO_LEG"]);
const PLAYOFF_COUNTS = new Set([2, 4, 8, 16]);
const THEME_MODES = new Set(["IMPERIAL", "GENERIC", "CUSTOM"]);

function normalizeOptionalUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.startsWith("/") || /^https?:\/\//i.test(text)) return text;
  return undefined;
}

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      themeMode: true,
      brandLogoUrl: true,
      brandCoverUrl: true,
      brandPrimaryColor: true,
      brandSecondaryColor: true,
      brandBackgroundColor: true,
      cookieBannerEnabled: true,
      privacyPolicyUrl: true,
      cookiePolicyUrl: true,
      adsEnabled: true,
      adProvider: true,
      adClientId: true,
      adHomeSlot: true,
      adLeagueSlot: true,
      playoffFormat: true,
      playoffTeamCount: true,
      playoffSeeded: true,
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Campionato non trovato" }, { status: 404 });
  }

  return NextResponse.json(league);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const authErr = await requireLeagueAdmin(leagueId);
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, playoffFormat: true, themeMode: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Campionato non trovato" }, { status: 404 });
  }

  const data: {
    name?: string;
    themeMode?: string;
    brandLogoUrl?: string | null;
    brandCoverUrl?: string | null;
    brandPrimaryColor?: string | null;
    brandSecondaryColor?: string | null;
    brandBackgroundColor?: string | null;
    cookieBannerEnabled?: boolean;
    privacyPolicyUrl?: string | null;
    cookiePolicyUrl?: string | null;
    adsEnabled?: boolean;
    adProvider?: string | null;
    adClientId?: string | null;
    adHomeSlot?: string | null;
    adLeagueSlot?: string | null;
    playoffFormat?: "SINGLE_ELIM" | "TWO_LEG" | null;
    playoffTeamCount?: number | null;
    playoffSeeded?: boolean;
  } = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Nome torneo non valido" }, { status: 400 });
    }
    data.name = name;
  }

  if (body?.themeMode !== undefined) {
    const themeMode = String(body.themeMode).trim();
    if (!THEME_MODES.has(themeMode)) {
      return NextResponse.json({ error: "Tema torneo non valido" }, { status: 400 });
    }
    data.themeMode = themeMode;
  }

  for (const key of ["brandLogoUrl", "brandCoverUrl"] as const) {
    if (body?.[key] === undefined) continue;
    const value = normalizeOptionalUrl(body[key]);
    if (value === undefined) {
      return NextResponse.json({ error: "URL grafica non valido" }, { status: 400 });
    }
    data[key] = value;
  }

  for (const key of ["brandPrimaryColor", "brandSecondaryColor", "brandBackgroundColor"] as const) {
    if (body?.[key] === undefined) continue;
    const value = String(body[key] ?? "").trim();
    if (value && !isHexColor(value)) {
      return NextResponse.json({ error: "Colore non valido: usa il formato #RRGGBB" }, { status: 400 });
    }
    data[key] = value || null;
  }

  for (const key of ["privacyPolicyUrl", "cookiePolicyUrl"] as const) {
    if (body?.[key] === undefined) continue;
    const value = normalizeOptionalUrl(body[key]);
    if (value === undefined) {
      return NextResponse.json({ error: "URL policy non valido" }, { status: 400 });
    }
    data[key] = value;
  }

  if (body?.cookieBannerEnabled !== undefined) {
    data.cookieBannerEnabled = body.cookieBannerEnabled !== false;
  }

  if (body?.adsEnabled !== undefined) {
    data.adsEnabled = body.adsEnabled === true;
  }

  if (body?.adProvider !== undefined) {
    const provider = String(body.adProvider ?? "").trim().toUpperCase();
    data.adProvider = provider || null;
  }

  for (const key of ["adClientId", "adHomeSlot", "adLeagueSlot"] as const) {
    if (body?.[key] === undefined) continue;
    const value = String(body[key] ?? "").trim();
    data[key] = value || null;
  }

  if (body?.playoffEnabled !== undefined) {
    const enabled = body.playoffEnabled === true;

    if (!enabled) {
      const seriesCount = await prisma.playoffSeries.count({ where: { leagueId } });
      if (seriesCount > 0) {
        return NextResponse.json(
          { error: "I playoff sono già stati creati. Eliminali dalla sezione Playoff prima di disattivarli." },
          { status: 400 }
        );
      }

      data.playoffFormat = null;
      data.playoffTeamCount = null;
      data.playoffSeeded = true;
    } else {
      const format = String(body?.playoffFormat ?? "SINGLE_ELIM").trim();
      const teamCount = Number(body?.playoffTeamCount ?? 8);
      const playoffSeeded = body?.playoffSeeded !== false;

      if (!PLAYOFF_FORMATS.has(format)) {
        return NextResponse.json({ error: "Formato playoff non valido" }, { status: 400 });
      }

      if (!PLAYOFF_COUNTS.has(teamCount)) {
        return NextResponse.json({ error: "Numero squadre playoff non valido" }, { status: 400 });
      }

      const teamsInLeague = await prisma.team.count({
        where: { leagueId, activeInLeague: true },
      });
      if (teamsInLeague < teamCount) {
        return NextResponse.json(
          { error: `Servono almeno ${teamCount} squadre per questo playoff, ora ce ne sono ${teamsInLeague}.` },
          { status: 400 }
        );
      }

      data.playoffFormat = format as "SINGLE_ELIM" | "TWO_LEG";
      data.playoffTeamCount = teamCount;
      data.playoffSeeded = playoffSeeded;
    }
  }

  const updated = await prisma.league.update({
    where: { id: leagueId },
    data,
    select: {
      id: true,
      name: true,
      themeMode: true,
      brandLogoUrl: true,
      brandCoverUrl: true,
      brandPrimaryColor: true,
      brandSecondaryColor: true,
      brandBackgroundColor: true,
      cookieBannerEnabled: true,
      privacyPolicyUrl: true,
      cookiePolicyUrl: true,
      adsEnabled: true,
      adProvider: true,
      adClientId: true,
      adHomeSlot: true,
      adLeagueSlot: true,
      playoffFormat: true,
      playoffTeamCount: true,
      playoffSeeded: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const authErr = await requireAdmin();
  if (authErr) return authErr;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Campionato non trovato" }, { status: 404 });
  }

  await prisma.league.delete({ where: { id: leagueId } });
  return NextResponse.json({ ok: true });
}
