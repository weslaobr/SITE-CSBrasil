const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adicionando coluna isModerator ao banco...');
    // Tentamos adicionar sem o IF NOT EXISTS que deu erro de sintaxe
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "isModerator" BOOLEAN DEFAULT FALSE`);
    console.log('Coluna adicionada com sucesso!');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('A coluna já existe, tudo ok!');
    } else {
      console.error('Erro ao adicionar coluna:', e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
