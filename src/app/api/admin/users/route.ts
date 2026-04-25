import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(getAuthOptions());
        
        if (!(session?.user as any)?.isAdmin) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const users = await prisma.user.findMany({
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true,
                image: true,
                steamId: true,
                isAdmin: true,
                _count: {
                    select: {
                        matches: true,
                        lobbiesCreated: true
                    }
                }
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("[USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
