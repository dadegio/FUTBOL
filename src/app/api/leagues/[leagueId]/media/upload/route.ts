import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession, isLeagueAdminSession, isCreatorSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 75 * 1024 * 1024;

function extensionFor(type: string, fallback: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  if (type === "video/quicktime") return "mov";
  return fallback.replace(/^\./, "") || "bin";
}

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

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nessun file" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Sono ammessi solo foto o video" }, { status: 400 });
    }

    const limit = isVideo ? VIDEO_LIMIT : IMAGE_LIMIT;
    if (file.size > limit) {
      return NextResponse.json(
        { error: isVideo ? "Il video deve essere massimo 75 MB" : "La foto deve essere massimo 10 MB" },
        { status: 400 }
      );
    }

    const originalName = file.name || `media.${isVideo ? "mp4" : "jpg"}`;
    const cleanBase = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = extensionFor(file.type, path.extname(cleanBase));
    const fileName = `${Date.now()}-${randomUUID()}-${cleanBase.replace(/\.[^.]+$/, "")}.${ext}`;
    const folder = isVideo ? "videos" : "photos";

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`media/${leagueId}/${folder}/${fileName}`, file, { access: "public" });
      return NextResponse.json({ url: blob.url, mediaKind: isVideo ? "video" : "image" });
    }

    const bytes = await file.arrayBuffer();
    const uploadDir = path.join(process.cwd(), "public", "media", leagueId, folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

    return NextResponse.json({ url: `/media/${leagueId}/${folder}/${fileName}`, mediaKind: isVideo ? "video" : "image" });
  } catch (err) {
    console.error("Errore upload media:", err);
    return NextResponse.json({ error: "Errore upload media" }, { status: 500 });
  }
}
