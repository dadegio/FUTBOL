ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LEAGUE_ADMIN';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

CREATE INDEX IF NOT EXISTS "User_leagueId_idx" ON "User"("leagueId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_leagueId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
