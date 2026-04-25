import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const allUsers = await prisma.user.findMany({
        select: { name: true, id: true }
    });

    const bots = allUsers.filter(u => u.name?.toUpperCase().startsWith('BOT_'));

    console.log(`Found ${bots.length} users starting with BOT_ (case insensitive):`);
    bots.forEach(bot => {
        console.log(`- ${bot.name} (ID: ${bot.id})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
