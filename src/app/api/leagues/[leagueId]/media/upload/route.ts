import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession, isLeagueAdminSession, isCreatorSession } from "@/lib/server-auth";
import { rateLimit } from "@/modules/core/security/rate-limit";
import { validateUploadFile } from "@/modules/core/security/upload-validation";

export const runtime = "nodejs";

const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 75 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  try {
    const { leagueId } = await ctx.params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Devi effettuare il login" }, { status: 401 });
    }
    if (!isLeagueAdminSession(session, leagueId) && !isCreatorSession(session, leagueId)) {
      return NextResponse.json({ error: "Accesso riservato ai creator del torneo" }, { status: 403 });
    }

    const limited = rateLimit({
      key: `upload:media:${leagueId}:${session.userId}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
      message: "Troppi upload media. Riprova tra qualche minuto.",
    });
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nessun file" }, { status: 400 });
    }

    const validation = validateUploadFile(file, {
      allowImages: true,
      allowVideos: true,
      imageLimitBytes: IMAGE_LIMIT,
      videoLimitBytes: VIDEO_LIMIT,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const fileName = `${Date.now()}-${randomUUID()}-${validation.safeBaseName}.${validation.extension}`;
    const folder = validation.kind === "video" ? "videos" : "photos";

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`media/${leagueId}/${folder}/${fileName}`, file, { access: "public" });
      return NextResponse.json({ url: blob.url, mediaKind: validation.kind });
    }

    const bytes = await file.arrayBuffer();
    const uploadDir = path.join(process.cwd(), "public", "media", leagueId, folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

    return NextResponse.json({ url: `/media/${leagueId}/${folder}/${fileName}`, mediaKind: validation.kind });
  } catch (err) {
    console.error("Errore upload media:", err);
    return NextResponse.json({ error: "Errore upload media" }, { status: 500 });
  }
}
