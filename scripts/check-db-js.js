const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verificando estado do Banco de Dados ---');
    try {
        const users = await prisma.user.findMany({
            include: { accounts: true }
        });

        console.log(`Total de usuários: ${users.length}`);

        users.forEach(user => {
            console.log(`\nUsuário: ${user.name} (${user.email})`);
            console.log(`- ID: ${user.id}`);
            console.log(`- SteamId: ${user.steamId || 'Nenhum'}`);
            console.log(`- Contas: ${user.accounts.length}`);
            user.accounts.forEach(acc => {
                console.log(`  * Provider: ${acc.provider}, AccId: ${acc.providerAccountId}`);
            });
        });
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
