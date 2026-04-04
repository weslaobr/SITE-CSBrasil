import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log("Creating tables...");
  
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE public."EvaluationList" (
          "id" TEXT NOT NULL,
          "creatorId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "isPublic" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "EvaluationList_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("EvaluationList created.");
  } catch(e) { console.error("EvaluationList:", e); }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE public."PlayerEvaluation" (
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
    `);
    console.log("PlayerEvaluation created.");
  } catch(e) { console.error("PlayerEvaluation:", e); }

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "PlayerEvaluation_listId_evaluatedPlayerName_key" ON public."PlayerEvaluation"("listId", "evaluatedPlayerName");`);
    console.log("Index created.");
  } catch(e) { console.error("Index:", e); }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."EvaluationList" ADD CONSTRAINT "EvaluationList_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    console.log("FK 1 created.");
  } catch(e) { console.error("FK1:", e); }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."PlayerEvaluation" ADD CONSTRAINT "PlayerEvaluation_listId_fkey" FOREIGN KEY ("listId") REFERENCES public."EvaluationList"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    console.log("FK 2 created.");
  } catch(e) { console.error("FK2:", e); }

  console.log("Done.");
}
main()
