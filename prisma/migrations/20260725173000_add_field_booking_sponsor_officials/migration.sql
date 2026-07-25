-- Campi prenotabili, slot partita e terna arbitrale
ALTER TABLE "Match"
  ADD COLUMN "slotEnd" TIMESTAMP(3),
  ADD COLUMN "venueKey" TEXT,
  ADD COLUMN "venueName" TEXT,
  ADD COLUMN "venueAddress" TEXT,
  ADD COLUMN "bookedByUserId" TEXT,
  ADD COLUMN "bookedAt" TIMESTAMP(3),
  ADD COLUMN "refereeName" TEXT NOT NULL DEFAULT 'Sebastiano Marcato',
  ADD COLUMN "assistantReferee1Name" TEXT,
  ADD COLUMN "assistantReferee2Name" TEXT;

CREATE INDEX "Match_leagueId_date_idx" ON "Match"("leagueId", "date");
CREATE INDEX "Match_bookedByUserId_idx" ON "Match"("bookedByUserId");
CREATE UNIQUE INDEX "Match_venueKey_date_key" ON "Match"("venueKey", "date");

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_bookedByUserId_fkey"
  FOREIGN KEY ("bookedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
