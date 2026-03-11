"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileRedirect() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.steamId) {
            router.push(`/player/${(session.user as any).steamId}`);
        } else if (status === "unauthenticated") {
            router.push("/");
        }
    }, [session, status, router]);

    return (
        <div className="p-20 text-center animate-pulse text-zinc-500 uppercase tracking-widest">
            Redirecionando para seu perfil...
        </div>
    );
}
