CREATE TABLE IF NOT EXISTS "Sponsor" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Sponsor_leagueId_active_idx" ON "Sponsor"("leagueId", "active");
CREATE INDEX IF NOT EXISTS "Sponsor_leagueId_sortOrder_idx" ON "Sponsor"("leagueId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Sponsor_leagueId_fkey'
  ) THEN
    ALTER TABLE "Sponsor"
      ADD CONSTRAINT "Sponsor_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
