import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { rateLimit } from "@/modules/core/security/rate-limit";
import { validateUploadFile } from "@/modules/core/security/upload-validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: "Devi effettuare il login" },
        { status: 401 }
      );
    }

    const limited = rateLimit({
      key: `upload:image:${session.userId}`,
      limit: 80,
      windowMs: 60 * 60 * 1000,
      message: "Troppi upload. Riprova tra qualche minuto.",
    });
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nessun file" },
        { status: 400 }
      );
    }

    const validation = validateUploadFile(file, {
      allowImages: true,
      allowVideos: false,
      imageLimitBytes: 5 * 1024 * 1024,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const fileName = `${Date.now()}-${randomUUID()}-${validation.safeBaseName}.${validation.extension}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${fileName}`, file, {
        access: "public",
      });

      return NextResponse.json({ url: blob.url });
    }

    const bytes = await file.arrayBuffer();
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (err) {
    console.error("Errore upload:", err);

    return NextResponse.json(
      { error: "Errore upload" },
      { status: 500 }
    );
  }
}
