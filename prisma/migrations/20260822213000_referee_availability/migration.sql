CREATE TABLE "RefereeAvailability" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    CONSTRAINT "RefereeAvailability_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefereeAvailability_refereeId_weekday_hour_minute_key" ON "RefereeAvailability"("refereeId", "weekday", "hour", "minute");
CREATE INDEX "RefereeAvailability_refereeId_weekday_idx" ON "RefereeAvailability"("refereeId", "weekday");
ALTER TABLE "RefereeAvailability" ADD CONSTRAINT "RefereeAvailability_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
