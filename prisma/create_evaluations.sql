-- CreateTable
CREATE TABLE "EvaluationList" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerEvaluation" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "evaluatedPlayerName" TEXT NOT NULL,
    "evaluatedSteamId" TEXT,
    "aimScore" DOUBLE PRECISION NOT NULL,
    "utilityScore" DOUBLE PRECISION NOT NULL,
    "positioningScore" DOUBLE PRECISION NOT NULL,
    "duelScore" DOUBLE PRECISION NOT NULL,
    "clutchScore" DOUBLE PRECISION NOT NULL,
    "decisionScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEvaluation_listId_evaluatedPlayerName_key" ON "PlayerEvaluation"("listId", "evaluatedPlayerName");

-- AddForeignKey
ALTER TABLE "EvaluationList" ADD CONSTRAINT "EvaluationList_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEvaluation" ADD CONSTRAINT "PlayerEvaluation_listId_fkey" FOREIGN KEY ("listId") REFERENCES "EvaluationList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
