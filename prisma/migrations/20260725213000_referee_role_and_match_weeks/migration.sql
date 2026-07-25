-- Dedicated referee accounts and match-week-scoped field booking.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REFEREE';

CREATE TABLE "Referee" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "refereeId" TEXT;
ALTER TABLE "Match" ADD COLUMN "slotWeekStart" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN "refereeId" TEXT;

-- Preserve every referee name already assigned by the previous patch.
INSERT INTO "Referee" ("id", "leagueId", "name", "active", "createdAt", "updatedAt")
SELECT
    'ref_' || substr(md5(names."leagueId" || ':' || names."name"), 1, 24),
    names."leagueId",
    names."name",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "leagueId", trim("refereeName") AS "name"
    FROM "Match"
    WHERE trim("refereeName") <> ''
) AS names
ON CONFLICT DO NOTHING;

-- Every league always has the known initial referee available.
INSERT INTO "Referee" ("id", "leagueId", "name", "active", "createdAt", "updatedAt")
SELECT
    'ref_' || substr(md5("League"."id" || ':Sebastiano Marcato'), 1, 24),
    "League"."id",
    'Sebastiano Marcato',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "League"
ON CONFLICT DO NOTHING;

UPDATE "Match"
SET "refereeId" = "Referee"."id"
FROM "Referee"
WHERE
    "Referee"."leagueId" = "Match"."leagueId"
    AND "Referee"."name" = trim("Match"."refereeName");

-- Existing scheduled matches inherit the Rome-local Monday of their date.
UPDATE "Match"
SET "slotWeekStart" =
    (
        date_trunc(
            'week',
            ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Rome'
        )
        AT TIME ZONE 'Europe/Rome'
    )
    AT TIME ZONE 'UTC'
WHERE "date" IS NOT NULL;

ALTER TABLE "Match" DROP COLUMN "assistantReferee1Name";
ALTER TABLE "Match" DROP COLUMN "assistantReferee2Name";
ALTER TABLE "Match" DROP COLUMN "refereeName";

CREATE UNIQUE INDEX "Referee_leagueId_name_key" ON "Referee"("leagueId", "name");
CREATE INDEX "Referee_leagueId_active_idx" ON "Referee"("leagueId", "active");
CREATE UNIQUE INDEX "User_refereeId_key" ON "User"("refereeId");
CREATE INDEX "Match_leagueId_slotWeekStart_idx" ON "Match"("leagueId", "slotWeekStart");
CREATE INDEX "Match_refereeId_idx" ON "Match"("refereeId");

ALTER TABLE "Referee"
ADD CONSTRAINT "Referee_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_refereeId_fkey"
FOREIGN KEY ("refereeId") REFERENCES "Referee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Match"
ADD CONSTRAINT "Match_refereeId_fkey"
FOREIGN KEY ("refereeId") REFERENCES "Referee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
