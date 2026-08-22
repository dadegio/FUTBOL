-- Repair migration for schema changes introduced before dedicated SQL migrations existed.
-- Safe to run when some of these objects already exist.

ALTER TABLE "Team"
ADD COLUMN IF NOT EXISTS "colorHex" TEXT;

ALTER TABLE "Referee"
ADD COLUMN IF NOT EXISTS "teamId" TEXT;

CREATE TABLE IF NOT EXISTS "Field" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FieldSlot" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    CONSTRAINT "FieldSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Field_leagueId_name_key"
ON "Field"("leagueId", "name");

CREATE INDEX IF NOT EXISTS "Field_leagueId_active_idx"
ON "Field"("leagueId", "active");

CREATE UNIQUE INDEX IF NOT EXISTS "FieldSlot_fieldId_weekday_hour_minute_key"
ON "FieldSlot"("fieldId", "weekday", "hour", "minute");

CREATE INDEX IF NOT EXISTS "FieldSlot_fieldId_weekday_idx"
ON "FieldSlot"("fieldId", "weekday");

CREATE INDEX IF NOT EXISTS "Referee_teamId_idx"
ON "Referee"("teamId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Field_leagueId_fkey'
    ) THEN
        ALTER TABLE "Field"
        ADD CONSTRAINT "Field_leagueId_fkey"
        FOREIGN KEY ("leagueId") REFERENCES "League"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FieldSlot_fieldId_fkey'
    ) THEN
        ALTER TABLE "FieldSlot"
        ADD CONSTRAINT "FieldSlot_fieldId_fkey"
        FOREIGN KEY ("fieldId") REFERENCES "Field"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Referee_teamId_fkey'
    ) THEN
        ALTER TABLE "Referee"
        ADD CONSTRAINT "Referee_teamId_fkey"
        FOREIGN KEY ("teamId") REFERENCES "Team"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
