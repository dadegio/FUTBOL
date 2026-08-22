ALTER TABLE "Team"
ADD COLUMN "colorHex" TEXT;

CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "slotKeys" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Field_leagueId_name_key" ON "Field"("leagueId", "name");
CREATE INDEX "Field_leagueId_active_idx" ON "Field"("leagueId", "active");

ALTER TABLE "Field"
ADD CONSTRAINT "Field_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mantiene disponibili i campi che prima erano scritti nel codice.
-- Da questa migrazione in poi, nuovi campi e modifiche vengono gestiti dall'app.
INSERT INTO "Field" ("id", "leagueId", "name", "address", "slotKeys", "active", "createdAt", "updatedAt")
SELECT
    'fld_' || substr(md5("League"."id" || ':' || venues."name"), 1, 24),
    "League"."id",
    venues."name",
    venues."address",
    venues."slotKeys",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "League"
CROSS JOIN (
    VALUES
        ('Campo Anastasio Germonio', 'Via Anastasio Germonio 6', '["tue-21","wed-20","wed-21"]'::jsonb),
        ('Campo Sant''Ignazio', 'Sant''Ignazio', '["wed-20","wed-21"]'::jsonb),
        ('Circolo della Stampa', 'Circolo della Stampa', '["wed-21","thu-21"]'::jsonb)
) AS venues("name", "address", "slotKeys")
ON CONFLICT ("leagueId", "name") DO NOTHING;
