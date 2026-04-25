import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const allUsers = await prisma.user.findMany({
        select: { name: true, id: true }
    });

    const botIds = allUsers
        .filter(u => u.name?.toUpperCase().startsWith('BOT_'))
        .map(u => u.id);

    if (botIds.length === 0) {
        console.log("No bots found to delete.");
        return;
    }

    console.log(`Deleting ${botIds.length} users starting with BOT_...`);
    
    const result = await prisma.user.deleteMany({
        where: {
            id: {
                in: botIds
            }
        }
    });

    console.log(`Successfully deleted ${result.count} users.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
