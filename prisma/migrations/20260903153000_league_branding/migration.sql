ALTER TABLE "League"
  ADD COLUMN "themeMode" TEXT NOT NULL DEFAULT 'GENERIC',
  ADD COLUMN "brandLogoUrl" TEXT,
  ADD COLUMN "brandCoverUrl" TEXT,
  ADD COLUMN "brandPrimaryColor" TEXT,
  ADD COLUMN "brandSecondaryColor" TEXT,
  ADD COLUMN "brandBackgroundColor" TEXT;

-- Tutti i tornei già presenti mantengono esattamente l'identità grafica attuale.
UPDATE "League"
SET "themeMode" = 'IMPERIAL';
