import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, isLeagueAdminSession } from "@/lib/server-auth";

export async function GET(_: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params;
  const session = await getServerSession();
  const canAdmin = isLeagueAdminSession(session, leagueId);

  const creators = await prisma.creatorProfile.findMany({
    where: { leagueId, ...(canAdmin ? {} : { active: true }) },
    orderBy: [{ displayName: "asc" }],
    select: {
      id: true,
      displayName: true,
      roleLabel: true,
      avatarUrl: true,
      bio: true,
      instagramUrl: true,
      tiktokUrl: true,
      youtubeUrl: true,
      email: true,
      phone: true,
      websiteUrl: true,
      primaryColor: true,
      showEmail: true,
      showInstagram: true,
      showTikTok: true,
      showYoutube: true,
      showPhone: true,
      active: true,
      _count: { select: { mediaItems: true } },
    },
  });

  if (canAdmin) return NextResponse.json(creators);

  return NextResponse.json(
    creators.map((creator) => ({
      ...creator,
      email: creator.showEmail ? creator.email : null,
      phone: creator.showPhone ? creator.phone : null,
      instagramUrl: creator.showInstagram ? creator.instagramUrl : null,
      tiktokUrl: creator.showTikTok ? creator.tiktokUrl : null,
      youtubeUrl: creator.showYoutube ? creator.youtubeUrl : null,
    }))
  );
}
