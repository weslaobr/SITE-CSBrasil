import NextAuth from "next-auth";
import SteamProvider from "next-auth-steam";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import { NextRequest } from "next/server";

export function getAuthOptions(req?: NextRequest): NextAuthOptions {
    const adapter = PrismaAdapter(prisma) as any;

    if (adapter.linkAccount) {
        const originalLinkAccount = adapter.linkAccount;
        adapter.linkAccount = async (account: any) => {
            if ('steamId' in account) {
                delete account.steamId;
            }
            return originalLinkAccount(account);
        };
    }

    return {
        adapter: adapter,
        providers: [
            {
                ...(() => {
                    const url = req ? new URL(req.url) : null;
                    const protocol = (url?.protocol === 'http:' && !url.hostname.includes('localhost')) ? 'https:' : (url?.protocol || 'https:');
                    const origin = url ? `${protocol}//${url.host}` : process.env.NEXTAUTH_URL;
                    
                    return SteamProvider(req!, {
                        clientSecret: process.env.STEAM_API_KEY!,
                        callbackUrl: `${process.env.NEXTAUTH_URL || origin}/api/auth/callback/steam`,
                        profile(profile: any) {
                            return {
                                id: profile.steamid,
                                name: profile.personaname,
                                email: `${profile.steamid}@steam.local`,
                                image: profile.avatarfull,
                                steamId: profile.steamid,
                            }
                        }
                    } as any);
                })(),
                allowDangerousEmailAccountLinking: true,
            },
        ],
        callbacks: {
            async session({ session, user }) {
                if (session.user) {
                    (session.user as any).id = user.id;
                    (session.user as any).steamId = (user as any).steamId;
                }
                return session;
            },
            async signIn({ user, account, profile }) {
                if (account?.provider === "steam") {
                    // Garante que o steamId do perfil da Steam seja salvo no model User
                    (user as any).steamId = account.providerAccountId;
                }
                return true;
            },
        },
        secret: process.env.NEXTAUTH_SECRET,
        debug: process.env.NODE_ENV === 'development' || true, // Ativado temporariamente para debug em prod
        pages: {
            signIn: '/auth/signin',
            error: '/auth/error', // Se você tiver uma página de erro
        }
    };
}
