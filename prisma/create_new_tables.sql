SET search_path TO public;

-- Create RatingSnapshot table for tracking SR history
CREATE TABLE IF NOT EXISTS "RatingSnapshot" (
  "id" SERIAL PRIMARY KEY,
  "steamId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'premier',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RatingSnapshot_steamId_createdAt_idx" ON "RatingSnapshot"("steamId", "createdAt");

-- Create Tournament tables
CREATE TABLE IF NOT EXISTS "Tournament" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "format" TEXT NOT NULL DEFAULT 'BO1',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TournamentTeam" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playerIds" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TournamentMatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "teamAId" TEXT NOT NULL,
  "teamBId" TEXT NOT NULL,
  "winnerId" TEXT,
  "scoreA" INTEGER,
  "scoreB" INTEGER,
  "round" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "mapName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE,
  CONSTRAINT "TournamentMatch_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "TournamentTeam"("id"),
  CONSTRAINT "TournamentMatch_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "TournamentTeam"("id"),
  CONSTRAINT "TournamentMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "TournamentTeam"("id")
);
