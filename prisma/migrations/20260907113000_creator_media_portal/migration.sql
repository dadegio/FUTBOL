-- Creator Portal: profili creator, media center e upload contenuti.
-- Idempotente per applicarsi con sicurezza su database già aggiornati.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CREATOR';

DO $$ BEGIN
  CREATE TYPE "MediaItemType" AS ENUM ('PHOTO', 'VIDEO', 'REEL', 'HIGHLIGHT', 'INTERVIEW', 'BACKSTAGE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaItemStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'HIDDEN', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CreatorProfile" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "roleLabel" TEXT,
  "avatarUrl" TEXT,
  "bio" TEXT,
  "instagramUrl" TEXT,
  "tiktokUrl" TEXT,
  "youtubeUrl" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "websiteUrl" TEXT,
  "primaryColor" TEXT,
  "showEmail" BOOLEAN NOT NULL DEFAULT false,
  "showInstagram" BOOLEAN NOT NULL DEFAULT true,
  "showTikTok" BOOLEAN NOT NULL DEFAULT true,
  "showYoutube" BOOLEAN NOT NULL DEFAULT true,
  "showPhone" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MediaItem" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "creatorId" TEXT,
  "uploadedByUserId" TEXT,
  "type" "MediaItemType" NOT NULL DEFAULT 'PHOTO',
  "status" "MediaItemStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT,
  "caption" TEXT,
  "fileUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "socialUrl" TEXT,
  "matchId" TEXT,
  "teamId" TEXT,
  "playerId" TEXT,
  "round" INTEGER,
  "creditName" TEXT,
  "creditInstagram" TEXT,
  "creditEmail" TEXT,
  "showCreditEmail" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_userId_key" ON "CreatorProfile"("userId");
CREATE INDEX IF NOT EXISTS "CreatorProfile_leagueId_active_idx" ON "CreatorProfile"("leagueId", "active");
CREATE INDEX IF NOT EXISTS "CreatorProfile_displayName_idx" ON "CreatorProfile"("displayName");

CREATE INDEX IF NOT EXISTS "MediaItem_leagueId_status_idx" ON "MediaItem"("leagueId", "status");
CREATE INDEX IF NOT EXISTS "MediaItem_leagueId_featured_idx" ON "MediaItem"("leagueId", "featured");
CREATE INDEX IF NOT EXISTS "MediaItem_creatorId_idx" ON "MediaItem"("creatorId");
CREATE INDEX IF NOT EXISTS "MediaItem_matchId_idx" ON "MediaItem"("matchId");
CREATE INDEX IF NOT EXISTS "MediaItem_teamId_idx" ON "MediaItem"("teamId");
CREATE INDEX IF NOT EXISTS "MediaItem_playerId_idx" ON "MediaItem"("playerId");
CREATE INDEX IF NOT EXISTS "MediaItem_round_idx" ON "MediaItem"("round");

DO $$ BEGIN
  ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
