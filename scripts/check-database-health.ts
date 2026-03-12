import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- Verificando estado do Banco de Dados ---');

    try {
        const users = await prisma.user.findMany({
            include: {
                accounts: true
            }
        });

        console.log(`Total de usuários: ${users.length}`);

        users.forEach(user => {
            console.log(`\nUsuário: ${user.name} (${user.email})`);
            console.log(`- ID: ${user.id}`);
            console.log(`- SteamId no Model User: ${user.steamId || 'Nenhum'}`);
            console.log(`- Contas vinculadas: ${user.accounts.length}`);
            user.accounts.forEach(acc => {
                console.log(`  * Provedor: ${acc.provider}, ID do Provedor: ${acc.providerAccountId}`);
            });

            // Verificar inconsistência
            if (user.accounts.length === 0 && user.email?.includes('@steam.local')) {
                console.warn(`[AVISO] Usuário órfão detectado! Tem email de steam mas nenhuma conta vinculada.`);
            }
        });

    } catch (error: any) {
        console.error('Erro ao acessar banco:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
