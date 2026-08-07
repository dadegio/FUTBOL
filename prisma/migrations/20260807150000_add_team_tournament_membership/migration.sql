-- A team with stored data can be removed from the active tournament without
-- deleting its profile, roster, accounts or historical records.
ALTER TABLE "Team"
ADD COLUMN "activeInLeague" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Team_leagueId_activeInLeague_idx"
ON "Team"("leagueId", "activeInLeague");
