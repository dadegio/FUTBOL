#!/usr/bin/env bash
set -euo pipefail

PATCH_FILE="cammino-imperiale-v2-logo-upload.patch"
LOGO_SOURCE="assets/cammino-imperiale-logo.png"
LOGO_DEST="public/cammino-imperiale-logo.png"

if [ ! -f "package.json" ] || [ ! -d "src/app" ]; then
  echo "Errore: esegui questo script dalla root del progetto Next.js." >&2
  exit 1
fi

mkdir -p public public/uploads
cp "$LOGO_SOURCE" "$LOGO_DEST"

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git apply "$PATCH_FILE"
else
  patch -p1 < "$PATCH_FILE"
fi

cat <<'MSG'
Patch v2 applicata.
- Logo aggiunto in public/cammino-imperiale-logo.png
- Sidebar/Home aggiornate per usare lo stemma
- Upload immagini: usa Vercel Blob se BLOB_READ_WRITE_TOKEN esiste; in locale salva in public/uploads

Ora esegui:
  npm run build
  npm run dev
MSG
