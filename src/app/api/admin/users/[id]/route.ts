import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(getAuthOptions());
        const { id } = params;
        
        if (!(session?.user as any)?.isAdmin) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { isAdmin } = await req.json();

        // Evita que o admin se remova (opcional, mas seguro)
        if ((session.user as any).id === id && !isAdmin) {
            return new NextResponse("Não é possível remover suas próprias permissões de admin", { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { isAdmin }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("[USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
