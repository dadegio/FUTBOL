const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export type UploadKind = "image" | "video";

export type UploadValidationOptions = {
  allowImages?: boolean;
  allowVideos?: boolean;
  imageLimitBytes?: number;
  videoLimitBytes?: number;
};

export type UploadValidationSuccess = {
  ok: true;
  kind: UploadKind;
  extension: string;
  safeBaseName: string;
};

export type UploadValidationFailure = {
  ok: false;
  status: 400 | 413;
  error: string;
};

export type UploadValidationResult = UploadValidationSuccess | UploadValidationFailure;

function fileBaseName(name: string) {
  const fallback = "upload";
  const lastSegment = name.split(/[\\/]/).pop() || fallback;
  const withoutExtension = lastSegment.replace(/\.[^.]+$/, "");
  const safe = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return safe || fallback;
}

export function validateUploadFile(
  file: File,
  options: UploadValidationOptions
): UploadValidationResult {
  if (file.size <= 0) {
    return { ok: false, status: 400, error: "Il file è vuoto" };
  }

  const imageExt = IMAGE_EXTENSIONS[file.type];
  const videoExt = VIDEO_EXTENSIONS[file.type];
  const kind: UploadKind | null = imageExt ? "image" : videoExt ? "video" : null;

  if (!kind) {
    return {
      ok: false,
      status: 400,
      error: options.allowVideos ? "Sono ammessi solo JPG, PNG, WebP, HEIC, GIF, MP4, WebM o MOV" : "Sono ammessi solo JPG, PNG, WebP, HEIC o GIF",
    };
  }

  if (kind === "image" && options.allowImages === false) {
    return { ok: false, status: 400, error: "Sono ammessi solo video" };
  }

  if (kind === "video" && options.allowVideos !== true) {
    return { ok: false, status: 400, error: "Sono ammesse solo immagini" };
  }

  const limit = kind === "video" ? options.videoLimitBytes : options.imageLimitBytes;
  if (typeof limit === "number" && file.size > limit) {
    const mb = Math.floor(limit / 1024 / 1024);
    return {
      ok: false,
      status: 413,
      error: kind === "video" ? `Il video deve essere massimo ${mb} MB` : `La foto deve essere massimo ${mb} MB`,
    };
  }

  return {
    ok: true,
    kind,
    extension: kind === "video" ? videoExt : imageExt,
    safeBaseName: fileBaseName(file.name),
  };
}
