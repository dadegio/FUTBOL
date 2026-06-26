-- FUTPOLI admin/rules alignment
CREATE TYPE "PlayerStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'AUTHORIZED', 'BLOCKED', 'SUSPENDED', 'RETIRED');

ALTER TABLE "Player"
  ADD COLUMN "fiscalCode" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "documentSigned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "privacyConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "internalPhotoConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publicPhotoConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mediaConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "healthDeclaration" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wildcardUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "PlayerStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "statusNote" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Match"
  ADD COLUMN "refereeCostCents" INTEGER NOT NULL DEFAULT 2000;

CREATE TABLE "MatchSheetPlayer" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchSheetPlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchSheetPlayer_matchId_playerId_key" ON "MatchSheetPlayer"("matchId", "playerId");
CREATE INDEX "MatchSheetPlayer_playerId_idx" ON "MatchSheetPlayer"("playerId");
CREATE INDEX "MatchSheetPlayer_teamId_idx" ON "MatchSheetPlayer"("teamId");

ALTER TABLE "MatchSheetPlayer" ADD CONSTRAINT "MatchSheetPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchSheetPlayer" ADD CONSTRAINT "MatchSheetPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchSheetPlayer" ADD CONSTRAINT "MatchSheetPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
