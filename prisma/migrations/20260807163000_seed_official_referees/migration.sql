-- Make the three official referees available in every existing tournament.
INSERT INTO "Referee" (
    "id",
    "leagueId",
    "name",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    'ref_' || substr(md5("League"."id" || ':' || officials."name"), 1, 24),
    "League"."id",
    officials."name",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "League"
CROSS JOIN (
    VALUES
        ('Sebastiano Marcato'),
        ('Yuri Caridi'),
        ('Mohamed El Orche')
) AS officials("name")
ON CONFLICT ("leagueId", "name")
DO UPDATE SET "active" = true;
